// Debug endpoint - test NYC Council calendar scraping
const https = require("https");
const cheerio = require("cheerio");

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve({ status: res.statusCode, data }));
    }).on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  const results = { meetings: [], error: null };

  try {
    // Fetch the calendar page
    const { status, data } = await fetchPage("https://legistar.council.nyc.gov/Calendar.aspx");
    results.pageStatus = status;
    results.pageLength = data.length;

    const $ = cheerio.load(data);

    // Look for meeting rows in the grid
    // The Telerik RadGrid renders meetings in a table
    $("tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 4) {
        const name = $(cells[0]).text().trim();
        const date = $(cells[1]).text().trim();
        const time = $(cells[2]).text().trim();
        const location = $(cells[3]).text().trim();

        // Check if this looks like a meeting row (has a date pattern)
        if (date && date.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
          results.meetings.push({ name, date, time, location });
        }
      }
    });

    // Also try to find any JSON data in the page
    const scriptContent = $("script").text();
    const jsonMatch = scriptContent.match(/"appointments":\s*(\[[^\]]*\])/);
    if (jsonMatch) {
      results.appointmentsJson = jsonMatch[1].substring(0, 200);
    }

  } catch (err) {
    results.error = err.message;
  }

  res.status(200).json(results);
};
