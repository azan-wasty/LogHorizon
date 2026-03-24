// API client for LogHorizon backend (port 6767)

const BASE = '/api';

function getToken() {
  return localStorage.getItem('lh_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data?.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ── Auth ──────────────────────────────────────────
export const auth = {
  register: (body) => request('/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/login', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Me ───────────────────────────────────────────
export const me = {
  get: () => request('/me'),
};

// ── Preferences ──────────────────────────────────
export const preferences = {
  getOptions: () => request('/preferences/options'),
  getMine: () => request('/preferences/me'),
  set: (ids) => request('/preferences', { method: 'POST', body: JSON.stringify({ preferenceOptionIds: ids }) }),
  seed: () => request('/preferences/seed', { method: 'POST' }),
};

// ── Content (public) ─────────────────────────────
export const content = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/content${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/content/${id}`),
};

// ── Tags (public) ────────────────────────────────
export const tags = {
  list: () => request('/tags'),
};

// ── Admin ─────────────────────────────────────────
export const admin = {
  // Content
  listContent: () => request('/admin/content'),
  getContent: (id) => request(`/admin/content/${id}`),
  createContent: (body) => request('/admin/content', { method: 'POST', body: JSON.stringify(body) }),
  ingestContent: (body) => request('/admin/content/ingest', { method: 'POST', body: JSON.stringify(body) }),
  updateContent: (id, body) => request(`/admin/content/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContent: (id) => request(`/admin/content/${id}`, { method: 'DELETE' }),

  // Tags
  listTags: () => request('/admin/tags'),
  createTag: (body) => request('/admin/tags', { method: 'POST', body: JSON.stringify(body) }),
  updateTag: (id, body) => request(`/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTag: (id) => request(`/admin/tags/${id}`, { method: 'DELETE' }),
};

export default { auth, me, preferences, content, tags, admin };
