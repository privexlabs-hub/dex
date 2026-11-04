import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import pg from 'pg';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface CreateDatabaseOptions {
  connectionString: string;
  /** Pool size. Keep small per process; Neon's pooler multiplexes. */
  max?: number;
  applicationName?: string;
}

/**
 * Create a Drizzle client over a `pg` Pool. Long-lived processes (web server,
 * workers) share one pool; never create a pool per request.
 */
export function createDatabase(opts: CreateDatabaseOptions): { db: Database; pool: pg.Pool } {
  const pool = new pg.Pool({
    connectionString: opts.connectionString,
    max: opts.max ?? 10,
    application_name: opts.applicationName ?? 'dex',
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on('error', (err) => {
    // Idle client errors must not crash the process; the next checkout retries.
    console.error('[db] idle client error', err.message);
  });
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool };
}

export interface TenantContext {
  orgId: string;
  /** Actor identity propagated to audit triggers/policies. */
  actorId?: string | undefined;
}

/**
 * Run `fn` inside a transaction with the tenant context applied via
 * `SET LOCAL`-equivalent `set_config(..., true)`. The setting is scoped to the
 * transaction, so it is safe under PgBouncer/Neon transaction pooling.
 *
 * All tenant-scoped reads and writes MUST go through this helper. Queries
 * outside it run with no `app.org_id` and RLS denies every row.
 */
export async function withTenant<T>(
  db: Database,
  ctx: TenantContext,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  if (!ctx.orgId) throw new Error('withTenant requires orgId');
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.org_id', ${ctx.orgId}, true)`);
    if (ctx.actorId) {
      await tx.execute(sql`select set_config('app.actor_id', ${ctx.actorId}, true)`);
    }
    return fn(tx);
  });
}

/** Ping used by health checks. */
export async function checkDatabase(db: Database): Promise<{ ok: true; latencyMs: number }> {
  const start = performance.now();
  await db.execute(sql`select 1`);
  return { ok: true, latencyMs: Math.round(performance.now() - start) };
}
