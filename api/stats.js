// API endpoint for getting usage statistics
const { list } = require("@vercel/blob");

module.exports = async function handler(req, res) {
  try {
    let activeUsers = 0;
    const now = Date.now();
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

    // Load usage data
    const { blobs } = await list({ prefix: "usage" });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const usage = await response.json();
        // Count subscriptions accessed in the last 7 days
        for (const id in usage) {
          if (usage[id] >= weekAgo) {
            activeUsers++;
          }
        }
      }
    }

    res.setHeader("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
    res.status(200).json({ activeUsers });
  } catch (err) {
    console.error("Error getting stats:", err.message);
    res.status(200).json({ activeUsers: 0 });
  }
};
