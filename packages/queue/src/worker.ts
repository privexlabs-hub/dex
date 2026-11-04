import { UnrecoverableError, Worker, type Job, type WorkerOptions } from 'bullmq';
import type { Redis } from 'ioredis';
import type { z } from 'zod';
import type { QueueName } from './contracts.js';

export type Handler<P> = (
  job: Job<P>,
  ctx: {
    signal: AbortSignal;
    progress: (p: { percent: number; stage: string; message?: string }) => Promise<void>;
  },
) => Promise<unknown>;

export interface CreateWorkerOptions<S extends z.ZodType> {
  name: QueueName;
  connection: Redis;
  schema: S;
  handlers: Record<string, Handler<z.output<S>>>;
  concurrency?: number;
  /** Max job runtime before it is failed and (if attempts remain) retried. */
  lockDurationMs?: number;
  onError?: (err: Error) => void;
}

/**
 * Worker factory. Validates payloads, routes by job name, provides an
 * AbortSignal that fires on cancellation or shutdown so long-running steps
 * (renders, browser captures) stop promptly.
 */
export function createWorker<S extends z.ZodType>(opts: CreateWorkerOptions<S>): Worker {
  const controllers = new Map<string, AbortController>();
  const workerOpts: WorkerOptions = {
    connection: opts.connection,
    concurrency: opts.concurrency ?? 1,
    lockDuration: opts.lockDurationMs ?? 60_000,
    stalledInterval: 30_000,
  };
  const worker = new Worker(
    opts.name,
    async (job) => {
      const parsed = opts.schema.safeParse(job.data);
      if (!parsed.success) {
        // UnrecoverableError: fail immediately, no retries for an unparsable payload.
        throw new UnrecoverableError(
          `invalid payload for ${opts.name}/${job.name}: ${parsed.error.message}`,
        );
      }
      const handler = opts.handlers[job.name];
      if (!handler) {
        throw new UnrecoverableError(`no handler for ${opts.name}/${job.name}`);
      }
      const ac = new AbortController();
      controllers.set(String(job.id), ac);
      try {
        return await handler(job as Job<z.output<S>>, {
          signal: ac.signal,
          progress: (p) => job.updateProgress(p),
        });
      } finally {
        controllers.delete(String(job.id));
      }
    },
    workerOpts,
  );
  worker.on('error', (err) => opts.onError?.(err));
  const originalClose = worker.close.bind(worker);
  worker.close = async (force?: boolean) => {
    for (const ac of controllers.values()) ac.abort(new Error('worker shutting down'));
    return originalClose(force);
  };
  return worker;
}
