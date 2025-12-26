(function () {
  const DEFAULT_API_BASE_URL = window.location.origin;
  const API_BASE_URL = window.MITTPSYKE_API_BASE_URL || DEFAULT_API_BASE_URL;

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  async function ensureCsrfToken(force) {
    if (!force && getCookie('csrftoken')) return;
    await fetch(API_BASE_URL + '/api/v1/csrf/', {
      credentials: 'include',
    });
  }

  async function apiFetch(path, options) {
    const config = options ? { ...options } : {};
    const method = (config.method || 'GET').toUpperCase();
    const headers = { ...(config.headers || {}) };
    const isFormData = typeof FormData !== 'undefined' && config.body instanceof FormData;
    const bodyIsObject = config.body && typeof config.body === 'object' && !isFormData;

    if (bodyIsObject) {
      headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(config.body);
    }

    if (method !== 'GET') {
      await ensureCsrfToken();
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }
    }

    const url = path.startsWith('http') ? path : API_BASE_URL + path;
    const response = await fetch(url, {
      credentials: 'include',
      ...config,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(payload.detail || 'Request failed.');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  window.MittPsykeApi = {
    baseUrl: API_BASE_URL,
    apiFetch,
    ensureCsrfToken,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      ensureCsrfToken(true);
    });
  } else {
    ensureCsrfToken(true);
  }
})();
