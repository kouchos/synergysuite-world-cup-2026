/**
 * Tiny localStorage cache with per-entry TTL + stale-while-revalidate.
 * Safe to call from SSR/non-browser contexts (returns null / no-ops).
 */
const PREFIX = 'wc2026:';

function hasStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.setItem('__wc2026probe__', '1');
    window.localStorage.removeItem('__wc2026probe__');
    return true;
  } catch {
    return false;
  }
}

function read(key) {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, entry) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // quota or serialisation issue — non-fatal
  }
}

function ageMs(entry) {
  return Date.now() - (entry?.fetchedAt ?? 0);
}

/**
 * Stale-while-revalidate fetch wrapper. Always resolves with the freshest value
 * we can produce: cache hit within ttl, then a network fetch, then any stale
 * cached value on failure. Never throws — returns { value, source, error }.
 */
export async function swr(key, fetcher, ttlMs) {
  const cached = read(key);
  if (cached && ageMs(cached) < ttlMs) {
    return { value: cached.value, source: 'cache', error: null };
  }
  try {
    const value = await fetcher();
    write(key, { value, fetchedAt: Date.now() });
    return { value, source: 'network', error: null };
  } catch (error) {
    if (cached) {
      return { value: cached.value, source: 'stale', error };
    }
    return { value: null, source: 'none', error };
  }
}

export function purge() {
  if (!hasStorage()) return;
  const toRemove = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(PREFIX)) toRemove.push(k);
  }
  for (const k of toRemove) window.localStorage.removeItem(k);
}
