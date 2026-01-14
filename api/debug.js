// Debug endpoint to test scrapers
const https = require("https");

function testUrl(url, options) {
  return new Promise((resolve) => {
    https.get(url, options, (response) => {
      let body = "";
      response.on("data", chunk => body += chunk);
      response.on("end", () => resolve({ status: response.statusCode, data: body }));
    }).on("error", (err) => resolve({ status: 0, data: err.message }));
  });
}

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

    // Try multiple auth methods
    const url = `https://webapi.legistar.com/v1/nyc/events?$top=5`;
    results.urlTested = url;

    // Test 1: No auth
    const noAuthResult = await testUrl(url, {});
    results.noAuth = { status: noAuthResult.status, length: noAuthResult.data.length };

    // Test 2: Header auth
    const headerAuthResult = await testUrl(url, {
      headers: { "Ocp-Apim-Subscription-Key": token }
    });
    results.headerAuth = { status: headerAuthResult.status, length: headerAuthResult.data.length };

    // Test 3: Query param
    const queryAuthResult = await testUrl(`${url}&token=${token}`, {});
    results.queryAuth = { status: queryAuthResult.status, length: queryAuthResult.data.length };

    // Use whichever worked
    let data = "";
    if (noAuthResult.status === 200) data = noAuthResult.data;
    else if (headerAuthResult.status === 200) data = headerAuthResult.data;
    else if (queryAuthResult.status === 200) data = queryAuthResult.data;
    else data = noAuthResult.data;

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
