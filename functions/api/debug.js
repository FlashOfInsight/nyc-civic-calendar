// Cloudflare Pages Function — /api/debug
// Operator-only endpoint protected by REFRESH_SECRET. Shows Gist URL,
// meeting count, and a preview of the generated ICS so we can sanity-check
// the pipeline.

import { readFromGist, getGistRawUrl } from "../../lib/gist-storage.js";
import { generateICS } from "../../lib/ics-generator.js";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}

export async function onRequest(context) {
  for (const [k, v] of Object.entries(context.env || {})) {
    if (typeof v === "string") process.env[k] = v;
  }

  const url = new URL(context.request.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.REFRESH_SECRET) {
    return jsonResponse(
      { error: "Unauthorized", hint: "Use ?secret=YOUR_SECRET" },
      401
    );
  }

  try {
    const data = await readFromGist("city-council.json");
    const meetings = data?.meetings || [];

    const ics = generateICS(meetings, "Test");

    return jsonResponse({
      gistUrl: getGistRawUrl("city-council.json"),
      meetingCount: meetings.length,
      firstMeeting: meetings[0],
      icsPreview: ics.substring(0, 1500)
    });
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}
