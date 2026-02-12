// Server-side in-memory TTL cache for BFF proxy routes.

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  return null;
}

export function setCache(key: string, data: unknown, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// Returns data even if expired — used for stale-data fallback when API is down.
export function getStaleCacheEntry<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function clearCache(): void {
  cache.clear();
}
