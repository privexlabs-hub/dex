import { createDatabase, checkDatabase } from '@dex/db';
import { createLogger, createShutdownManager } from '@dex/observability';
import { startTelemetry } from '@dex/observability/otel';
import { checkRedis, createRedis } from '@dex/queue';
import { createStorage } from '@dex/storage';
import { loadWorkerEnv } from './env.js';
import { startHealthServer } from './health.js';
import { startSystemWorker } from './roles/system.js';

async function main() {
  const env = loadWorkerEnv();
  const log = createLogger({
    service: 'dex-worker',
    level: env.LOG_LEVEL,
    env: env.APP_ENV,
    pretty: env.APP_ENV === 'development',
  });
  const shutdown = createShutdownManager(log);

  const stopTelemetry = await startTelemetry({
    serviceName: env.OTEL_SERVICE_NAME ?? 'dex-worker',
    environment: env.APP_ENV,
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: env.OTEL_EXPORTER_OTLP_HEADERS,
  });
  shutdown.register('telemetry', stopTelemetry);

  const { db, pool } = createDatabase({
    connectionString: env.DATABASE_URL,
    max: env.DATABASE_POOL_MAX,
    applicationName: 'dex-worker',
  });
  shutdown.register('db', () => pool.end());

  const redis = createRedis(env.REDIS_URL, 'dex-worker');
  shutdown.register('redis', async () => {
    await redis.quit();
  });

  const storage = createStorage({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    signedUrlTtlSeconds: env.S3_SIGNED_URL_TTL_SECONDS,
  });

  // Fail fast if a dependency is unreachable at boot.
  await checkDatabase(db);
  await checkRedis(redis);
  await storage.check();

  const stopHealth = startHealthServer({
    port: env.WORKER_HTTP_PORT,
    log,
    isShuttingDown: () => shutdown.isShuttingDown,
    probes: [
      { name: 'postgres', check: () => checkDatabase(db) },
      { name: 'redis', check: () => checkRedis(redis) },
      { name: 'storage', check: () => storage.check() },
    ],
  });
  shutdown.register('health', stopHealth);

  for (const role of env.WORKER_ROLES) {
    switch (role) {
      case 'system': {
        const w = startSystemWorker(
          createRedis(env.REDIS_URL, 'dex-worker-system'),
          log,
          env.WORKER_CONCURRENCY,
        );
        shutdown.register(`worker:${role}`, () => w.close());
        break;
      }
      default:
        // Roles for later phases register here. Starting an unimplemented role is
        // a configuration error, not a silent no-op.
        throw new Error(`worker role "${role}" is not implemented in this build`);
    }
  }

  log.info({ roles: env.WORKER_ROLES, concurrency: env.WORKER_CONCURRENCY }, 'worker started');
}

main().catch((err: unknown) => {
  console.error('[worker] fatal', err);
  process.exitCode = 1;
});
