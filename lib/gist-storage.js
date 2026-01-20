// GitHub Gist storage helper for NYC Civic Calendar
// Replaces Vercel Blob to avoid operation limits

const GIST_ID = process.env.GIST_ID;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_USERNAME = "FlashOfInsight";

/**
 * Get the raw URL for a file in the Gist
 * Note: Raw URLs are cached by GitHub CDN, so we add a cache-buster for reads
 * @param {string} filename
 * @returns {string}
 */
function getGistRawUrl(filename) {
  return `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${GIST_ID}/raw/${filename}`;
}

/**
 * Read a JSON file from the Gist
 * @param {string} filename - e.g., "city-council.json"
 * @returns {Promise<object|null>}
 */
async function readFromGist(filename) {
  if (!GIST_ID) {
    console.error("GIST_ID environment variable not set");
    return null;
  }

  try {
    // Add cache-buster to avoid stale CDN responses
    const url = `${getGistRawUrl(filename)}?t=${Date.now()}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Gist file not found: ${filename}`);
        return null;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.error(`Error reading ${filename} from Gist:`, err.message);
    return null;
  }
}

/**
 * Write multiple files to the Gist in a single API call
 * @param {object} files - { "filename.json": { content: "..." }, ... }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function writeToGist(files) {
  if (!GIST_ID || !GITHUB_TOKEN) {
    const missing = [];
    if (!GIST_ID) missing.push("GIST_ID");
    if (!GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
    return { success: false, error: `Missing env vars: ${missing.join(", ")}` };
  }

  try {
    const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({ files })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    return { success: true };
  } catch (err) {
    console.error("Error writing to Gist:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Prepare a file for writing to Gist
 * @param {object} data - The data object to serialize
 * @returns {object} - { content: "..." } format for Gist API
 */
function prepareGistFile(data) {
  return { content: JSON.stringify(data, null, 2) };
}

module.exports = {
  readFromGist,
  writeToGist,
  prepareGistFile,
  getGistRawUrl,
  GIST_ID
};
