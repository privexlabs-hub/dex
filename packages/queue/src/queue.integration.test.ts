import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRedis } from './connection.js';
import { QUEUES, systemJobs } from './contracts.js';
import { createQueue, createQueueEvents } from './queue.js';
import { createWorker } from './worker.js';

const url = process.env.REDIS_URL;
const run = url ? describe : describe.skip;

run('BullMQ round trip', () => {
  const redis = createRedis(url ?? '', 'test');
  const q = createQueue(QUEUES.system, redis, systemJobs.ping);
  const events = createQueueEvents(QUEUES.system, redis);
  const worker = createWorker({
    name: QUEUES.system,
    connection: createRedis(url ?? '', 'test-worker'),
    schema: systemJobs.ping,
    handlers: { ping: async (job) => ({ echoed: job.data.echo ?? null }) },
  });

  beforeAll(async () => {
    await events.waitUntilReady();
    await worker.waitUntilReady();
  });
  afterAll(async () => {
    await worker.close();
    await events.close();
    await q.queue.close();
    await redis.quit();
  });

  it('processes a validated job and coalesces duplicates by idempotency key', async () => {
    const key = `ping-${Date.now()}`;
    const payload = {
      kind: 'ping' as const,
      orgId: 'org',
      actorId: 'sys',
      requestId: 'r1',
      idempotencyKey: key,
      echo: 'hello',
    };
    const id1 = await q.enqueue('ping', payload);
    const id2 = await q.enqueue('ping', payload);
    expect(id1).toBe(id2);
    const job = await q.queue.getJob(id1);
    const result = await job?.waitUntilFinished(events, 15_000);
    expect(result).toEqual({ echoed: 'hello' });
  });
});
