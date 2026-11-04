import 'server-only';
import { headers } from 'next/headers';
import { createStaffAuth, type StaffAuth } from '@dex/auth/staff';
import { resolveStaffPrincipal } from '@dex/auth';
import { createEmailSender } from '@dex/email';
import {
  authorizeStaff,
  DomainError,
  recordAudit,
  type StaffPermission,
  type StaffPrincipal,
} from '@dex/domain';
import { db } from './db';
import { env } from './env';
import { assertIpAllowed } from './ip-allowlist';

const g = globalThis as unknown as { __dexStaffAuth?: StaffAuth };

export function staffAuth(): StaffAuth {
  if (!g.__dexStaffAuth) {
    const e = env();
    g.__dexStaffAuth = createStaffAuth({
      db: db(),
      secret: e.STAFF_AUTH_SECRET,
      baseUrl: e.STAFF_AUTH_URL,
      adminUrl: e.NEXT_PUBLIC_ADMIN_URL,
      rpId: new URL(e.NEXT_PUBLIC_ADMIN_URL).hostname,
      appEnv: e.APP_ENV,
      email: createEmailSender({ provider: 'smtp', smtpUrl: e.SMTP_URL, from: e.EMAIL_FROM }),
    });
  }
  return g.__dexStaffAuth;
}

export async function getStaffSession() {
  const h = await headers(); // first: marks the route dynamic before env is read
  assertIpAllowed(h, env().STAFF_IP_ALLOWLIST);
  return staffAuth().api.getSession({ headers: h });
}

export async function getStaffPrincipal(): Promise<StaffPrincipal | null> {
  const session = await getStaffSession();
  if (!session) return null;
  const stepUp = (session.session as { stepUpVerifiedAt?: Date | string | null }).stepUpVerifiedAt;
  return resolveStaffPrincipal(db(), {
    userId: session.user.id,
    stepUpVerifiedAt: stepUp ? new Date(stepUp) : null,
  });
}

/**
 * Server-side gate for every staff page/action. Throws DomainError; pages
 * convert UNAUTHENTICATED to a redirect and everything else to a 403 view.
 */
export async function requireStaff(permission: StaffPermission): Promise<StaffPrincipal> {
  const principal = await getStaffPrincipal();
  try {
    authorizeStaff(principal, permission, { requireStaffMfa: env().STAFF_REQUIRE_MFA });
    return principal;
  } catch (err) {
    if (err instanceof DomainError && principal && err.code !== 'UNAUTHENTICATED') {
      const h = await headers();
      await recordAudit(db(), {
        actorType: 'staff',
        actorId: principal.id,
        action: `authz.${permission}`,
        result: 'denied',
        reason: err.code,
        ipAddress: h.get('cf-connecting-ip') ?? h.get('x-forwarded-for'),
        userAgent: h.get('user-agent'),
      });
    }
    throw err;
  }
}

/** Audit a successful privileged action. Call inside the same transaction as the mutation when possible. */
export async function auditStaffAction(
  principal: StaffPrincipal,
  input: {
    action: string;
    targetType?: string;
    targetId?: string;
    orgId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const h = await headers();
  await recordAudit(db(), {
    actorType: 'staff',
    actorId: principal.id,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    orgId: input.orgId ?? null,
    result: 'success',
    metadata: input.metadata ?? null,
    ipAddress: h.get('cf-connecting-ip') ?? h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });
}
