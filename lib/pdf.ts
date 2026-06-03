import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// pdfjs (the engine inside unpdf) prints non-fatal noise through console.log
// with a "Warning: " prefix: missing font tables, missing cMapUrl, indexing
// notices, hex-string sanitisation, etc. None of it affects the extracted
// text but it clutters the dev log enough that real signals get lost.
// We temporarily filter those messages while parsing.
const PDFJS_NOISE_RE =
  /^Warning: (TT: undefined function|loadFont|getHexString|Indexing all PDF objects|Ensure that the .?cMapUrl)/i;

async function silencePdfjsNoise<T>(fn: () => Promise<T>): Promise<T> {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const filter = (orig: (...a: unknown[]) => void) =>
    (msg: unknown, ...args: unknown[]) => {
      if (typeof msg === "string" && PDFJS_NOISE_RE.test(msg)) return;
      orig(msg, ...args);
    };
  console.log = filter(originalLog) as typeof console.log;
  console.warn = filter(originalWarn) as typeof console.warn;
  try {
    return await fn();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

// ASX gates direct PDF access behind a "two-step" terms-of-use disclaimer:
//   1. GET displayAnnouncement.do?display=pdf&idsId=N → server creates a
//      JSESSIONID and returns an HTML disclaimer with a <form> POSTing to
//      announcementTerms.do (plus hidden inputs identifying the target).
//   2. POST that form (with the JSESSIONID cookie + the hidden inputs)
//      → server marks the session as "agreed" and updates cookies.
//   3. Re-GET the original URL with the same cookies → server now sees
//      the agreement and streams the actual PDF.
// Skipping step 1 (which is what we did before) means the server never
// links the agreement to a persistable session — re-GETs still return
// the disclaimer. Cache the established cookie jar at module level.
let asxCookies: string | null = null;
let asxTermsTried = false;

function extractCookies(res: Response): string[] {
  const headersAny = res.headers as Headers & { getSetCookie?: () => string[] };
  const setCookieHeaders =
    headersAny.getSetCookie?.() ??
    (res.headers.get("set-cookie")?.split(/,(?=\s*[A-Za-z0-9_-]+=)/) ?? []);
  const out: string[] = [];
  for (const sc of setCookieHeaders) {
    const cookiePart = sc.split(";")[0].trim();
    if (cookiePart) out.push(cookiePart);
  }
  return out;
}

function mergeCookies(existing: string[], next: string[]): string[] {
  const map = new Map<string, string>();
  for (const c of [...existing, ...next]) {
    const eq = c.indexOf("=");
    if (eq > 0) map.set(c.slice(0, eq), c.slice(eq + 1));
  }
  return Array.from(map.entries()).map(([k, v]) => `${k}=${v}`);
}

// 3-step ASX terms acceptance flow. `triggerUrl` is the displayAnnouncement
// URL we want a PDF from — the first GET to it returns the disclaimer page
// whose form we then submit.
async function acceptAsxTerms(triggerUrl: string): Promise<string | null> {
  if (asxCookies) return asxCookies;
  if (asxTermsTried) return null;
  asxTermsTried = true;
  try {
    // ── Step 1: GET the trigger URL to establish JSESSIONID + see the form
    const seedRes = await fetch(triggerUrl, {
      method: "GET",
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
      cache: "no-store",
      redirect: "manual",
    });
    const seedCookies = extractCookies(seedRes);
    const disclaimerHtml = await seedRes.text();
    console.log(
      `[asx-terms] seed GET: ${seedRes.status}, bodyLen=${disclaimerHtml.length}, cookies=${seedCookies.length}`,
    );

    // Parse the form action + hidden inputs + submit button
    const formMatch = disclaimerHtml.match(/<form[^>]+action="([^"]+)"[^>]*>([\s\S]*?)<\/form>/i);
    if (!formMatch) {
      console.log(`[asx-terms] no <form> in disclaimer body`);
      if (seedCookies.length > 0) {
        asxCookies = seedCookies.join("; ");
        return asxCookies;
      }
      return null;
    }
    const rawAction = formMatch[1];
    const formAction = rawAction.startsWith("http")
      ? rawAction
      : new URL(rawAction, triggerUrl).href;
    const formInner = formMatch[2];

    // Hidden inputs (any attribute order)
    const hidden: Record<string, string> = {};
    for (const tag of formInner.match(/<input[^>]+>/gi) ?? []) {
      if (!/type="hidden"/i.test(tag)) continue;
      const n = tag.match(/name="([^"]+)"/i);
      const v = tag.match(/value="([^"]*)"/i);
      if (n) hidden[n[1]] = v?.[1] ?? "";
    }
    // Submit button — when there are several (e.g. "Agree" and "Decline"),
    // prefer the one whose value looks affirmative; fall back to the first.
    let submitName = "agree";
    let submitValue = "true";
    const submitTags = formInner.match(/<(?:input|button)[^>]+type="submit"[^>]*>/gi) ?? [];
    const affirmativeRe = /value="(agree|accept|yes|i agree)/i;
    const chosen =
      submitTags.find((t) => affirmativeRe.test(t)) ?? submitTags[0];
    if (chosen) {
      const n = chosen.match(/name="([^"]+)"/i);
      const v = chosen.match(/value="([^"]*)"/i);
      if (n) submitName = n[1];
      if (v) submitValue = v[1];
    }
    const formFields = { ...hidden, [submitName]: submitValue };
    const body = Object.entries(formFields)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    console.log(
      `[asx-terms] form action=${formAction} hidden=[${Object.keys(hidden).join(",")}] submit=${submitName}=${submitValue}`,
    );

    // ── Step 2: POST the form with seed cookies
    const postRes = await fetch(formAction, {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
        Cookie: seedCookies.join("; "),
        Referer: triggerUrl,
      },
      body,
      cache: "no-store",
      redirect: "manual",
    });
    const postCookies = extractCookies(postRes);
    console.log(`[asx-terms] terms POST: ${postRes.status}, cookies=${postCookies.length}`);
    const allCookies = mergeCookies(seedCookies, postCookies);
    if (allCookies.length === 0) {
      console.log(`[asx-terms] no cookies after POST — agreement likely failed`);
      return null;
    }
    asxCookies = allCookies.join("; ");
    console.log(`[asx-terms] session established, ${allCookies.length} cookies merged`);
    return asxCookies;
  } catch (e) {
    console.log(`[asx-terms] failed: ${(e as Error).message}`);
  }
  return null;
}

// Fetch a PDF and extract its text via unpdf (pure-JS, ESM-friendly).
// Used by the discovery 2nd-pass enrichment to dig out per-share offer
// prices and aggregate deal values that aren't in the headline. Caps the
// returned text at maxChars so we don't blow up the Claude prompt with
// a 1 MB filing — 60k chars is ~15-20k tokens, plenty of headroom.
//
// Some endpoints (notably ASX's displayAnnouncement.do?display=pdf) return
// an HTML interstitial. For ASX URLs we accept terms first (sets cookie),
// for other hosts we fall back to chasing embedded URLs in the HTML.
export async function fetchPdfText(url: string, maxChars = 60000, depth = 0): Promise<string> {
  try {
    const origin = (() => {
      try { return new URL(url).origin; } catch { return ""; }
    })();
    const isAsx = /asx\.com\.au/i.test(url);
    if (isAsx) await acceptAsxTerms(url);
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/pdf,*/*",
        ...(origin ? { Referer: origin } : {}),
        ...(isAsx && asxCookies ? { Cookie: asxCookies } : {}),
      },
      cache: "no-store",
      redirect: "follow",
    });
    if (!res.ok) {
      console.log(`[pdf] ${res.status} ${url}`);
      return "";
    }
    const contentType = res.headers.get("content-type") ?? "";
    const finalUrl = res.url;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 100) {
      console.log(`[pdf] suspiciously small (${buf.byteLength} bytes) ${url}`);
      return "";
    }

    // PDF files always start with "%PDF-" — anything else is HTML / JSON /
    // an error page that the unpdf parser would choke on.
    const firstBytes = String.fromCharCode(...buf.slice(0, 8));
    const looksLikePdf = firstBytes.startsWith("%PDF-");

    if (!looksLikePdf) {
      console.log(
        `[pdf] non-pdf response: ct=${contentType} firstBytes=${JSON.stringify(firstBytes)} ` +
          `bytes=${buf.byteLength} finalUrl=${finalUrl}`,
      );
      if (depth >= 1) return "";
      // Try to surface an embedded PDF link from the HTML wrapper.
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const embedMatch =
        html.match(/<(?:embed|iframe|object)[^>]+(?:src|data)="([^"]+)"/i) ??
        html.match(/<meta\s+http-equiv=["']refresh["'][^>]*content=["']\d+\s*;\s*url=([^"']+)["']/i) ??
        html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i) ??
        html.match(/href="([^"]+\.pdf[^"]*)"/i);
      if (embedMatch && embedMatch[1]) {
        // Don't follow the ASX terms form action — that's a POST endpoint
        // (already handled by acceptAsxTerms above); a GET on it just
        // bounces to the homepage. Landing here means the cookie didn't
        // stick — give up cleanly.
        if (/announcementTerms\.do/i.test(embedMatch[1])) {
          console.log(`[pdf] ASX terms form detected — cookies likely didn't stick, giving up`);
          return "";
        }
        const inner = embedMatch[1].startsWith("http")
          ? embedMatch[1]
          : new URL(embedMatch[1], finalUrl).href;
        console.log(`[pdf] following embedded url: ${inner}`);
        return fetchPdfText(inner, maxChars, depth + 1);
      }
      const sample = html.slice(0, 1800).replace(/\s+/g, " ");
      console.log(`[pdf][diag] html head: ${sample}`);
      return "";
    }

    const { getDocumentProxy, extractText } = await import("unpdf");
    const { pdf, text } = await silencePdfjsNoise(async () => {
      const pdfDoc = await getDocumentProxy(buf);
      const { text } = await extractText(pdfDoc, { mergePages: true });
      return { pdf: pdfDoc, text };
    });
    void pdf;
    const flat = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const clean = flat.replace(/[ -]+/g, " ").replace(/\s+/g, " ").trim();
    return clean.slice(0, maxChars);
  } catch (e) {
    console.log(`[pdf] parse failed ${url}: ${(e as Error).message}`);
    return "";
  }
}
