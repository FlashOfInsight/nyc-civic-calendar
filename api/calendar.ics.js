// API endpoint for generating ICS calendar feeds
// URL: /api/calendar.ics?orgs=city-council.stated,mta.board
//
// STORAGE: Uses GitHub Gist for meeting data (free, unlimited reads)

const { generateICS } = require("../lib/ics-generator");
const { readFromGist } = require("../lib/gist-storage");

// Load meeting data from GitHub Gist storage
async function loadMeetings() {
  const meetings = [];
  const files = [
    "city-council.json",
    "mta.json",
    "agencies.json",
    "community-boards.json",
    "oversight-boards.json",
    "nyc-rules.json"
  ];

  for (const file of files) {
    try {
      const data = await readFromGist(file);
      if (data && data.meetings) {
        meetings.push(...data.meetings);
      }
    } catch (err) {
      console.error(`Error loading ${file}:`, err.message);
    }
  }

  // If no meetings from Gist, try local data files (for initial deployment)
  if (meetings.length === 0) {
    try {
      const fs = require("fs");
      const path = require("path");
      const dataDir = path.join(process.cwd(), "data");

      for (const file of files) {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
          if (data.meetings) {
            meetings.push(...data.meetings);
          }
        }
      }
    } catch (err) {
      console.error("Error loading local data:", err.message);
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
  const allMeetings = await loadMeetings();
  const filteredMeetings = filterMeetings(allMeetings, selectedOrgs);

  // Generate ICS
  const ics = generateICS(filteredMeetings, "NYC Civic Meetings");

  // Set headers for calendar file
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="nyc-civic-calendar.ics"');
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  res.status(200).send(ics);
};
