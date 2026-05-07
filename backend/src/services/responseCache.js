const store = new Map();

function now() {
  return Date.now();
}

function sweepExpired() {
  const ts = now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= ts) {
      store.delete(key);
    }
  }
}

function makeCacheKey(prefix, parts = {}) {
  const sorted = Object.keys(parts)
    .sort()
    .reduce((acc, key) => {
      const value = parts[key];
      if (value !== undefined && value !== null && value !== "") {
        acc[key] = value;
      }
      return acc;
    }, {});
  return `${prefix}:${JSON.stringify(sorted)}`;
}

function getCached(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs) {
  store.set(key, {
    value,
    expiresAt: now() + Math.max(1, ttlMs),
  });
}

async function getOrSet({ key, ttlMs, producer }) {
  const cached = getCached(key);
  if (cached) return cached;
  const fresh = await producer();
  setCached(key, fresh, ttlMs);
  if (store.size > 2000) sweepExpired();
  return fresh;
}

module.exports = {
  makeCacheKey,
  getCached,
  setCached,
  getOrSet,
};
