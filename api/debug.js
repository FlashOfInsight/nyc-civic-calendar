// Debug endpoint to test scrapers individually
const { scrapeMTA } = require("../lib/scrapers/mta");

module.exports = async function handler(req, res) {
  const results = {
    mta: { meetings: [], error: null }
  };

  // Test MTA scraper
  try {
    const meetings = await scrapeMTA();
    results.mta.meetings = meetings;
    results.mta.count = meetings.length;
  } catch (err) {
    results.mta.error = err.message;
    results.mta.stack = err.stack;
  }

  res.status(200).json(results);
};
