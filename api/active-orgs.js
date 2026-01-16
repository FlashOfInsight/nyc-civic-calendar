// API endpoint to return which organizations have active events
// This is used by the frontend to hide empty committees

const { list } = require("@vercel/blob");

// Blob storage base URL (from environment variable)
const BLOB_BASE = process.env.BLOB_BASE_URL;

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    let data = null;

    // Try to fetch from blob storage using env var
    if (BLOB_BASE) {
      const response = await fetch(`${BLOB_BASE}/active-orgs.json`);
      if (response.ok) {
        data = await response.json();
      }
    }

    // Fallback: try to list blobs and find the file
    if (!data) {
      const { blobs } = await list({ prefix: "active-orgs" });
      if (blobs.length > 0) {
        const response = await fetch(blobs[0].url);
        if (response.ok) {
          data = await response.json();
        }
      }
    }

    if (!data) {
      // File doesn't exist yet - return empty array
      res.status(200).json({
        activeOrgs: [],
        lastUpdated: null,
        message: "No active orgs data yet. Run the cron job to generate."
      });
      return;
    }

    res.status(200).json({
      activeOrgs: data.activeOrgs || [],
      lastUpdated: data.lastUpdated || null
    });
  } catch (err) {
    console.error("Error fetching active orgs:", err);
    res.status(500).json({
      error: "Failed to fetch active orgs",
      message: err.message
    });
  }
};
