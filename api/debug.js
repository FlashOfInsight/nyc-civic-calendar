// Debug endpoint - check ICS output
//
// STORAGE: Uses GitHub Gist (free, unlimited reads)

const { readFromGist, getGistRawUrl } = require("../lib/gist-storage");
const { generateICS } = require("../lib/ics-generator");

module.exports = async function handler(req, res) {
  // Verify authorization (same check as cron endpoint)
  const isVercelCron = req.headers["x-vercel-cron"] === "1";
  const isManualTrigger = req.query.secret && req.query.secret === process.env.REFRESH_SECRET;

  if (process.env.VERCEL && !isVercelCron && !isManualTrigger) {
    res.status(401).json({
      error: "Unauthorized",
      hint: "Use ?secret=YOUR_SECRET to trigger manually"
    });
    return;
  }

  try {
    // Load city council data from Gist
    const data = await readFromGist("city-council.json");
    const meetings = data?.meetings || [];

    // Show raw meeting data and generated ICS
    const ics = generateICS(meetings, "Test");

    res.status(200).json({
      gistUrl: getGistRawUrl("city-council.json"),
      meetingCount: meetings.length,
      firstMeeting: meetings[0],
      icsPreview: ics.substring(0, 1500)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
