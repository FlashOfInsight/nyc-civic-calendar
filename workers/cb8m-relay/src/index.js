// cb8m-relay — fetches Manhattan CB8's Tribe Events feed from a fixed Cloudflare location.
//
// Why: cb8m.com's Cloudflare bot check challenges GitHub Actions runners, and also
// challenges Workers/Pages Functions when they run in some colos (LAX: 403) but not
// others (EWR: 200). A Durable Object stays in the colo where it was first created,
// so we create one with locationHint "enam" and do the fetch from inside it.
// See BUGS.md #12.
//
//   GET /?start_date=YYYY-MM-DD&page=N[&node=NAME]   relay the feed (page 1-5)
//   GET /probe?node=NAME                              report that node's colo + cb8m status

const UPSTREAM = "https://www.cb8m.com/wp-json/tribe/events/v1/events";
const DEFAULT_NODE = "enam-1";

function json(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const node = url.searchParams.get("node") || DEFAULT_NODE;
    if (!/^[a-z0-9-]{1,20}$/.test(node)) return json({ error: "bad node" }, 400);

    let path;
    if (url.pathname === "/probe") {
      path = "/probe";
    } else if (url.pathname === "/") {
      const startDate = url.searchParams.get("start_date") || "";
      const page = url.searchParams.get("page") || "1";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^[1-5]$/.test(page)) {
        return json({ error: "start_date=YYYY-MM-DD and page=1-5 required" }, 400);
      }
      path = `/?start_date=${startDate}&page=${page}`;
    } else {
      return json({ error: "not found" }, 404);
    }

    const stub = env.RELAY.get(env.RELAY.idFromName(node), { locationHint: "enam" });
    return stub.fetch(`https://do${path}`);
  }
};

export class Cb8mRelay {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/probe") {
      const trace = await (await fetch("https://www.cb8m.com/cdn-cgi/trace")).text();
      const colo = (trace.match(/^colo=(\w+)/m) || [])[1];
      const r = await fetch(`${UPSTREAM}?per_page=1&start_date=2026-10-12`, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" }
      });
      await r.body?.cancel();
      return json({ colo, status: r.status, cfMitigated: r.headers.get("cf-mitigated") });
    }

    const upstream = await fetch(`${UPSTREAM}?per_page=100&start_date=${url.searchParams.get("start_date")}&page=${url.searchParams.get("page")}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json"
      }
    });
    // Pass the upstream status through so the scraper sees a challenge as a failure
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json; charset=utf-8" }
    });
  }
}
