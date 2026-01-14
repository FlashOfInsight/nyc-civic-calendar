// Debug endpoint - check scraped data
const { scrapeCityCouncil } = require("../lib/scrapers/city-council");

module.exports = async function handler(req, res) {
  try {
    const meetings = await scrapeCityCouncil();
    res.status(200).json({
      count: meetings.length,
      meetings: meetings.slice(0, 5).map(m => ({
        title: m.title,
        date: m.date,
        time: m.time,
        hasTime: !!m.time,
        location: m.location
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
