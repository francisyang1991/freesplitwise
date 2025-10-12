// IndexedDB cache utility for offline support
const DB_NAME = "SplitNinjaCache";
const DB_VERSION = 1;
const STORE_NAME = "expenses";

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  expiry: number;
}

class CacheManager {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  async set(key: string, data: any, ttlMinutes: number = 60): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMinutes * 60 * 1000,
    };

    const transaction = this.db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await store.put(entry);
  }

  async get(key: string): Promise<any | null> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result;
        if (!entry) {
          resolve(null);
          return;
        }

        if (Date.now() > entry.expiry) {
          // Entry expired, remove it
          this.delete(key);
          resolve(null);
          return;
        }

        resolve(entry.data);
      };
    });
  }

  async delete(key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(key);
  }

  async clear(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await store.clear();
  }

  async cleanup(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error("Database not initialized");

    const transaction = this.db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("timestamp");
    const request = index.openCursor();

    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          resolve();
          return;
        }

        const entry: CacheEntry = cursor.value;
        if (Date.now() > entry.expiry) {
          cursor.delete();
        }
        cursor.continue();
      };
    });
  }
}

export const cacheManager = new CacheManager();

// LocalStorage fallback for simple data
export const localStorageCache = {
  set(key: string, data: any, ttlMinutes: number = 60): void {
    if (typeof window === "undefined") return;
    
    const entry = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMinutes * 60 * 1000,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  },

  get(key: string): any | null {
    if (typeof window === "undefined") return null;
    
    const item = localStorage.getItem(key);
    if (!item) return null;

    try {
      const entry = JSON.parse(item);
      if (Date.now() > entry.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return entry.data;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  },

  delete(key: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.clear();
  },
};
