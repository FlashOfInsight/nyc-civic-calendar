// NYPD Precinct Community Council Meeting Generator
// Uses pattern-based date generation from config file (no HTTP requests)

const precinctData = require("../data/nypd-precincts.json");

/**
 * Get ordinal suffix for a number
 */
function getOrdinal(n) {
  const num = parseInt(n);
  if (num >= 11 && num <= 13) return "th";
  switch (num % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

/**
 * Get NYPD precinct page URL
 */
function getPrecinctUrl(id) {
  if (id === "mts") return "https://www.nyc.gov/site/nypd/bureaus/patrol/precincts/midtown-south-precinct.page";
  if (id === "mtn") return "https://www.nyc.gov/site/nypd/bureaus/patrol/precincts/midtown-north-precinct.page";
  if (id === "cp") return "https://www.nyc.gov/site/nypd/bureaus/patrol/precincts/central-park-precinct.page";
  return `https://www.nyc.gov/site/nypd/bureaus/patrol/precincts/${id}${getOrdinal(id)}-precinct.page`;
}

/**
 * Get the Nth occurrence of a weekday in a month
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} dayOfWeek - 0=Sunday through 6=Saturday
 * @param {number} n - 1=first, 2=second, 3=third, 4=fourth, -1=last
 * @returns {Date|null}
 */
function getNthWeekday(year, month, dayOfWeek, n) {
  if (n === -1) {
    // Last occurrence - start from end of month
    const lastDay = new Date(year, month + 1, 0);
    let day = lastDay.getDate();
    while (new Date(year, month, day).getDay() !== dayOfWeek) {
      day--;
    }
    return new Date(year, month, day);
  }

  // Find first occurrence
  const firstOfMonth = new Date(year, month, 1);
  let firstOccurrence = 1 + ((dayOfWeek - firstOfMonth.getDay() + 7) % 7);
  const targetDay = firstOccurrence + (n - 1) * 7;

  // Check if it's a valid day in the month
  const result = new Date(year, month, targetDay);
  if (result.getMonth() !== month) return null;
  return result;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format time as HH:MM
 */
function formatTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Generate meetings for a single precinct for the next 12 months
 */
function generatePrecinctMeetings(precinct, borough) {
  const meetings = [];

  // Skip precincts without a pattern
  if (precinct.weekOfMonth === null || precinct.dayOfWeek === null) {
    return meetings;
  }

  const now = new Date();
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

  // Skip months: July (6), August (7), and optionally December (11)
  const skipMonths = [6, 7]; // Most precincts skip July and August

  // Central Park has special schedule
  const centralParkMonths = [0, 2, 4, 5, 8, 10]; // Jan, Mar, May, Jun, Sep, Nov

  let current = new Date(now.getFullYear(), now.getMonth(), 1);

  while (current <= oneYearLater) {
    const year = current.getFullYear();
    const month = current.getMonth();

    // Skip summer months
    if (skipMonths.includes(month)) {
      current.setMonth(current.getMonth() + 1);
      continue;
    }

    // Special handling for Central Park Precinct
    if (precinct.id === "cp" && !centralParkMonths.includes(month)) {
      current.setMonth(current.getMonth() + 1);
      continue;
    }

    // Calculate meeting date
    const meetingDate = getNthWeekday(year, month, precinct.dayOfWeek, precinct.weekOfMonth);

    if (meetingDate && meetingDate >= now && meetingDate <= oneYearLater) {
      const dateStr = formatDate(meetingDate);
      const timeStr = formatTime(precinct.hour, precinct.minute);

      // Create org key based on borough
      const orgKey = `city-agencies.nypd.${borough}.pct-${precinct.id}`;

      meetings.push({
        id: `nypd-${precinct.id}-${dateStr}`,
        org: orgKey,
        title: `${precinct.name} Community Council Meeting`,
        date: dateStr,
        time: timeStr,
        location: precinct.location,
        description: `Monthly community council meeting for the ${precinct.name}. Open to all community members. Contact the precinct's Community Affairs office for more information.`,
        url: getPrecinctUrl(precinct.id)
      });
    }

    current.setMonth(current.getMonth() + 1);
  }

  return meetings;
}

/**
 * Generate all NYPD precinct community council meetings
 * No HTTP requests - uses pattern-based generation from config
 */
function generateNYPDMeetings() {
  const allMeetings = [];

  for (const [borough, precincts] of Object.entries(precinctData.precincts)) {
    for (const precinct of precincts) {
      const meetings = generatePrecinctMeetings(precinct, borough);
      allMeetings.push(...meetings);
    }
  }

  console.log(`NYPD generator created ${allMeetings.length} meetings`);
  return allMeetings;
}

module.exports = { generateNYPDMeetings };
