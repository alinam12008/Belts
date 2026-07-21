// Shared cache used by every serverless instance. Uses Upstash Redis (set up
// as a Vercel Marketplace integration -- Vercel's own KV product was retired
// in favor of it) when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are
// present. Otherwise falls back to a plain per-instance in-memory Map, same
// as before -- nothing breaks if the env vars aren't configured yet.
const { Redis } = require('@upstash/redis');

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('✅ Shared cache (Upstash Redis) configured -- all visitors share one cache.');
} else {
  console.log('ℹ️ Shared cache not configured (UPSTASH_REDIS_REST_URL/TOKEN missing) -- using per-instance memory cache.');
}

const memoryStore = new Map();

async function get(key) {
  if (redis) {
    try {
      const value = await redis.get(key);
      if (value !== null && value !== undefined) return value;
    } catch (err) {
      console.warn(`⚠️ Shared cache read failed for "${key}", falling back to memory:`, err.message);
    }
  }
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memoryStore.delete(key); return null; }
  return entry.value;
}

async function set(key, value, ttlSeconds) {
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.warn(`⚠️ Shared cache write failed for "${key}", memory fallback still set:`, err.message);
    }
  }
}

async function del(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const k of list) memoryStore.delete(k);
  if (redis) {
    try {
      await redis.del(...list);
    } catch (err) {
      console.warn('⚠️ Shared cache invalidation failed:', err.message);
    }
  }
}

module.exports = { get, set, del, isShared: !!redis };
