import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ASX gates direct PDF access behind a terms-of-use page. The first request
// to displayAnnouncement.do?display=pdf returns a disclaimer HTML page with
// a form posting to announcementTerms.do. After that POST, the server sets
// a session cookie that allows subsequent PDF GETs to stream the raw PDF.
// We cache the cookie at module level — it lives for the dev process and
// gets re-acquired automatically if it ever stops working.
let asxCookies: string | null = null;
let asxTermsTried = false;

async function acceptAsxTerms(): Promise<string | null> {
  if (asxCookies) return asxCookies;
  if (asxTermsTried) return null;
  asxTermsTried = true;
  try {
    const res = await fetch("https://www.asx.com.au/asx/v2/statistics/announcementTerms.do", {
      method: "POST",
      headers: {
        "User-Agent": BROWSER_UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "text/html",
        Referer: "https://www.asx.com.au/asx/v2/statistics/prevBusDayAnns.do",
      },
      body: "agree=true&action=Agree",
      cache: "no-store",
      redirect: "manual",
    });
    console.log(`[asx-terms] POST: ${res.status}`);
    const headersAny = res.headers as Headers & { getSetCookie?: () => string[] };
    const setCookieHeaders =
      headersAny.getSetCookie?.() ??
      (res.headers.get("set-cookie")?.split(/,(?=\s*[A-Za-z0-9_-]+=)/) ?? []);
    const cookies: string[] = [];
    for (const sc of setCookieHeaders) {
      const cookiePart = sc.split(";")[0].trim();
      if (cookiePart) cookies.push(cookiePart);
    }
    if (cookies.length > 0) {
      asxCookies = cookies.join("; ");
      console.log(`[asx-terms] accepted, ${cookies.length} cookies stored`);
      return asxCookies;
    }
    console.log(`[asx-terms] no Set-Cookie header on the response`);
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
    if (isAsx) await acceptAsxTerms();
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
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    const flat = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const clean = flat.replace(/[ -]+/g, " ").replace(/\s+/g, " ").trim();
    return clean.slice(0, maxChars);
  } catch (e) {
    console.log(`[pdf] parse failed ${url}: ${(e as Error).message}`);
    return "";
  }
}
