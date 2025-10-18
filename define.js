// api/define.js
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();

    const wordRaw = (req.query.q || "").toString().trim();
    if (!wordRaw) {
      return res.status(400).json({ ok: false, error: "Missing q", word: "", meaning: null });
    }
    const word = decodeURIComponent(wordRaw);
    const url = `https://glosbe.com/en/ko/${encodeURIComponent(word)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko,en;q=0.9",
        "Referer": "https://glosbe.com/",
        "Origin": "https://glosbe.com"
      }
    }).catch((e) => {
      if (e.name === "AbortError") throw new Error("Upstream timeout");
      throw e;
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.status(resp.status).json({
        ok: false,
        error: `Upstream status ${resp.status}`,
        word,
        meaning: null,
        source: url
      });
    }

    const html = await resp.text();
    const $ = cheerio.load(html);

    const meaning =
      $("#content-summary").first().find(".dense").find("strong").first().text().trim() || null;

    return res.status(200).json({
      ok: true,
      word,
      meaning,
      source: url
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: String(err && err.message ? err.message : err),
      word: (req.query.q || "").toString(),
      meaning: null,
      source: `https://glosbe.com/en/ko/${encodeURIComponent((req.query.q || "").toString())}`
    });
  }
}
