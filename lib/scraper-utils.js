// Shared helpers used across lib/scrapers/*.js: HTTP fetch with redirect
// handling, and the month/weekday-arithmetic helpers pattern-based scrapers
// need to turn "2nd Tuesday" style schedules into concrete dates.

const https = require("https");
const http = require("http");

const DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; NYCCivicCalendar/1.0)";

/**
 * Fetch a URL as text, following redirects (default up to 5) and enforcing
 * a 15s timeout. Always drains the response body — including on non-2xx —
 * so sockets aren't left dangling, and includes a snippet of it in the
 * rejection message to make failures easier to diagnose.
 * @param {string} url
 * @param {Object} [opts]
 * @param {number} [opts.maxRedirects]
 * @param {Object} [opts.headers] - Merged over the default User-Agent header
 */
function fetchHTML(url, { maxRedirects = 5, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      reject(new Error(`Too many redirects for ${url}`));
      return;
    }

    const protocol = url.startsWith("https") ? https : http;
    const options = {
      headers: { "User-Agent": DEFAULT_USER_AGENT, ...headers },
      timeout: 15000
    };

    const req = protocol.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith("/")) {
          const urlObj = new URL(url);
          redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
        }
        fetchHTML(redirectUrl, { maxRedirects: maxRedirects - 1, headers }).then(resolve).catch(reject);
        return;
      }

      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url.split("?")[0]}: ${data.slice(0, 200)}`));
          return;
        }
        resolve(data);
      });
    }).on("error", reject);

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Request timed out for ${url}`));
    });
  });
}

/**
 * Parse a month name (full or abbreviated, case-insensitive) to a 0-indexed
 * month number. Returns -1 if unrecognized.
 */
function parseMonth(monthName) {
  const months = {
    "january": 0, "jan": 0, "february": 1, "feb": 1, "march": 2, "mar": 2,
    "april": 3, "apr": 3, "may": 4, "june": 5, "jun": 5, "july": 6, "jul": 6,
    "august": 7, "aug": 7, "september": 8, "sep": 8, "sept": 8,
    "october": 9, "oct": 9, "november": 10, "nov": 10, "december": 11, "dec": 11
  };
  return months[monthName.toLowerCase()] ?? -1;
}

/**
 * Format a date as YYYY-MM-DD.
 * @param {number} year
 * @param {number} month - 0-indexed (JS Date convention)
 * @param {number} day
 */
function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get the Nth occurrence of a weekday in a month.
 * @param {number} year
 * @param {number} month - 0-indexed
 * @param {number} dayOfWeek - 0=Sunday .. 6=Saturday
 * @param {number} n - 1st, 2nd, 3rd, 4th; pass -1 for the last occurrence
 * @returns {Date|null} - null if the Nth occurrence doesn't exist in the month
 */
function getNthWeekday(year, month, dayOfWeek, n) {
  if (n === -1) {
    const lastDay = new Date(year, month + 1, 0);
    let day = lastDay.getDate();
    while (new Date(year, month, day).getDay() !== dayOfWeek) {
      day--;
    }
    return new Date(year, month, day);
  }

  const firstOfMonth = new Date(year, month, 1);
  const firstOccurrence = 1 + ((dayOfWeek - firstOfMonth.getDay() + 7) % 7);
  const targetDay = firstOccurrence + (n - 1) * 7;

  const result = new Date(year, month, targetDay);
  if (result.getMonth() !== month) return null;
  return result;
}

/**
 * Check whether a date falls within the standard scraping window: one month
 * in the past through six months in the future.
 * @param {Date|string} date - A Date, or a string parseable by `new Date()`
 */
function isInRange(date) {
  const d = date instanceof Date ? date : new Date(date);
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const sixMonthsLater = new Date();
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

  return d >= oneMonthAgo && d <= sixMonthsLater;
}

module.exports = { fetchHTML, parseMonth, formatDate, getNthWeekday, isInRange };
