import 'server-only';
import { createDatabase, type Database } from '@dex/db';
import { env } from './env';

const globalForDb = globalThis as unknown as { __dexDb?: ReturnType<typeof createDatabase> };

/** Process-wide pool. HMR in dev re-evaluates modules; the global guard prevents pool leaks. */
export function db(): Database {
  globalForDb.__dexDb ??= createDatabase({
    connectionString: env().DATABASE_URL,
    max: env().DATABASE_POOL_MAX,
    applicationName: 'dex-web',
  });
  return globalForDb.__dexDb.db;
}
