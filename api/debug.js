// Debug endpoint - check ICS output
const { list } = require("@vercel/blob");
const { generateICS } = require("../lib/ics-generator");

module.exports = async function handler(req, res) {
  try {
    // Load city council data from blob
    const { blobs } = await list({ prefix: "city-council" });

    let meetings = [];
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      const data = await response.json();
      meetings = data.meetings || [];
    }

    // Show raw meeting data and generated ICS
    const ics = generateICS(meetings, "Test");

    res.status(200).json({
      blobUrl: blobs[0]?.url,
      meetingCount: meetings.length,
      firstMeeting: meetings[0],
      icsPreview: ics.substring(0, 1500)
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
