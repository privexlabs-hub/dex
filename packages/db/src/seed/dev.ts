/**
 * Development seed. Creates built-in staff roles/permissions and one super
 * administrator. Never run against staging/production: the guard below
 * refuses unless APP_ENV is development or test.
 *
 * Staff password hashing goes through Better Auth's own hasher so the seeded
 * account signs in through the normal flow.
 */
import { hashPassword } from 'better-auth/crypto';
import { eq, sql } from 'drizzle-orm';
import { createDatabase } from '../client.js';
import * as schema from '../schema/index.js';
import { BUILT_IN_STAFF_ROLES, STAFF_PERMISSIONS } from './staff-catalogue.js';

async function main() {
  const appEnv = process.env.APP_ENV ?? 'development';
  if (appEnv !== 'development' && appEnv !== 'test') {
    throw new Error(`refusing to seed in APP_ENV=${appEnv}`);
  }
  const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_ADMIN_URL is required');
  const email = process.env.SEED_STAFF_EMAIL ?? 'admin@dex.localhost';
  const password = process.env.SEED_STAFF_PASSWORD ?? 'change-me-before-anything-else!';

  const { db, pool } = createDatabase({
    connectionString: url,
    max: 1,
    applicationName: 'dex-seed',
  });
  try {
    await db.transaction(async (tx) => {
      // Permissions
      for (const [key, meta] of Object.entries(STAFF_PERMISSIONS)) {
        await tx
          .insert(schema.staffPermission)
          .values({ key, description: meta.description, requiresStepUp: meta.stepUp })
          .onConflictDoUpdate({
            target: schema.staffPermission.key,
            set: { description: meta.description, requiresStepUp: meta.stepUp },
          });
      }
      // Roles + grants
      for (const [key, role] of Object.entries(BUILT_IN_STAFF_ROLES)) {
        const [r] = await tx
          .insert(schema.staffRole)
          .values({ key, name: role.name, description: role.description, isBuiltIn: true })
          .onConflictDoUpdate({
            target: schema.staffRole.key,
            set: { name: role.name, description: role.description },
          })
          .returning({ id: schema.staffRole.id });
        if (!r) throw new Error(`role ${key} not inserted`);
        const perms =
          role.permissions === 'ALL' ? Object.keys(STAFF_PERMISSIONS) : [...role.permissions];
        await tx
          .delete(schema.staffRolePermission)
          .where(eq(schema.staffRolePermission.roleId, r.id));
        if (perms.length) {
          await tx
            .insert(schema.staffRolePermission)
            .values(perms.map((p) => ({ roleId: r.id, permissionKey: p })));
        }
      }
      // Super admin
      const [existing] = await tx
        .select({ id: schema.staffUser.id })
        .from(schema.staffUser)
        .where(eq(schema.staffUser.email, email));
      let userId = existing?.id;
      if (!userId) {
        userId = `stf_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
        await tx
          .insert(schema.staffUser)
          .values({ id: userId, name: 'Super Admin', email, emailVerified: true, isActive: true });
        await tx.insert(schema.staffAccount).values({
          id: `acc_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
          accountId: userId,
          providerId: 'credential',
          userId,
          password: await hashPassword(password),
        });
      }
      const [superRole] = await tx
        .select({ id: schema.staffRole.id })
        .from(schema.staffRole)
        .where(eq(schema.staffRole.key, 'super_admin'));
      if (!superRole) throw new Error('super_admin role missing');
      await tx
        .insert(schema.staffUserRole)
        .values({ userId, roleId: superRole.id })
        .onConflictDoNothing();

      // Example flag so the backoffice page has something real to show
      await tx
        .insert(schema.featureFlag)
        .values({
          key: 'editor.conversational',
          description: 'Conversational editing in the studio (Phase 5)',
          defaultEnabled: false,
        })
        .onConflictDoNothing();

      await tx.execute(sql`select 1`);
    });
    console.warn(`[seed] staff super admin ready: ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((err: unknown) => {
  console.error('[seed] failed', err);
  process.exitCode = 1;
});
