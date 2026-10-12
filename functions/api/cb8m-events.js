// Cloudflare Pages Function — /api/cb8m-events
// Relays Manhattan CB8's Tribe Events REST feed for the daily scraper.
// cb8m.com sits behind Cloudflare bot protection that serves a "Just a moment..."
// challenge to GitHub Actions runner IPs, so the scraper can't fetch it directly.
//
// Fixed upstream URL; only `start_date` (YYYY-MM-DD) and `page` (1-5) pass through,
// so this can't be used as a general proxy. The feed is public, so no auth.

const UPSTREAM = "https://www.cb8m.com/wp-json/tribe/events/v1/events";

export async function onRequest(context) {
  const params = new URL(context.request.url).searchParams;
  const startDate = params.get("start_date") || "";
  const page = params.get("page") || "1";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^[1-5]$/.test(page)) {
    return new Response(JSON.stringify({ error: "start_date=YYYY-MM-DD and page=1-5 required" }), {
      status: 400,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }

  const upstream = await fetch(`${UPSTREAM}?per_page=100&start_date=${startDate}&page=${page}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      "Accept": "application/json"
    },
    // Cache successes only — a cached challenge page would be served for an hour
    cf: { cacheEverything: true, cacheTtlByStatus: { "200-299": 3600, "300-599": 0 } }
  });

  // Pass the upstream status through so the scraper sees a 403 as a failure
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8" }
  });
}
