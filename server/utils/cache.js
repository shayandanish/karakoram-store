/**
 * cache.js — Hybrid Redis + in-memory cache for low-latency API responses.
 *
 * Tries Redis first (if REDIS_URL is configured). Falls back to an in-memory
 * Map so the app works without Redis in development or when Redis is down.
 *
 * All TTLs are in seconds.
 */

import Redis from 'ioredis';

let redis = null;
let redisAvailable = false;

// ── In-memory fallback ──────────────────────────────────────────────────
const memoryCache = new Map();
const memoryTimers = new Map();

const memoryGet = (key) => {
  const entry = memoryCache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.value;
};

const memorySet = (key, value, ttlSeconds) => {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  if (memoryTimers.has(key)) clearTimeout(memoryTimers.get(key));
  const timer = setTimeout(() => {
    memoryCache.delete(key);
    memoryTimers.delete(key);
  }, ttlSeconds * 1000);
  memoryTimers.set(key, timer);
};

const memoryDel = (key) => {
  memoryCache.delete(key);
  if (memoryTimers.has(key)) {
    clearTimeout(memoryTimers.get(key));
    memoryTimers.delete(key);
  }
};

const memoryFlush = () => {
  memoryCache.clear();
  memoryTimers.forEach((t) => clearTimeout(t));
  memoryTimers.clear();
};

const memoryDelByPrefix = (prefix) => {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
      if (memoryTimers.has(key)) {
        clearTimeout(memoryTimers.get(key));
        memoryTimers.delete(key);
      }
    }
  }
};

// ── Redis (lazy init) ───────────────────────────────────────────────────
const initRedis = async () => {
  if (!process.env.REDIS_URL) return false;
  if (redis) return redisAvailable;

  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    await redis.connect();
    redisAvailable = true;
    console.log('[Cache] Redis connected');
    return true;
  } catch (err) {
    redisAvailable = false;
    redis = null;
    console.log('[Cache] Redis unavailable, using in-memory fallback');
    return false;
  }
};

export const getCache = async (key) => {
  if (redisAvailable && redis) {
    try {
      const val = await redis.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      // fall through to memory
    }
  }
  return memoryGet(key) ?? null;
};

export const setCache = async (key, value, ttlSeconds = 60) => {
  const serialized = JSON.stringify(value);
  if (redisAvailable && redis) {
    try {
      await redis.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch {
      // fall through to memory
    }
  }
  memorySet(key, value, ttlSeconds);
};

export const delCache = async (key) => {
  if (redisAvailable && redis) {
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }
  memoryDel(key);
};

export const delCacheByPrefix = async (prefix) => {
  if (redisAvailable && redis) {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // ignore
    }
  }
  memoryDelByPrefix(prefix);
};

export const flushCache = async () => {
  if (redisAvailable && redis) {
    try {
      await redis.flushall();
    } catch {
      // ignore
    }
  }
  memoryFlush();
};

export const initCache = () => {
  initRedis().catch(() => {
    // Redis optional; in-memory fallback handles it
  });
};

export const isCacheRedis = () => redisAvailable;

export const setPublicCache = (res, maxAge = 60, staleWhileRevalidate = 300) => {
  if (process.env.NODE_ENV === 'development') {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return;
  }
  res.set(
    'Cache-Control',
    `public, max-age=${maxAge}, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
  );
};

export default {
  get: getCache,
  set: setCache,
  del: delCache,
  delByPrefix: delCacheByPrefix,
  flush: flushCache,
  init: initCache,
  isRedis: isCacheRedis,
  setPublicCache,
};
