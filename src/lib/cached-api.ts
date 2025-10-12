import { cacheManager, localStorageCache } from "./cache";

interface ApiOptions {
  useCache?: boolean;
  cacheTTL?: number; // in minutes
  cacheKey?: string;
}

export class CachedApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  async get<T>(url: string, options: ApiOptions = {}): Promise<T> {
    const { useCache = true, cacheTTL = 60, cacheKey } = options;
    const fullUrl = `${this.baseUrl}${url}`;
    const key = cacheKey || `api:${fullUrl}`;

    // Try cache first
    if (useCache) {
      try {
        const cached = await cacheManager.get(key);
        if (cached) {
          return cached as T;
        }
      } catch (error) {
        console.warn("Cache read failed:", error);
      }
    }

    // Fetch from API
    const response = await fetch(fullUrl);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Cache the result
    if (useCache) {
      try {
        await cacheManager.set(key, data, cacheTTL);
      } catch (error) {
        console.warn("Cache write failed:", error);
      }
    }

    return data;
  }

  async post<T>(url: string, body: unknown, options: ApiOptions = {}): Promise<T> {
    const { cacheKey } = options;
    const fullUrl = `${this.baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Invalidate related cache entries
    if (cacheKey) {
      try {
        await cacheManager.delete(cacheKey);
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }
    }

    return data;
  }

  async put<T>(url: string, body: unknown, options: ApiOptions = {}): Promise<T> {
    const { cacheKey } = options;
    const fullUrl = `${this.baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Invalidate related cache entries
    if (cacheKey) {
      try {
        await cacheManager.delete(cacheKey);
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }
    }

    return data;
  }

  async delete<T>(url: string, options: ApiOptions = {}): Promise<T> {
    const { cacheKey } = options;
    const fullUrl = `${this.baseUrl}${url}`;

    const response = await fetch(fullUrl, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Invalidate related cache entries
    if (cacheKey) {
      try {
        await cacheManager.delete(cacheKey);
      } catch (error) {
        console.warn("Cache invalidation failed:", error);
      }
    }

    return data;
  }

  // Clear all cache
  async clearCache(): Promise<void> {
    try {
      await cacheManager.clear();
      localStorageCache.clear();
    } catch (error) {
      console.warn("Cache clear failed:", error);
    }
  }

  // Cleanup expired cache entries
  async cleanupCache(): Promise<void> {
    try {
      await cacheManager.cleanup();
    } catch (error) {
      console.warn("Cache cleanup failed:", error);
    }
  }
}

export const apiClient = new CachedApiClient();
