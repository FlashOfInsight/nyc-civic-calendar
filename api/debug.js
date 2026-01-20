// Debug endpoint - check ICS output
//
// STORAGE: Uses GitHub Gist (free, unlimited reads)

const { readFromGist, getGistRawUrl } = require("../lib/gist-storage");
const { generateICS } = require("../lib/ics-generator");

module.exports = async function handler(req, res) {
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
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
