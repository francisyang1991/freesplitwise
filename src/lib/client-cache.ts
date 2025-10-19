type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const GLOBAL_CACHE_KEY = "__splitninja_client_cache__";

const getStore = () => {
  if (typeof window === "undefined") {
    return new Map<string, CacheEntry<unknown>>();
  }

  const globalAny = window as typeof window & {
    [GLOBAL_CACHE_KEY]?: Map<string, CacheEntry<unknown>>;
  };
  if (!globalAny[GLOBAL_CACHE_KEY]) {
    globalAny[GLOBAL_CACHE_KEY] = new Map();
  }
  return globalAny[GLOBAL_CACHE_KEY]!;
};

export const getCachedValue = <T>(key: string): T | null => {
  const store = getStore();
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
};

export const setCachedValue = <T>(key: string, value: T, ttlMs = 30_000) => {
  const store = getStore();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

export const invalidateCache = (predicate: (key: string) => boolean) => {
  const store = getStore();
  for (const key of store.keys()) {
    if (predicate(key)) {
      store.delete(key);
    }
  }
};
