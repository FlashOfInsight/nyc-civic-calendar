// Cron job endpoint for refreshing meeting data
// Triggered weekly by Vercel Cron

const { put } = require("@vercel/blob");
const { scrapeCityCouncil } = require("../lib/scrapers/city-council");
const { scrapeMTA } = require("../lib/scrapers/mta");
const { scrapeAgencies } = require("../lib/scrapers/agencies");

/**
 * Write meetings to Vercel Blob storage
 * @param {string} filename
 * @param {Array} meetings
 */
async function writeMeetings(filename, meetings) {
  const data = {
    meetings,
    lastUpdated: new Date().toISOString()
  };

  await put(filename, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true
  });

  console.log(`Wrote ${meetings.length} meetings to ${filename}`);
}

module.exports = async function handler(req, res) {
  // Verify authorization for cron endpoint
  // Allow: Vercel cron (with CRON_SECRET), or manual trigger with ?secret= param
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.authorization === `Bearer ${cronSecret}`;
  const isManualTrigger = req.query.secret && req.query.secret === process.env.REFRESH_SECRET;

  if (process.env.VERCEL && !isVercelCron && !isManualTrigger) {
    res.status(401).json({
      error: "Unauthorized",
      hint: "Add REFRESH_SECRET env var and use ?secret=YOUR_SECRET to trigger manually"
    });
    return;
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
      await writeMeetings("city-council.json", meetings);
      results.cityCouncil.success = true;
      results.cityCouncil.count = meetings.length;
    }
  } catch (err) {
    results.cityCouncil.error = err.message;
  }

  // Scrape MTA
  try {
    const meetings = await scrapeMTA();
    await writeMeetings("mta.json", meetings);
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
      await writeMeetings("agencies.json", meetings);
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
