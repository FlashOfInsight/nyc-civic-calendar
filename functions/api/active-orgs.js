// Cloudflare Pages Function — /api/active-orgs
// Returns the list of organizations that currently have upcoming meetings.
// Used by the frontend to hide committees with no scheduled events.

import { readFromGist } from "../../lib/gist-storage.js";

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      ...extraHeaders
    }
  });
}

export async function onRequest(context) {
  for (const [k, v] of Object.entries(context.env || {})) {
    if (typeof v === "string") process.env[k] = v;
  }

  if (context.request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const data = await readFromGist("active-orgs.json");

    if (!data) {
      return jsonResponse({
        activeOrgs: [],
        lastUpdated: null,
        message: "No active orgs data yet. Run the cron job to generate."
      });
    }

    return jsonResponse({
      activeOrgs: data.activeOrgs || [],
      lastUpdated: data.lastUpdated || null
    });
  } catch (err) {
    console.error("Error fetching active orgs:", err);
    return jsonResponse(
      { error: "Failed to fetch active orgs", message: err.message },
      500
    );
  }
}
