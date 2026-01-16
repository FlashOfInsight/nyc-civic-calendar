// API endpoint for generating ICS calendar feeds
// URL: /api/calendar.ics?orgs=city-council.stated,mta.board

const { generateICS } = require("../lib/ics-generator");
const { list, put } = require("@vercel/blob");
const crypto = require("crypto");

// Blob storage base URL (set after first upload)
const BLOB_BASE = process.env.BLOB_BASE_URL;

// Load meeting data from Vercel Blob storage
async function loadMeetings() {
  const meetings = [];
  const files = ["city-council.json", "mta.json", "agencies.json", "community-boards.json"];

  for (const file of files) {
    try {
      // Try to fetch from blob storage
      const blobUrl = BLOB_BASE ? `${BLOB_BASE}/${file}` : null;

      if (blobUrl) {
        const response = await fetch(blobUrl);
        if (response.ok) {
          const data = await response.json();
          if (data.meetings) {
            meetings.push(...data.meetings);
          }
          continue;
        }
      }

      // Fallback: try to list blobs and find the file
      const { blobs } = await list({ prefix: file.replace(".json", "") });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url);
        if (response.ok) {
          const data = await response.json();
          if (data.meetings) {
            meetings.push(...data.meetings);
          }
        }
      }
    } catch (err) {
      console.error(`Error loading ${file}:`, err.message);
    }
  }

  // If no meetings from blob, try local data files (for initial deployment)
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

// Track calendar subscription access
async function trackSubscription(orgsParam) {
  try {
    // Create a hash of the orgs to identify unique subscriptions
    const subId = crypto.createHash("md5").update(orgsParam).digest("hex").substring(0, 12);
    const now = Date.now();

    // Load existing usage data
    let usage = {};
    try {
      const { blobs } = await list({ prefix: "usage" });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url);
        if (response.ok) {
          usage = await response.json();
        }
      }
    } catch (e) {
      // Start fresh if no data exists
    }

    // Update this subscription's last access time
    usage[subId] = now;

    // Clean up old entries (older than 7 days)
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    for (const id in usage) {
      if (usage[id] < weekAgo) {
        delete usage[id];
      }
    }

    // Save updated usage data
    await put("usage.json", JSON.stringify(usage), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true
    });
  } catch (err) {
    // Don't fail the request if tracking fails
    console.error("Error tracking subscription:", err.message);
  }
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

  // Track this subscription (don't await, run in background)
  trackSubscription(orgsParam);

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
