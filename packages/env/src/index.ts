import { z } from 'zod';

/**
 * Environment schema. Every process (web, admin, worker, renderer) loads the
 * subset it needs through `loadEnv(schema)`. Secrets are never logged; the
 * `redact` helper lists keys to strip from logs and error reports.
 */

const url = z.string().url();
const nonEmpty = z.string().min(1);
const bool = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1');

export const appEnvSchema = z.enum(['development', 'test', 'staging', 'production']);
export type AppEnv = z.infer<typeof appEnvSchema>;

export const coreSchema = z.object({
  APP_ENV: appEnvSchema.default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  OTEL_SERVICE_NAME: nonEmpty.optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: url.optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  SENTRY_DSN: url.optional(),
});

export const databaseSchema = z.object({
  /** Role used by the application. Must NOT be the table owner so RLS applies. */
  DATABASE_URL: url,
  /** Owner/migrator role; only used by `drizzle-kit migrate` and seeds. */
  DATABASE_ADMIN_URL: url.optional(),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
});

export const redisSchema = z.object({
  REDIS_URL: url,
});

export const storageSchema = z.object({
  S3_ENDPOINT: url,
  S3_REGION: nonEmpty.default('auto'),
  S3_BUCKET: nonEmpty,
  S3_ACCESS_KEY_ID: nonEmpty,
  S3_SECRET_ACCESS_KEY: nonEmpty,
  /** Force path-style addressing (required for RustFS). */
  S3_FORCE_PATH_STYLE: bool.default(false),
  /** Signed URL lifetime in seconds. Kept short by policy (ADR-009). */
  S3_SIGNED_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
});

export const customerAuthSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: url,
  NEXT_PUBLIC_APP_URL: url,
});

export const staffAuthSchema = z.object({
  STAFF_AUTH_SECRET: z.string().min(32),
  STAFF_AUTH_URL: url,
  NEXT_PUBLIC_ADMIN_URL: url,
  /** Comma-separated CIDR allowlist. Empty disables the check (dev only). */
  STAFF_IP_ALLOWLIST: z.string().optional(),
  STAFF_REQUIRE_MFA: bool.default(true),
});

export const emailSchema = z.object({
  EMAIL_FROM: z.string().email(),
  /** Only SMTP is implemented today (Mailpit locally, any SMTP relay in prod). */
  EMAIL_PROVIDER: z.enum(['smtp']).default('smtp'),
  SMTP_URL: z.string().min(1),
});

/** Keys whose values must never appear in logs, traces or error reports. */
export const SECRET_KEYS = [
  'DATABASE_URL',
  'DATABASE_ADMIN_URL',
  'REDIS_URL',
  'S3_SECRET_ACCESS_KEY',
  'S3_ACCESS_KEY_ID',
  'BETTER_AUTH_SECRET',
  'STAFF_AUTH_SECRET',
  'SMTP_URL',
  'SENTRY_DSN',
  'OTEL_EXPORTER_OTLP_HEADERS',
] as const;

export class EnvValidationError extends Error {
  constructor(public readonly issues: { path: string; message: string }[]) {
    super(
      `Invalid environment configuration:\n${issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n')}`,
    );
    this.name = 'EnvValidationError';
  }
}

/**
 * Validate `source` (defaults to process.env) against a schema. Throws a
 * readable error listing every missing/invalid key, without echoing values.
 * An empty string counts as unset: `KEY=` in an env file means "not configured",
 * so optional keys stay optional and defaults apply.
 */
export function loadEnv<T extends z.ZodObject>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const result = schema.safeParse(present);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((i) => ({ path: i.path.join('.') || '(root)', message: i.message })),
    );
  }
  return result.data;
}

/** Merge several schemas into one object schema. */
export function composeEnv<const T extends readonly z.ZodObject[]>(...schemas: T) {
  return schemas.reduce((acc, s) => acc.extend(s.shape), z.object({})) as z.ZodObject<
    UnionToIntersectionShape<T[number]['shape']>
  >;
}

type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;
type UnionToIntersectionShape<S> =
  UnionToIntersection<S> extends infer R ? { [K in keyof R]: R[K] } : never;

export function isProduction(env: { APP_ENV: AppEnv }): boolean {
  return env.APP_ENV === 'production';
}
