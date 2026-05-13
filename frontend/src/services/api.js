const API_BASE = import.meta.env.VITE_API_URL || '';
const BASE = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api` : '/api';

export function getToken() {
  return localStorage.getItem('token');
}

export function getBaseUrl() {
  return API_BASE || '';
}

export const api = {
  async request(method, path, data = null, opts = {}) {
    const url = path.startsWith('http') ? path : `${BASE}${path}`;
    const fallbackUrl = !path.startsWith('http') && API_BASE ? `/api${path}` : null;
    const headers = { ...opts.headers };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    // Don't set Content-Type for FormData (browser sets with boundary)
    if (!(data instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = { method, headers, credentials: 'include', ...opts };
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    const doFetch = async (targetUrl) => {
      const response = await fetch(targetUrl, config);
      const text = await response.text();
      let body = null;
      try { body = text ? JSON.parse(text) : null; } catch (_) { /* ignore */ }
      if (!response.ok) {
        throw new Error(body?.message || response.statusText || 'Request failed');
      }
      return { data: body, status: response.status };
    };

    try {
      return await doFetch(url);
    } catch (err) {
      // If a direct backend URL is configured but unreachable, fall back to the Vite proxy path.
      if (fallbackUrl && String(err?.message || '').toLowerCase().includes('failed to fetch')) {
        return await doFetch(fallbackUrl);
      }
      throw err;
    }
  },
  get(path, opts) { return this.request('GET', path, null, opts); },
  post(path, data, opts) { return this.request('POST', path, data, opts); },
  put(path, data, opts) { return this.request('PUT', path, data, opts); },
  patch(path, data, opts) { return this.request('PATCH', path, data, opts); },
  delete(path, opts) { return this.request('DELETE', path, null, opts); },

  /** Upload a file via FormData */
  upload(path, file, fieldName = 'avatar') {
    const formData = new FormData();
    formData.append(fieldName, file);
    return this.post(path, formData);
  },
};

export default api;
