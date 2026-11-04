/**
 * Integration tests against a real Postgres (DATABASE_ADMIN_URL + DATABASE_URL).
 * Proves: RLS blocks cross-tenant reads/writes for the app role, queries with no
 * tenant context see nothing, and the audit log is append-only.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDatabase, withTenant } from './client.js';
import { newId } from './ids.js';
import * as schema from './schema/index.js';

const adminUrl = process.env.DATABASE_ADMIN_URL;
const appUrl = process.env.DATABASE_URL;
const run = adminUrl && appUrl ? describe : describe.skip;

/** Drizzle wraps driver errors ("Failed query: ..."); the Postgres message is on `cause`. */
function messages(err: unknown): string {
  const out: string[] = [];
  let cur: unknown = err;
  while (cur instanceof Error) {
    out.push(cur.message);
    cur = cur.cause;
  }
  return out.join(' | ');
}

async function rejection(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    return messages(err);
  }
  throw new Error('expected rejection');
}

run('tenant isolation (RLS) and audit immutability', () => {
  const admin = createDatabase({
    connectionString: adminUrl ?? '',
    max: 1,
    applicationName: 'test-admin',
  });
  const app = createDatabase({
    connectionString: appUrl ?? '',
    max: 2,
    applicationName: 'test-app',
  });
  const orgA = `org_a_${newId().slice(-8)}`;
  const orgB = `org_b_${newId().slice(-8)}`;

  beforeAll(async () => {
    await admin.db.insert(schema.organization).values([
      { id: orgA, name: 'A', slug: orgA },
      { id: orgB, name: 'B', slug: orgB },
    ]);
  });
  afterAll(async () => {
    await admin.db.execute(sql`delete from organization where id in (${orgA}, ${orgB})`);
    await admin.pool.end();
    await app.pool.end();
  });

  it('app role cannot read or write outside its tenant context', async () => {
    await withTenant(app.db, { orgId: orgA }, async (tx) => {
      await tx
        .insert(schema.workspace)
        .values({ id: newId(), orgId: orgA, name: 'A-ws', slug: 'a' });
    });
    await withTenant(app.db, { orgId: orgB }, async (tx) => {
      await tx
        .insert(schema.workspace)
        .values({ id: newId(), orgId: orgB, name: 'B-ws', slug: 'b' });
    });

    const seenByA = await withTenant(app.db, { orgId: orgA }, (tx) =>
      tx.select().from(schema.workspace),
    );
    expect(seenByA.map((w) => w.orgId)).toEqual([orgA]);

    // Cross-tenant write is rejected by WITH CHECK.
    expect(
      await rejection(
        withTenant(app.db, { orgId: orgA }, (tx) =>
          tx
            .insert(schema.workspace)
            .values({ id: newId(), orgId: orgB, name: 'smuggled', slug: 'x' }),
        ),
      ),
    ).toMatch(/row-level security/i);

    // No tenant context -> zero rows (not an error), so a forgotten withTenant fails closed.
    const noCtx = await app.db.select().from(schema.workspace);
    expect(noCtx.length).toBe(0);

    // Owner role bypasses RLS and sees both (used only by migrations/ops).
    const all = await admin.db.select().from(schema.workspace);
    expect(all.filter((w) => w.orgId === orgA || w.orgId === orgB).length).toBe(2);
  });

  it('audit_event rejects UPDATE and DELETE for every role', async () => {
    const [row] = await app.db
      .insert(schema.auditEvent)
      .values({ actorType: 'system', action: 'test.write', result: 'success' })
      .returning({ id: schema.auditEvent.id });
    expect(row).toBeTruthy();
    expect(
      await rejection(
        app.db.execute(sql`update audit_event set action = 'tampered' where id = ${row?.id}`),
      ),
    ).toMatch(/permission denied|append-only/);
    expect(
      await rejection(admin.db.execute(sql`delete from audit_event where id = ${row?.id}`)),
    ).toMatch(/append-only/);
  });
});
