const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';
const HOTLINES_PATH = '/api/v1/hotlines/';

async function fetchHotlines() {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch is not available. Use Node 18+ or provide a fetch polyfill.');
  }

  const baseUrl = process.env.MITTPSYKE_API_BASE_URL || DEFAULT_API_BASE_URL;
  const url = new URL(HOTLINES_PATH, baseUrl).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) throw new Error(`API request failed: ${response.status}`);

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('API response is not an array.');
    }
    return data;
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    throw new Error(`Failed to fetch hotlines from ${url}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async () => {
  return fetchHotlines();
};
