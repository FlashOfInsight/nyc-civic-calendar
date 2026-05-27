// Cloudflare Pages Function — /api/elections.ics
// Serves a bespoke political calendar ICS from the 2026 NYS BOE calendar.
// Query param: ?e=<base64url-bitmask> where each bit corresponds to an event
// index in lib/data/political-calendar-2026.js.
// Requires nodejs_compat in Cloudflare Pages settings (for Buffer).

import { EVENTS } from "../../lib/data/political-calendar-2026.js";

function decodeSelection(encoded) {
  if (!encoded) return new Set();
  try {
    const pad = (4 - (encoded.length % 4)) % 4;
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(pad);
    const buf = Buffer.from(b64, "base64");
    const selected = new Set();
    for (let i = 0; i < buf.length; i++) {
      for (let bit = 0; bit < 8; bit++) {
        if (buf[i] & (1 << bit)) {
          const idx = i * 8 + bit;
          if (idx < EVENTS.length) selected.add(idx);
        }
      }
    }
    return selected;
  } catch {
    return new Set();
  }
}

function dateToICS(dateStr) {
  return dateStr.replace(/-/g, "");
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return [
    dt.getUTCFullYear(),
    String(dt.getUTCMonth() + 1).padStart(2, "0"),
    String(dt.getUTCDate()).padStart(2, "0")
  ].join("");
}

function escapeICS(text) {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function foldLine(line) {
  const MAX = 75;
  const bytes = Buffer.from(line, "utf-8");
  if (bytes.length <= MAX) return line;
  const parts = [];
  let start = 0;
  let limit = MAX;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    if (end < bytes.length) {
      while (end > start && (bytes[end] & 0xc0) === 0x80) end--;
    }
    parts.push(bytes.slice(start, end).toString("utf-8"));
    start = end;
    limit = MAX - 1;
  }
  return parts.join("\r\n ");
}

function nowStamp() {
  const n = new Date();
  return [
    n.getUTCFullYear(),
    String(n.getUTCMonth() + 1).padStart(2, "0"),
    String(n.getUTCDate()).padStart(2, "0"),
    "T",
    String(n.getUTCHours()).padStart(2, "0"),
    String(n.getUTCMinutes()).padStart(2, "0"),
    String(n.getUTCSeconds()).padStart(2, "0"),
    "Z"
  ].join("");
}

function generateEventLines(event, dtstamp) {
  const uid = `nyc-elections-2026-${event.index}@nycciviccalendar.com`;
  const dtstart = dateToICS(event.date);
  const dtend = addDays(event.endDate ?? event.date, 1);
  const description = escapeICS(`${event.legalText}\n${event.citation}\n\nSource: NYS Board of Elections 2026 Political Calendar`);

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escapeICS(event.label)}`,
    `DESCRIPTION:${description}`,
    `CATEGORIES:${escapeICS(event.category)}`,
    "URL:https://elections.ny.gov/",
    "END:VEVENT"
  ];
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const encoded = url.searchParams.get("e");

  if (!encoded) {
    return new Response(
      JSON.stringify({
        error: "Missing 'e' parameter.",
        hint: "Use the NYC Civic Calendar elections page to build your subscription URL."
      }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const selected = decodeSelection(encoded);

  if (selected.size === 0) {
    return new Response(
      JSON.stringify({ error: "No valid events decoded from 'e' parameter." }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const selectedEvents = EVENTS.filter(e => selected.has(e.index));
  const dtstamp = nowStamp();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NYC Civic Calendar//nyc-elections-2026//EN",
    "X-WR-CALNAME:NYC 2026 Political Calendar",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH"
  ];

  for (const event of selectedEvents) {
    lines.push(...generateEventLines(event, dtstamp));
  }

  lines.push("END:VCALENDAR");

  const ics = lines.map(foldLine).join("\r\n");

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="nyc-elections-2026.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
