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

  return lines.map(foldLine).join("\r\n");
}

/**
 * Generate VEVENT lines for a single meeting
 * @param {Object} meeting - Meeting object
 * @returns {Array} - Array of ICS lines
 */
function generateEvent(meeting) {
  const lines = ["BEGIN:VEVENT"];

  // UID - unique identifier (must be deterministic so calendar apps don't duplicate events)
  const uid = meeting.id || `${meeting.org || 'unknown'}-${meeting.date}-${(meeting.title || '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
  lines.push(`UID:${uid}-v2@nyc-civic-calendar`);

  // Timestamps
  const now = formatDateTime(new Date());
  lines.push(`DTSTAMP:${now}`);

  // Start time
  if (meeting.time) {
    const startTimeFormatted = formatLocalDateTime(meeting.date, meeting.time);
    lines.push(`DTSTART;TZID=${NYC_TIMEZONE}:${startTimeFormatted}`);

    // End time
    if (meeting.endTime) {
      const endTimeFormatted = formatLocalDateTime(meeting.date, meeting.endTime);
      lines.push(`DTEND;TZID=${NYC_TIMEZONE}:${endTimeFormatted}`);
    } else {
      const endTimeFormatted = addHourToTime(meeting.date, meeting.time, 1);
      lines.push(`DTEND;TZID=${NYC_TIMEZONE}:${endTimeFormatted}`);
    }
  } else {
    // All-day event — DTEND must be next day per RFC 5545
    lines.push(`DTSTART;VALUE=DATE:${meeting.date.replace(/-/g, "")}`);
    const nextDay = new Date(meeting.date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().split("T")[0].replace(/-/g, "");
    lines.push(`DTEND;VALUE=DATE:${nextDayStr}`);
  }

  // Summary (title)
  lines.push(`SUMMARY:${escapeICS(meeting.title)}`);

  // Location
  if (meeting.location) {
    lines.push(`LOCATION:${escapeICS(meeting.location)}`);
  }

  // Description
  const descriptionParts = [];
  if (meeting.description) descriptionParts.push(meeting.description);
  if (meeting.agendaUrl) descriptionParts.push(`Agenda: ${meeting.agendaUrl}`);
  if (meeting.url) descriptionParts.push(`More info: ${meeting.url}`);
  if (descriptionParts.length > 0) {
    lines.push(`DESCRIPTION:${escapeICS(descriptionParts.join("\n\n"))}`);
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

/**
 * Fold a content line per RFC 5545 Section 3.1
 * Lines must be no longer than 75 octets. Continuation lines start with a space.
 * @param {string} line
 * @returns {string} - Folded line(s) joined with CRLF
 */
function foldLine(line) {
  const MAX_OCTETS = 75;
  const bytes = Buffer.from(line, "utf-8");
  if (bytes.length <= MAX_OCTETS) return line;

  const parts = [];
  let start = 0;
  let limit = MAX_OCTETS;

  while (start < bytes.length) {
    // Avoid splitting in the middle of a multi-byte UTF-8 character
    let end = Math.min(start + limit, bytes.length);
    if (end < bytes.length) {
      // Walk back if we're in the middle of a multi-byte sequence
      while (end > start && (bytes[end] & 0xC0) === 0x80) {
        end--;
      }
    }
    parts.push(bytes.slice(start, end).toString("utf-8"));
    start = end;
    // After first line, continuation lines start with a space (1 octet), so 74 usable
    limit = MAX_OCTETS - 1;
  }

  return parts.join("\r\n ");
}

module.exports = { generateICS, generateEvent, formatDateTime, formatLocalDateTime, addHourToTime, escapeICS, foldLine };
