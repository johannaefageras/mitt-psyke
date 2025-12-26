const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';
const SUPPORT_LINES_PATH = '/api/v1/support-lines/';
const supportLineCatsData = require('./supportLineCatsData.json');

// Build icon map from categories data
const CATEGORY_ICONS = supportLineCatsData.reduce((acc, cat) => {
  acc[cat.slug] = cat.icon;
  return acc;
}, { default: 'phone' });

async function fetchSupportData() {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch is not available. Use Node 18+ or provide a fetch polyfill.');
  }

  const baseUrl = process.env.MITTPSYKE_API_BASE_URL || DEFAULT_API_BASE_URL;
  const url = new URL(SUPPORT_LINES_PATH, baseUrl).toString();
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
    throw new Error(`Failed to fetch support lines from ${url}: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeCategory(category) {
  if (!category) return '';
  if (category === 'psykiskohalsa') return 'psykiskohalsa';
  return category;
}

function normalizeTags(tags) {
  const normalized = new Set((tags ?? []).filter(Boolean));

  if (normalized.has('vald')) normalized.add('valdbrott');
  if (normalized.has('sorg') || normalized.has('trauma')) normalized.add('sorgtrauma');
  if (normalized.has('psykiskhalsa')) {
    normalized.delete('psykiskhalsa');
    normalized.add('psykiskohalsa');
  }
  if (normalized.has('psykisk-ohalsa')) {
    normalized.delete('psykisk-ohalsa');
    normalized.add('psykiskohalsa');
  }

  return Array.from(normalized);
}

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS['default'];
}

module.exports = async () => {
  let data;
  try {
    data = await fetchSupportData();
  } catch (error) {
    console.warn(`[supportlines] ${error.message}`);
    console.warn('[supportlines] Returning empty array - start backend for real data.');
    return [];
  }

  return (data ?? [])
    .filter((item) => item && item.active !== false)
    .map((item) => {
      const category = normalizeCategory(item.category);
      return {
        id: item.id,
        name: item.title,
        url: item.resource?.url,
        number: item.phone,
        description: item.description,
        category: category,
        icon: getCategoryIcon(category),
        available: item.availability?.label ?? '',
        urgent: Boolean(item.urgent),
        tags: normalizeTags(item.tags),
        contactTypes: item.contactTypes ?? [],
        lastVerified: item.lastVerified,
        // Include opening hours for client-side status calculation
        openingHours: item.availability?.openingHours ?? []
      };
    });
};
