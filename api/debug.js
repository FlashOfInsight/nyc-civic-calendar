// Debug endpoint to test scrapers individually
const https = require("https");
const cheerio = require("cheerio");

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith("/")) {
          redirectUrl = "https://www.mta.info" + redirectUrl;
        }
        fetchHTML(redirectUrl).then(resolve).catch(reject);
        return;
      }
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  const results = {
    htmlLength: 0,
    allLinks: [],
    matchingLinks: [],
    error: null
  };

  try {
    const html = await fetchHTML("https://www.mta.info/transparency/board-and-committee-meetings");
    results.htmlLength = html.length;

    const $ = cheerio.load(html);

    // Get all links
    $("a").each((_, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr("href") || "";

      if (text.length > 0 && text.length < 200) {
        results.allLinks.push({ text: text.substring(0, 100), href: href.substring(0, 100) });
      }

      // Check if it matches our pattern
      const dateMatch = text.match(/(\w+)\s+(\d+)\s+and\s+(\d+),\s+(\d{4})/i);
      if (dateMatch) {
        results.matchingLinks.push({
          text,
          href,
          match: dateMatch[0],
          month: dateMatch[1],
          day1: dateMatch[2],
          day2: dateMatch[3],
          year: dateMatch[4]
        });
      }
    });

    // Limit allLinks to first 50
    results.allLinks = results.allLinks.slice(0, 50);

  } catch (err) {
    results.error = err.message;
  }

  res.status(200).json(results);
};
