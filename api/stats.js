// API endpoint for getting usage statistics
//
// NOTE: Usage tracking has been disabled to reduce storage costs.
// Previously tracked active calendar subscriptions via Vercel Blob.

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).json({
    message: "Usage tracking disabled to reduce API costs",
    note: "Calendar subscriptions still work, but we no longer track active users"
  });
};
