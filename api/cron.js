// Cron job endpoint for refreshing meeting data
// Triggered weekly by Vercel Cron

const fs = require("fs");
const path = require("path");
const { scrapeCityCouncil } = require("../lib/scrapers/city-council");
const { scrapeMTA } = require("../lib/scrapers/mta");
const { scrapeAgencies } = require("../lib/scrapers/agencies");

// Data directory
const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Write meetings to JSON file
 * @param {string} filename
 * @param {Array} meetings
 */
function writeMeetings(filename, meetings) {
  const filePath = path.join(DATA_DIR, filename);
  const data = {
    meetings,
    lastUpdated: new Date().toISOString()
  };

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${meetings.length} meetings to ${filename}`);
}

module.exports = async function handler(req, res) {
  // Verify cron secret in production
  // Vercel automatically adds CRON_SECRET for cron jobs
  if (process.env.VERCEL && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow manual trigger in development
    if (process.env.NODE_ENV === "production") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  const results = {
    cityCouncil: { success: false, count: 0, error: null },
    mta: { success: false, count: 0, error: null },
    agencies: { success: false, count: 0, error: null }
  };

  // Scrape City Council
  try {
    const legistarToken = process.env.LEGISTAR_API_KEY;
    if (!legistarToken) {
      results.cityCouncil.error = "Missing LEGISTAR_API_KEY";
    } else {
      const meetings = await scrapeCityCouncil(legistarToken);
      writeMeetings("city-council.json", meetings);
      results.cityCouncil.success = true;
      results.cityCouncil.count = meetings.length;
    }
  } catch (err) {
    results.cityCouncil.error = err.message;
  }

  // Scrape MTA
  try {
    const meetings = await scrapeMTA();
    writeMeetings("mta.json", meetings);
    results.mta.success = true;
    results.mta.count = meetings.length;
  } catch (err) {
    results.mta.error = err.message;
  }

  // Scrape Agencies
  try {
    const nycApiKey = process.env.NYC_API_KEY;
    if (!nycApiKey) {
      results.agencies.error = "Missing NYC_API_KEY";
    } else {
      const meetings = await scrapeAgencies(nycApiKey);
      writeMeetings("agencies.json", meetings);
      results.agencies.success = true;
      results.agencies.count = meetings.length;
    }
  } catch (err) {
    results.agencies.error = err.message;
  }

  // Return results
  const totalMeetings = results.cityCouncil.count + results.mta.count + results.agencies.count;
  const allSuccess = results.cityCouncil.success && results.mta.success && results.agencies.success;

  res.status(allSuccess ? 200 : 207).json({
    success: allSuccess,
    timestamp: new Date().toISOString(),
    totalMeetings,
    results
  });
};
