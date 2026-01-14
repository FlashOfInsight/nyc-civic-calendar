// Debug endpoint - check table structure
const https = require("https");
const cheerio = require("cheerio");

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  const results = { rows: [] };

  try {
    const html = await fetchPage("https://legistar.council.nyc.gov/Calendar.aspx");
    const $ = cheerio.load(html);

    // Get first few rows with all their cell contents
    $("tr").slice(0, 10).each((i, row) => {
      const cells = [];
      $(row).find("td, th").each((j, cell) => {
        cells.push($(cell).text().trim().substring(0, 50));
      });
      if (cells.length > 0) {
        results.rows.push(cells);
      }
    });

  } catch (err) {
    results.error = err.message;
  }

  res.status(200).json(results);
};
