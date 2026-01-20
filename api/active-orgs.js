// API endpoint to return which organizations have active events
// This is used by the frontend to hide empty committees
//
// STORAGE: Uses GitHub Gist (free, unlimited reads)

const { readFromGist } = require("../lib/gist-storage");

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const data = await readFromGist("active-orgs.json");

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
