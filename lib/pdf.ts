import "server-only";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Fetch a PDF and extract its text via unpdf (pure-JS, ESM-friendly).
// Used by the discovery 2nd-pass enrichment to dig out per-share offer
// prices and aggregate deal values that aren't in the headline. Caps the
// returned text at maxChars so we don't blow up the Claude prompt with
// a 1 MB filing — 60k chars is ~15-20k tokens, plenty of headroom.
//
// Some endpoints (notably ASX's displayAnnouncement.do?display=pdf) return
// an HTML interstitial that embeds the real PDF via <embed> / <iframe>
// rather than streaming the PDF directly. We detect that with the PDF
// magic number ("%PDF-") and recurse once on the embedded URL.
export async function fetchPdfText(url: string, maxChars = 60000, depth = 0): Promise<string> {
  try {
    const origin = (() => {
      try { return new URL(url).origin; } catch { return ""; }
    })();
    const res = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "application/pdf,*/*",
        ...(origin ? { Referer: origin } : {}),
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
      // Try to surface an embedded PDF link from the HTML wrapper. ASX in
      // particular wraps its PDFs in a disclaimer page that uses meta
      // refresh, a JS redirect, a form, or an embed.
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      const embedMatch =
        html.match(/<(?:embed|iframe|object)[^>]+(?:src|data)="([^"]+)"/i) ??
        html.match(/<meta\s+http-equiv=["']refresh["'][^>]*content=["']\d+\s*;\s*url=([^"']+)["']/i) ??
        html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i) ??
        html.match(/<form[^>]+action="([^"]+)"/i) ??
        html.match(/href="([^"]+\.pdf[^"]*)"/i);
      if (embedMatch && embedMatch[1]) {
        const inner = embedMatch[1].startsWith("http")
          ? embedMatch[1]
          : new URL(embedMatch[1], finalUrl).href;
        console.log(`[pdf] following embedded url: ${inner}`);
        return fetchPdfText(inner, maxChars, depth + 1);
      }
      // Couldn't find a follow-up URL — dump the HTML head so we can see
      // what the page is offering and iterate.
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
