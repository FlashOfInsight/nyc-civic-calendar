// API endpoint for generating ICS calendar feeds
// URL: /api/calendar.ics?orgs=city-council.stated,mta.board

const { generateICS } = require("../lib/ics-generator");
const fs = require("fs");
const path = require("path");

// Load meeting data from JSON files
function loadMeetings() {
  const dataDir = path.join(process.cwd(), "data");
  const meetings = [];

  const files = ["city-council.json", "mta.json", "agencies.json"];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    try {
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        if (data.meetings) {
          meetings.push(...data.meetings);
        }
      }
    } catch (err) {
      console.error(`Error loading ${file}:`, err.message);
    }
  }

  return meetings;
}

// Filter meetings by selected organizations
function filterMeetings(meetings, selectedOrgs) {
  return meetings.filter(meeting => {
    // Check if meeting's org matches any selected org
    // Support both exact match and prefix match (for parent selections)
    return selectedOrgs.some(org => {
      return meeting.org === org || meeting.org.startsWith(org + ".");
    });
  });
}

module.exports = async function handler(req, res) {
  // Get orgs from query parameter
  const orgsParam = req.query.orgs;

  if (!orgsParam) {
    res.status(400).json({
      error: "Missing 'orgs' parameter. Specify organizations as comma-separated list.",
      example: "/api/calendar.ics?orgs=city-council.stated,mta.board"
    });
    return;
  }

  // Parse orgs
  const selectedOrgs = orgsParam.split(",").map(o => o.trim()).filter(Boolean);

  if (selectedOrgs.length === 0) {
    res.status(400).json({ error: "No valid organizations specified" });
    return;
  }

  // Load and filter meetings
  const allMeetings = loadMeetings();
  const filteredMeetings = filterMeetings(allMeetings, selectedOrgs);

  // Generate ICS
  const ics = generateICS(filteredMeetings, "NYC Civic Meetings");

  // Set headers for calendar file
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="nyc-civic-calendar.ics"');
  res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour

  res.status(200).send(ics);
};
