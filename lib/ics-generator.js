// ICS Calendar Generator
// Generates valid ICS format for calendar subscriptions

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
    "METHOD:PUBLISH"
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
    const startDate = new Date(`${meeting.date}T${meeting.time}`);
    lines.push(`DTSTART:${formatDateTime(startDate)}`);

    // End time
    if (meeting.endTime) {
      const endDate = new Date(`${meeting.date}T${meeting.endTime}`);
      lines.push(`DTEND:${formatDateTime(endDate)}`);
    } else {
      // Default 2 hour duration
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
      lines.push(`DTEND:${formatDateTime(endDate)}`);
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
 * Format a Date to ICS datetime format
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

module.exports = { generateICS, generateEvent, formatDateTime, escapeICS };
