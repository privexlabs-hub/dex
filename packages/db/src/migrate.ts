import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase } from './client.js';

/**
 * Apply pending migrations with the OWNER role. Used by CI and deploy jobs.
 * Never run with the application role: policies and grants require ownership.
 */
async function main() {
  const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_ADMIN_URL is required');
  const { db, pool } = createDatabase({
    connectionString: url,
    max: 1,
    applicationName: 'dex-migrate',
  });
  try {
    await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname });
    console.warn('[db] migrations applied');
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('[db] migration failed', err);
  process.exitCode = 1;
});
