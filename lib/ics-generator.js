// ICS Calendar Generator
// Generates valid ICS format for calendar subscriptions

const NYC_TIMEZONE = "America/New_York";

// VTIMEZONE component for America/New_York
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE"
];

/**
 * Generate an ICS calendar string from meetings
 * @param {Array} meetings - Array of meeting objects
 * @param {string} calendarName - Name for the calendar
 * @returns {string} - ICS formatted string
 */
function generateICS(meetings, calendarName = "NYC Civic Meetings") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NYC Civic Calendar//nyc-civic-calendar//EN",
    `X-WR-CALNAME:${calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-TIMEZONE:${NYC_TIMEZONE}`,
    ...VTIMEZONE
  ];

  for (const meeting of meetings) {
    lines.push(...generateEvent(meeting));
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Generate VEVENT lines for a single meeting
 * @param {Object} meeting - Meeting object
 * @returns {Array} - Array of ICS lines
 */
function generateEvent(meeting) {
  const lines = ["BEGIN:VEVENT"];

  // UID - unique identifier
  const uid = meeting.id || `${meeting.org}-${meeting.date}-${Date.now()}`;
  lines.push(`UID:${uid}@nyc-civic-calendar`);

  // Timestamps
  const now = formatDateTime(new Date());
  lines.push(`DTSTAMP:${now}`);

  // Start time
  if (meeting.time) {
    // Use America/New_York timezone for timed events
    const startTimeFormatted = formatLocalDateTime(meeting.date, meeting.time);
    lines.push(`DTSTART;TZID=${NYC_TIMEZONE}:${startTimeFormatted}`);

    // End time
    if (meeting.endTime) {
      const endTimeFormatted = formatLocalDateTime(meeting.date, meeting.endTime);
      lines.push(`DTEND;TZID=${NYC_TIMEZONE}:${endTimeFormatted}`);
    } else {
      // Default 1 hour duration - add 1 hour to start time
      const endTimeFormatted = addHourToTime(meeting.date, meeting.time, 1);
      lines.push(`DTEND;TZID=${NYC_TIMEZONE}:${endTimeFormatted}`);
    }
  } else {
    // All-day event
    lines.push(`DTSTART;VALUE=DATE:${meeting.date.replace(/-/g, "")}`);
    lines.push(`DTEND;VALUE=DATE:${meeting.date.replace(/-/g, "")}`);
  }

  // Summary (title)
  lines.push(`SUMMARY:${escapeICS(meeting.title)}`);

  // Location
  if (meeting.location) {
    lines.push(`LOCATION:${escapeICS(meeting.location)}`);
  }

  // Description
  if (meeting.description || meeting.url) {
    let desc = meeting.description || "";
    if (meeting.url) {
      desc += desc ? `\\n\\nMore info: ${meeting.url}` : meeting.url;
    }
    lines.push(`DESCRIPTION:${escapeICS(desc)}`);
  }

  // URL
  if (meeting.url) {
    lines.push(`URL:${meeting.url}`);
  }

  lines.push("END:VEVENT");

  return lines;
}

/**
 * Format a Date to ICS datetime format (UTC)
 * @param {Date} date
 * @returns {string} - Format: YYYYMMDDTHHMMSSZ
 */
function formatDateTime(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Format date and time to ICS local datetime format (no Z suffix)
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:MM
 * @returns {string} - Format: YYYYMMDDTHHMMSS
 */
function formatLocalDateTime(dateStr, timeStr) {
  const datePart = dateStr.replace(/-/g, "");
  const timePart = timeStr.replace(":", "") + "00";
  return `${datePart}T${timePart}`;
}

/**
 * Add hours to a time and return formatted ICS datetime
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} timeStr - HH:MM
 * @param {number} hours - Hours to add
 * @returns {string} - Format: YYYYMMDDTHHMMSS
 */
function addHourToTime(dateStr, timeStr, hours) {
  const [hourPart, minutePart] = timeStr.split(":").map(Number);
  let newHour = hourPart + hours;
  let newDate = dateStr;

  // Handle day overflow
  if (newHour >= 24) {
    newHour -= 24;
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 1);
    newDate = date.toISOString().split("T")[0];
  }

  const newTime = `${String(newHour).padStart(2, "0")}:${String(minutePart).padStart(2, "0")}`;
  return formatLocalDateTime(newDate, newTime);
}

/**
 * Escape special characters for ICS format
 * @param {string} text
 * @returns {string}
 */
function escapeICS(text) {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

module.exports = { generateICS, generateEvent, formatDateTime, formatLocalDateTime, addHourToTime, escapeICS };
