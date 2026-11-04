import 'server-only';
import { createDatabase, type Database } from '@dex/db';
import { env } from './env';

const g = globalThis as unknown as { __dexAdminDb?: ReturnType<typeof createDatabase> };
export function db(): Database {
  g.__dexAdminDb ??= createDatabase({
    connectionString: env().DATABASE_URL,
    max: env().DATABASE_POOL_MAX,
    applicationName: 'dex-admin',
  });
  return g.__dexAdminDb.db;
}
