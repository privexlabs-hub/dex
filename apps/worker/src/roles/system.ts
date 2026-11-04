import { QUEUES, createWorker, systemJobs, type Redis } from '@dex/queue';
import type { Logger } from '@dex/observability';

/**
 * `system` role: operational self-test jobs. Used by health checks and the
 * backoffice to prove the queue path end to end without touching tenant data.
 */
export function startSystemWorker(connection: Redis, log: Logger, concurrency: number) {
  return createWorker({
    name: QUEUES.system,
    connection,
    schema: systemJobs.ping,
    concurrency,
    handlers: {
      ping: async (job, { progress }) => {
        await progress({ percent: 50, stage: 'echo' });
        log.debug({ jobId: job.id, orgId: job.data.orgId }, 'ping');
        await progress({ percent: 100, stage: 'done' });
        return { pong: true, echo: job.data.echo ?? null, at: new Date().toISOString() };
      },
    },
    onError: (err) => log.error({ err }, 'system worker error'),
  });
}
