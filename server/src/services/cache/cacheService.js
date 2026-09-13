const { getRedisClient, isRedisReady } = require('./redis');
const { TTL } = require('./cacheKeys');

// In-flight Promise deduplication registry (Single-Flight pattern)
// Prevents multiple concurrent requests in the same process from duplicating expensive operations
const inFlightRequests = new Map();

/**
 * Core Cache Service providing fail-safe Cache-Aside operations.
 */
class CacheService {
  constructor(customClient = null) {
    this._customClient = customClient;
  }

  getClient() {
    return this._customClient || getRedisClient();
  }

  isReady() {
    if (this._customClient) {
      if (typeof this._customClient.isReady === 'function') return this._customClient.isReady();
      if (typeof this._customClient.isConnected === 'function') return this._customClient.isConnected();
      return true;
    }
    return isRedisReady();
  }

  /**
   * Retrieves a cached value from Redis.
   * Returns null if key is not found, expired, or if Redis is unreachable.
   */
  async get(key) {
    if (!this.isReady()) {
      return null;
    }

    try {
      const client = this.getClient();
      const raw = await client.get(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (err) {
      // Fail-open: Redis read error does not fail the caller
      return null;
    }
  }

  /**
   * Stores a value in Redis with a TTL in seconds.
   */
  async set(key, value, ttlSeconds = TTL.JOB_DETAILS) {
    if (!this.isReady() || value === undefined || value === null) {
      return false;
    }

    try {
      const client = this.getClient();
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch (err) {
      // Fail-open: Redis write error is non-fatal
      return false;
    }
  }

  /**
   * Deletes a single key from Redis.
   */
  async del(key) {
    if (!this.isReady()) return false;

    try {
      const client = this.getClient();
      await client.del(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Invalidates multiple keys matching a glob pattern using non-blocking SCAN.
   */
  async delPattern(pattern) {
    if (!this.isReady()) return false;

    try {
      const client = this.getClient();
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Acquires an atomic distributed lock for stampede protection.
   */
  async acquireLock(lockKey, ttlSeconds = TTL.LOCK) {
    if (!this.isReady()) return null;

    try {
      const client = this.getClient();
      const lockId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const acquired = await client.set(lockKey, lockId, 'NX', 'EX', ttlSeconds);
      return acquired === 'OK' ? lockId : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Releases an acquired distributed lock safely.
   */
  async releaseLock(lockKey, lockId) {
    if (!this.isReady() || !lockId) return false;

    try {
      const client = this.getClient();
      // Lua script to safely release only if value matches lockId
      const lua = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await client.eval(lua, 1, lockKey, lockId);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * High-Level Cache-Aside Pattern with Single-Flight Stampede Protection.
   *
   * Flow:
   * 1. Query Redis. If HIT, return immediately.
   * 2. If MISS, check if the same key is already being fetched by an in-flight promise.
   *    If so, await that exact promise (Single-Flight).
   * 3. Otherwise, execute fetcherFn, store result in Redis, and return.
   *
   * @param {string} key Cache key
   * @param {number} ttlSeconds Expiration in seconds
   * @param {Function} fetcherFn Async function returning fresh data on cache miss
   * @param {Object} options Configuration { deduplicate: boolean }
   */
  async remember(key, ttlSeconds, fetcherFn, options = { deduplicate: true }) {
    // 1. Try Redis Cache HIT
    const cached = await this.get(key);
    if (cached !== null) {
      return { data: cached, cached: true, source: 'redis' };
    }

    // 2. Cache MISS: Check for in-flight single-flight execution
    if (options.deduplicate && inFlightRequests.has(key)) {
      try {
        const result = await inFlightRequests.get(key);
        return { data: result, cached: true, source: 'in-flight-dedup' };
      } catch (err) {
        // Fallback to direct execution if in-flight failed
      }
    }

    // 3. Create execution promise
    const executionPromise = (async () => {
      const result = await fetcherFn();
      if (result !== undefined && result !== null) {
        await this.set(key, result, ttlSeconds);
      }
      return result;
    })();

    if (options.deduplicate) {
      inFlightRequests.set(key, executionPromise);
    }

    try {
      const data = await executionPromise;
      return { data, cached: false, source: 'fetcher' };
    } finally {
      if (options.deduplicate) {
        inFlightRequests.delete(key);
      }
    }
  }

  /**
   * Pings Redis to confirm live responsiveness.
   */
  async ping() {
    if (!this.isReady()) return false;
    try {
      const client = this.getClient();
      if (typeof client.ping === 'function') {
        const res = await client.ping();
        return res === 'PONG' || res === true;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scans and returns all keys matching a pattern without blocking Redis.
   */
  async keys(pattern = '*') {
    if (!this.isReady()) return [];
    try {
      const client = this.getClient();
      const matched = [];
      let cursor = '0';
      do {
        const [nextCursor, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (batch && batch.length > 0) {
          matched.push(...batch);
        }
      } while (cursor !== '0');
      return matched;
    } catch {
      return [];
    }
  }

  /**
   * Clears all cached keys matching a namespace or flushes DB (use with caution).
   */
  async flush(pattern = null) {
    if (!this.isReady()) return false;
    try {
      if (pattern) {
        return await this.delPattern(pattern);
      }
      const client = this.getClient();
      if (typeof client.flushdb === 'function') {
        await client.flushdb();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

const cacheService = new CacheService();

module.exports = {
  cacheService,
  CacheService,
};

