import { DomainError, forbidden, stepUpRequired, unauthenticated } from '../errors/index.js';
import { STAFF_PERMISSIONS, type StaffPermission } from './permissions.js';

/** Resolved staff principal, built by the admin app from the staff session. */
export interface StaffPrincipal {
  kind: 'staff';
  id: string;
  email: string;
  isActive: boolean;
  mfaEnabled: boolean;
  /** Permission keys resolved from role grants in the DB (not from code). */
  permissions: ReadonlySet<string>;
  /** When the session last passed a step-up re-authentication. */
  stepUpVerifiedAt: Date | null;
}

/** Resolved customer principal. */
export interface CustomerPrincipal {
  kind: 'user';
  id: string;
  email: string;
  emailVerified: boolean;
  /** org id -> role within that org */
  memberships: ReadonlyMap<string, OrgRole>;
}

export type OrgRole = 'owner' | 'admin' | 'member';
export type Principal = StaffPrincipal | CustomerPrincipal;

export interface AuthorizeOptions {
  /** Max age of a step-up verification. Default 5 minutes. */
  stepUpMaxAgeMs?: number;
  /** Whether the deployment enforces MFA for staff (env STAFF_REQUIRE_MFA). */
  requireStaffMfa?: boolean;
  now?: () => Date;
}

const DEFAULT_STEP_UP_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Assert that a staff principal holds `permission`. Throws DomainError on
 * failure so callers cannot forget to handle a boolean. Step-up requirements
 * come from the permission catalogue and are enforced here, not in the UI.
 */
export function authorizeStaff(
  principal: Principal | null | undefined,
  permission: StaffPermission,
  opts: AuthorizeOptions = {},
): asserts principal is StaffPrincipal {
  if (!principal) throw unauthenticated();
  if (principal.kind !== 'staff') throw forbidden('Staff access required');
  if (!principal.isActive) throw forbidden('Staff account is deactivated');
  if ((opts.requireStaffMfa ?? true) && !principal.mfaEnabled) {
    throw new DomainError('FORBIDDEN', 'Multi-factor authentication must be enabled', {
      reason: 'mfa_required',
    });
  }
  if (!principal.permissions.has(permission)) {
    throw forbidden(`Missing permission: ${permission}`);
  }
  const meta = STAFF_PERMISSIONS[permission];
  if (meta.stepUp) {
    const now = (opts.now ?? (() => new Date()))().getTime();
    const maxAge = opts.stepUpMaxAgeMs ?? DEFAULT_STEP_UP_MAX_AGE_MS;
    const verifiedAt = principal.stepUpVerifiedAt?.getTime() ?? 0;
    if (now - verifiedAt > maxAge) throw stepUpRequired(permission);
  }
}

const ORG_ROLE_RANK: Record<OrgRole, number> = { member: 1, admin: 2, owner: 3 };

/**
 * Assert that a customer principal is a member of `orgId` with at least
 * `minRole`. Every tenant-scoped operation calls this before `withTenant`.
 */
export function authorizeOrg(
  principal: Principal | null | undefined,
  orgId: string,
  minRole: OrgRole = 'member',
): asserts principal is CustomerPrincipal {
  if (!principal) throw unauthenticated();
  if (principal.kind !== 'user') throw forbidden('Customer access required');
  const role = principal.memberships.get(orgId);
  if (!role) throw forbidden('Not a member of this organization');
  if (ORG_ROLE_RANK[role] < ORG_ROLE_RANK[minRole]) {
    throw forbidden(`Requires ${minRole} role`);
  }
}

/** Non-throwing variant for UI gating only. Never use this as the sole check. */
export function can(
  principal: Principal | null | undefined,
  permission: StaffPermission,
  opts?: AuthorizeOptions,
): boolean {
  try {
    authorizeStaff(principal, permission, opts);
    return true;
  } catch {
    return false;
  }
}
