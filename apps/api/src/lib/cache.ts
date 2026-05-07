import Redis from 'ioredis'

let client: Redis | null = null

export function getCache(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!client) {
    client = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 })
    client.on('error', () => { /* silencia erros de cache — não deve derrubar a API */ })
  }
  return client
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const cache = getCache()
    if (!cache) return null
    const val = await cache.get(key)
    return val ? (JSON.parse(val) as T) : null
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  try {
    const cache = getCache()
    if (!cache) return
    await cache.setex(key, ttlSeconds, JSON.stringify(value))
  } catch { /* silencia */ }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    const cache = getCache()
    if (!cache) return
    await cache.del(...keys)
  } catch { /* silencia */ }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    const cache = getCache()
    if (!cache) return
    const keys = await cache.keys(pattern)
    if (keys.length > 0) await cache.del(...keys)
  } catch { /* silencia */ }
}
