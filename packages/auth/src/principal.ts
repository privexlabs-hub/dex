import { eq } from 'drizzle-orm';
import { schema, type Database } from '@dex/db';
import type { CustomerPrincipal, OrgRole, StaffPrincipal } from '@dex/domain';

/**
 * Build a StaffPrincipal from a staff session. Permissions are resolved from
 * DB role grants on every request (no caching) so revocation is immediate.
 */
export async function resolveStaffPrincipal(
  db: Database,
  session: { userId: string; stepUpVerifiedAt?: Date | null | undefined },
): Promise<StaffPrincipal | null> {
  const [u] = await db
    .select()
    .from(schema.staffUser)
    .where(eq(schema.staffUser.id, session.userId));
  if (!u) return null;
  const grants = await db
    .select({ key: schema.staffRolePermission.permissionKey })
    .from(schema.staffUserRole)
    .innerJoin(
      schema.staffRolePermission,
      eq(schema.staffRolePermission.roleId, schema.staffUserRole.roleId),
    )
    .where(eq(schema.staffUserRole.userId, u.id));
  return {
    kind: 'staff',
    id: u.id,
    email: u.email,
    isActive: u.isActive,
    mfaEnabled: u.twoFactorEnabled,
    permissions: new Set(grants.map((g) => g.key)),
    stepUpVerifiedAt: session.stepUpVerifiedAt ?? null,
  };
}

const ORG_ROLES: OrgRole[] = ['owner', 'admin', 'member'];

export async function resolveCustomerPrincipal(
  db: Database,
  userId: string,
): Promise<CustomerPrincipal | null> {
  const [u] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
  if (!u) return null;
  const rows = await db
    .select({ orgId: schema.member.organizationId, role: schema.member.role })
    .from(schema.member)
    .where(eq(schema.member.userId, userId));
  const memberships = new Map<string, OrgRole>();
  for (const r of rows) {
    const role = ORG_ROLES.includes(r.role as OrgRole) ? (r.role as OrgRole) : 'member';
    memberships.set(r.orgId, role);
  }
  return { kind: 'user', id: u.id, email: u.email, emailVerified: u.emailVerified, memberships };
}
