// API endpoint to return which organizations have active events
// This is used by the frontend to hide empty committees

const { list } = require("@vercel/blob");

// Vercel Blob base URL
const BLOB_BASE_URL = "https://r9obi5taznzngbhm.public.blob.vercel-storage.com";

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Fetch active-orgs.json from Vercel Blob storage
    const response = await fetch(`${BLOB_BASE_URL}/active-orgs.json`);

    if (!response.ok) {
      // File doesn't exist yet - return empty array
      res.status(200).json({
        activeOrgs: [],
        lastUpdated: null,
        message: "No active orgs data yet. Run the cron job to generate."
      });
      return;
    }

    const data = await response.json();

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
