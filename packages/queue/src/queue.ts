import { Queue, QueueEvents, type JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import type { z } from 'zod';
import { QUEUES, type QueueName } from './contracts.js';

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 24 * 3600, count: 5_000 },
  removeOnFail: { age: 7 * 24 * 3600 },
};

export interface TypedQueue<S extends z.ZodType> {
  queue: Queue;
  /** Validate + enqueue. Uses the payload's idempotencyKey as jobId so duplicates coalesce. */
  enqueue(name: string, payload: z.input<S>, opts?: JobsOptions): Promise<string>;
}

export function createQueue<S extends z.ZodType<{ idempotencyKey: string }>>(
  name: QueueName,
  connection: Redis,
  schema: S,
): TypedQueue<S> {
  const queue = new Queue(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
  return {
    queue,
    async enqueue(jobName, payload, opts) {
      const data = schema.parse(payload);
      const job = await queue.add(jobName, data, { jobId: data.idempotencyKey, ...opts });
      return job.id ?? data.idempotencyKey;
    },
  };
}

export function createQueueEvents(name: QueueName, connection: Redis): QueueEvents {
  return new QueueEvents(name, { connection });
}

export async function getQueueCounts(connection: Redis) {
  const out: Record<string, Awaited<ReturnType<Queue['getJobCounts']>>> = {};
  for (const name of Object.values(QUEUES)) {
    const q = new Queue(name, { connection });
    out[name] = await q.getJobCounts(
      'waiting',
      'active',
      'delayed',
      'failed',
      'completed',
      'prioritized',
    );
    await q.close();
  }
  return out;
}
