import { z } from 'zod';

/**
 * Job contracts. Every job payload is a Zod schema; producers validate before
 * enqueue and workers validate on receipt, so a bad payload fails fast with a
 * clear error instead of a half-processed job.
 *
 * Queue names are stable identifiers stored in Redis keys; do not rename.
 */

/** Common envelope carried by every DeX job. */
export const jobEnvelope = z.object({
  /** Tenant the job belongs to; workers run under `withTenant(orgId)`. */
  orgId: z.string().min(1),
  /** Who triggered it (user id, staff id or 'system'). */
  actorId: z.string().min(1),
  /** Correlation id propagated to logs/traces. */
  requestId: z.string().min(1),
  /** Idempotency key so retries and duplicate submits coalesce. */
  idempotencyKey: z.string().min(1),
});
export type JobEnvelope = z.infer<typeof jobEnvelope>;

export const QUEUES = {
  /** Phase 1 self-test and ops probe; also used by health checks. */
  system: 'system',
  /** Phase 2 */
  ingest: 'ingest',
  /** Phase 3 */
  ai: 'ai',
  /** Phase 4 */
  media: 'media',
  render: 'render',
  /** Notifications/email */
  notify: 'notify',
} as const;
export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const systemJobs = {
  ping: jobEnvelope.extend({ kind: z.literal('ping'), echo: z.string().max(200).optional() }),
} as const;

export const jobSchemas = {
  [QUEUES.system]: systemJobs,
} as const;

export type SystemJob = z.infer<(typeof systemJobs)[keyof typeof systemJobs]>;

/** Progress payload shape published by workers and relayed over SSE. */
export const jobProgress = z.object({
  percent: z.number().min(0).max(100),
  stage: z.string().max(100),
  message: z.string().max(500).optional(),
});
export type JobProgress = z.infer<typeof jobProgress>;
