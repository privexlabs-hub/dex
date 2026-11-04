import { Redis } from 'ioredis';

export type { Redis };

/**
 * One Redis connection factory for the whole process. BullMQ blocking
 * workers require `maxRetriesPerRequest: null`; enableReadyCheck=false avoids
 * startup races behind managed proxies.
 */
export function createRedis(url: string, name = 'dex'): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectionName: name,
    lazyConnect: false,
  });
}

export async function checkRedis(redis: Redis): Promise<{ ok: true; latencyMs: number }> {
  const start = performance.now();
  const pong = await redis.ping();
  if (pong !== 'PONG') throw new Error(`unexpected PING reply: ${String(pong)}`);
  return { ok: true, latencyMs: Math.round(performance.now() - start) };
}
