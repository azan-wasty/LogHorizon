// API client for LogHorizon backend

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

function getToken() {
  return localStorage.getItem('lh_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  } else if (headers['Content-Type'] === undefined) {
    delete headers['Content-Type'];
  }

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
  update: (body) => request('/me', { method: 'PUT', body: JSON.stringify(body) }),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return request('/upload-avatar', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': undefined },
    });
  },
};

// ── Preferences ──────────────────────────────────
export const preferences = {
  getOptions: () => request('/preferences/options'),
  getMine: () => request('/preferences/me'),
  set: (ids) => request('/preferences', { method: 'POST', body: JSON.stringify({ preferenceOptionIds: ids }) }),
  seed: () => request('/preferences/seed', { method: 'POST' }),
};

// ── Recommendations ────────────────────────────────
export const recommendations = {
  get: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/recommendations${qs ? `?${qs}` : ''}`);
  },
  stats: () => request('/recommendations/stats'),
};

// ── Content (public) ─────────────────────────────
export const content = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/content${qs ? `?${qs}` : ''}`);
  },
  get: (id) => request(`/content/${id}`),
  getSources: (id) => request(`/content/${id}/sources`),
};

// ── Reviews ──────────────────────────────────────
export const reviews = {
  get: (contentId) => request(`/reviews/content/${contentId}`),
  add: (body) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Tags (public) ────────────────────────────────
export const tags = {
  list: () => request('/tags'),
};

// ── Admin ─────────────────────────────────────────
export const admin = {
  listContent: () => request('/admin/content'),
  getContent: (id) => request(`/admin/content/${id}`),
  createContent: (body) => request('/admin/content', { method: 'POST', body: JSON.stringify(body) }),
  ingestContent: (body) => request('/admin/content/ingest', { method: 'POST', body: JSON.stringify(body) }),
  discoverContent: (body) => request('/admin/content/discover', { method: 'POST', body: JSON.stringify(body) }),
  updateContent: (id, body) => request(`/admin/content/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteContent: (id) => request(`/admin/content/${id}`, { method: 'DELETE' }),
  listTags: () => request('/admin/tags'),
  createTag: (body) => request('/admin/tags', { method: 'POST', body: JSON.stringify(body) }),
  updateTag: (id, body) => request(`/admin/tags/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTag: (id) => request(`/admin/tags/${id}`, { method: 'DELETE' }),
  listUsers: () => request('/admin/users'),
  updateUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  listDiscordRecommendations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/discord-recommendations${qs ? `?${qs}` : ''}`);
  },
  updateDiscordRecommendation: (id, status) => request(`/admin/discord-recommendations/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  // Events admin
  listPendingEvents: () => request('/events/pending'),
  approveEvent: (id, approval) => request(`/events/${id}/approve`, { method: 'PUT', body: JSON.stringify({ approval }) }),
  listSubredditRecommendations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/subreddit-recommendations/admin${qs ? `?${qs}` : ''}`);
  },
  updateSubredditRecommendation: (id, status) => request(`/subreddit-recommendations/admin/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
};

// ── Library ──────────────────────────────────────
export const library = {
  get: () => request('/library'),
  update: (body) => request('/library/update', { method: 'POST', body: JSON.stringify(body) }),
  markAllCompleted: (contentId) => request('/library/mark-all-completed', { method: 'POST', body: JSON.stringify({ contentId }) }),
  remove: (contentId) => request(`/library/${contentId}`, { method: 'DELETE' }),
};

export const discord = {
  recommend: (body) => request('/discord-recommendations', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Subreddit ────────────────────────────────────
export const subreddit = {
  recommend: (body) => request('/subreddit-recommendations', { method: 'POST', body: JSON.stringify(body) }),
};

// ── Users (Community) ─────────────────────────────
export const users = {
  search: (q) => {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return request(`/users/search${qs}`);
  },
  profile: (id) => request(`/users/${id}/profile`),
  favourites: (id) => request(`/users/${id}/favourites`),
};

// ── Events (Community) ────────────────────────────
export const events = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/events${qs ? `?${qs}` : ''}`);
  },
  create: (body) => request('/events', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) => request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id) => request(`/events/${id}`, { method: 'DELETE' }),
};

// ── Favourites ───────────────────────────────────
export const favourites = {
  get: () => request('/favourites'),
  add: (contentId) => request('/favourites', { method: 'POST', body: JSON.stringify({ contentId }) }),
  remove: (contentId) => request(`/favourites/${contentId}`, { method: 'DELETE' }),
};

export default { auth, me, preferences, recommendations, content, tags, admin, library, discord, subreddit, users, events, favourites, reviews };