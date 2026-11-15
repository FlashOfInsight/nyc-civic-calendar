// Cloudflare Pages Function — /api/health
// The scraper's own report card, written on every daily run (lib/health.js):
// which boards and agencies are delivering real data, which are on estimated
// dates, and any open notices. `stale` is true when the daily run itself has
// stopped — the one failure the scraper can't report about itself.

import { readFromGist } from "../../lib/gist-storage.js";

export async function onRequest(context) {
  for (const [k, v] of Object.entries(context.env || {})) {
    if (typeof v === "string") process.env[k] = v;
  }

  const health = await readFromGist("health.json");
  if (!health) {
    return Response.json({ error: "No health report yet" }, { status: 503 });
  }

  const ageHours = (Date.now() - Date.parse(health.updatedAt)) / 3600000;
  const stale = !(ageHours < 36);
  const brief = new URL(context.request.url).searchParams.has("brief");

  const body = {
    stale,
    ageHours: Math.round(ageHours * 10) / 10,
    updatedAt: health.updatedAt,
    summary: health.summary,
    notices: Object.values(health.notices || {}).map((n) => ({ since: n.since, message: n.message })),
    ...(brief ? {} : { dropped: health.dropped, groups: health.groups })
  };

  // 503 when stale so an uptime monitor pointed here alerts without parsing JSON
  return Response.json(body, {
    status: stale ? 503 : 200,
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" }
  });
}
