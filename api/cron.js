// Cron job endpoint for refreshing meeting data
// Triggered weekly by Vercel Cron

const { put } = require("@vercel/blob");
const { scrapeCityCouncil } = require("../lib/scrapers/city-council");
const { scrapeMTA } = require("../lib/scrapers/mta");
const { scrapeAgencies } = require("../lib/scrapers/agencies");
const { scrapeManhattanCBs, scrapeBrooklynCBs, scrapeQueensCBs, scrapeBronxCBs, scrapeStatenIslandCBs } = require("../lib/scrapers/community-boards");

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
    agencies: { success: false, count: 0, error: null },
    communityBoards: { success: false, count: 0, error: null }
  };

  // Scrape City Council (no API key needed - uses HTML scraping)
  try {
    const meetings = await scrapeCityCouncil();
    await writeMeetings("city-council.json", meetings);
    results.cityCouncil.success = true;
    results.cityCouncil.count = meetings.length;
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

  // Scrape Agencies (DOB, DOE PEP - no API key needed, uses HTML scraping)
  try {
    const meetings = await scrapeAgencies();
    await writeMeetings("agencies.json", meetings);
    results.agencies.success = true;
    results.agencies.count = meetings.length;
  } catch (err) {
    results.agencies.error = err.message;
  }

  // Scrape Community Boards (all 5 boroughs)
  try {
    const manhattanMeetings = await scrapeManhattanCBs();
    const brooklynMeetings = await scrapeBrooklynCBs();
    const queensMeetings = await scrapeQueensCBs();
    const bronxMeetings = await scrapeBronxCBs();
    const statenIslandMeetings = await scrapeStatenIslandCBs();
    const allMeetings = [...manhattanMeetings, ...brooklynMeetings, ...queensMeetings, ...bronxMeetings, ...statenIslandMeetings];
    await writeMeetings("community-boards.json", allMeetings);
    results.communityBoards.success = true;
    results.communityBoards.count = allMeetings.length;
  } catch (err) {
    results.communityBoards.error = err.message;
  }

  // Return results
  const totalMeetings = results.cityCouncil.count + results.mta.count + results.agencies.count + results.communityBoards.count;
  const allSuccess = results.cityCouncil.success && results.mta.success && results.agencies.success && results.communityBoards.success;

  res.status(allSuccess ? 200 : 207).json({
    success: allSuccess,
    timestamp: new Date().toISOString(),
    totalMeetings,
    results
  });
};
