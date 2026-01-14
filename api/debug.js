// Debug endpoint to test scrapers
const https = require("https");

module.exports = async function handler(req, res) {
  const results = {
    legistarTest: null,
    apiKeyPresent: !!process.env.LEGISTAR_API_KEY,
    apiKeyLength: process.env.LEGISTAR_API_KEY ? process.env.LEGISTAR_API_KEY.length : 0
  };

  // Test Legistar API
  try {
    const token = process.env.LEGISTAR_API_KEY;
    const today = new Date().toISOString().split("T")[0];

    // Try with token as query param
    const url = token
      ? `https://webapi.legistar.com/v1/nyc/events?token=${token}&$top=5`
      : `https://webapi.legistar.com/v1/nyc/events?$top=5`;

    results.urlTested = url.replace(token || '', '[HIDDEN]');

    const data = await new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let body = "";
        results.statusCode = response.statusCode;
        response.on("data", chunk => body += chunk);
        response.on("end", () => resolve(body));
      }).on("error", reject);
    });

    results.responseLength = data.length;
    results.responsePreview = data.substring(0, 500);

    try {
      const parsed = JSON.parse(data);
      results.parsed = true;
      results.isArray = Array.isArray(parsed);
      results.itemCount = Array.isArray(parsed) ? parsed.length : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        results.sampleEvent = {
          EventId: parsed[0].EventId,
          EventBodyName: parsed[0].EventBodyName,
          EventDate: parsed[0].EventDate,
          EventTime: parsed[0].EventTime
        };
      }
    } catch (e) {
      results.parsed = false;
      results.parseError = e.message;
    }
  } catch (err) {
    results.error = err.message;
  }

  res.status(200).json(results);
};
