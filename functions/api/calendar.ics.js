// Cloudflare Pages Function — /api/calendar.ics
// Serves the personalized ICS feed. No migration prefix on events (the
// legacy Vercel endpoint still adds it). Requires nodejs_compat in the
// Pages project settings so process.env and Buffer are available.

import { readFromGist } from "../../lib/gist-storage.js";
import { generateICS } from "../../lib/ics-generator.js";

const FILES = [
  "city-council.json",
  "mta.json",
  "agencies.json",
  "community-boards.json",
  "oversight-boards.json",
  "nyc-rules.json",
  "city-government.json",
  "nypd.json"
];

async function loadMeetings() {
  const results = await Promise.all(
    FILES.map((file) =>
      readFromGist(file)
        .then((data) => (data && data.meetings ? data.meetings : []))
        .catch((err) => {
          console.error(`Error loading ${file}:`, err.message);
          return [];
        })
    )
  );
  return results.flat();
}

function filterMeetings(meetings, selectedOrgs) {
  return meetings.filter((meeting) => {
    if (!meeting || !meeting.org || !meeting.date) return false;
    return selectedOrgs.some(
      (org) => meeting.org === org || meeting.org.startsWith(org + ".")
    );
  });
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export async function onRequest(context) {
  // Bridge Cloudflare's `env` bindings to process.env so the shared
  // gist-storage module (used from Node too) reads them consistently.
  for (const [k, v] of Object.entries(context.env || {})) {
    if (typeof v === "string") process.env[k] = v;
  }

  const url = new URL(context.request.url);
  const orgsParam = url.searchParams.get("orgs");

  if (!orgsParam) {
    return jsonResponse(
      {
        error: "Missing 'orgs' parameter. Specify organizations as comma-separated list.",
        example: "/api/calendar.ics?orgs=city-council.stated,mta.board"
      },
      400
    );
  }

  const selectedOrgs = orgsParam
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (selectedOrgs.length === 0) {
    return jsonResponse({ error: "No valid organizations specified" }, 400);
  }

  const allMeetings = await loadMeetings();
  const filteredMeetings = filterMeetings(allMeetings, selectedOrgs);

  const ics = generateICS(filteredMeetings, "NYC Civic Meetings");

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="nyc-civic-calendar.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    }
  });
}
