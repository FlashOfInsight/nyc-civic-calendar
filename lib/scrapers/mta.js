// MTA Board & Committee Meeting Generator
// Uses schedule data from /lib/data/mta-schedule.json (no HTTP requests)
// Replaces HTML scraper — mta.info is behind Akamai bot protection

const scheduleData = require("../data/mta-schedule.json");

const LOCATION = "MTA Board Room, 2 Broadway, 20th Floor, New York, NY";
const MTA_URL = "https://www.mta.info/transparency/board-and-committee-meetings";

const COMMITTEES = [
  { id: "finance", org: "state-authorities.mta.finance", name: "MTA Committee Meetings", time: "09:00", endTime: "14:00",
    description: "MTA committee meetings including Finance, Capital Program, Safety, NYC Transit, and other committees" },
  { id: "safety", org: "state-authorities.mta.safety", name: "Safety Committee", time: "09:00" },
  { id: "nyct", org: "state-authorities.mta.nyct-bus", name: "NYC Transit/MTA Bus Committee", time: "10:00" },
  { id: "lirr-mnr", org: "state-authorities.mta.lirr-mnr", name: "Joint LIRR/Metro-North Committee", time: "09:30" },
  { id: "capital", org: "state-authorities.mta.capital-program", name: "Capital Program Committee", time: "12:00" },
  { id: "bt", org: "state-authorities.mta.bridges-tunnels", name: "Bridges & Tunnels Committee", time: "13:00" },
];

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Generate MTA board and committee meetings from schedule data
 * @returns {Array} - Array of meeting objects
 */
function scrapeMTA() {
  const meetings = [];

  const now = new Date();
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  for (const [year, entries] of Object.entries(scheduleData.schedule)) {
    const yr = parseInt(year);

    for (const entry of entries) {
      const committeeDate = new Date(yr, entry.month - 1, entry.committeeDay);
      const boardDate = new Date(yr, entry.month - 1, entry.boardDay);

      // Skip if outside range
      if (committeeDate < twoMonthsAgo || committeeDate > sixMonthsLater) continue;

      const committeeDateStr = formatDate(yr, entry.month, entry.committeeDay);
      const boardDateStr = formatDate(yr, entry.month, entry.boardDay);

      // Committee meetings
      for (const committee of COMMITTEES) {
        meetings.push({
          id: `mta-${committee.id}-${yr}-${entry.month}-${entry.committeeDay}`,
          org: committee.org,
          title: committee.name,
          date: committeeDateStr,
          time: committee.time,
          endTime: committee.endTime || undefined,
          location: LOCATION,
          description: committee.description || `${committee.name} meeting`,
          url: MTA_URL
        });
      }

      // Board meeting
      meetings.push({
        id: `mta-board-${yr}-${entry.month}-${entry.boardDay}`,
        org: "state-authorities.mta.board",
        title: "MTA Board Meeting",
        date: boardDateStr,
        time: "10:00",
        endTime: "13:00",
        location: LOCATION,
        description: "Regular MTA Board meeting",
        url: MTA_URL
      });
    }
  }

  console.log(`MTA generator created ${meetings.length} meetings`);
  return meetings;
}

module.exports = { scrapeMTA };
