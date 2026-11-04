import { z } from 'zod';
import {
  composeEnv,
  coreSchema,
  databaseSchema,
  loadEnv,
  redisSchema,
  storageSchema,
} from '@dex/env';

export const workerRoles = ['system', 'ingest', 'ai', 'media', 'render', 'notify'] as const;
export type WorkerRole = (typeof workerRoles)[number];

const workerSchema = z.object({
  /** Comma-separated roles this process consumes. */
  WORKER_ROLES: z
    .string()
    .default('system')
    .transform((s) =>
      s
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.enum(workerRoles)).min(1)),
  WORKER_HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(2),
});

export const envSchema = composeEnv(
  coreSchema,
  databaseSchema,
  redisSchema,
  storageSchema,
  workerSchema,
);
export type WorkerEnv = z.infer<typeof envSchema>;
export const loadWorkerEnv = () => loadEnv(envSchema);
