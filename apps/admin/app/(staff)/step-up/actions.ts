'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { verifyPassword } from 'better-auth/crypto';
import { z } from 'zod';
import { schema } from '@dex/db';
import { recordAudit } from '@dex/domain';
import { getStaffSession, staffAuth } from '@/lib/auth';
import { db } from '@/lib/db';

const input = z.object({
  password: z.string().min(1).max(256),
  code: z.string().trim().optional(),
  next: z.string().default('/dashboard'),
});

export async function stepUpAction(formData: FormData) {
  const session = await getStaffSession();
  if (!session) redirect('/sign-in');
  const { password, code, next } = input.parse({
    password: formData.get('password'),
    code: formData.get('code') ?? undefined,
    next: formData.get('next'),
  });
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  const d = db();
  const h = await headers();

  const [account] = await d
    .select({ hash: schema.staffAccount.password })
    .from(schema.staffAccount)
    .where(
      and(
        eq(schema.staffAccount.userId, session.user.id),
        eq(schema.staffAccount.providerId, 'credential'),
      ),
    );

  let ok = !!account?.hash && (await verifyPassword({ hash: account.hash, password }));

  if (ok && session.user.twoFactorEnabled) {
    // Delegate TOTP validation to Better Auth so lockout counters apply.
    try {
      const res = await staffAuth().api.verifyTOTP({ headers: h, body: { code: code ?? '' } });
      ok = !!res;
    } catch {
      ok = false;
    }
  }

  await recordAudit(d, {
    actorType: 'staff',
    actorId: session.user.id,
    action: 'staff.step_up',
    result: ok ? 'success' : 'denied',
    ipAddress: h.get('cf-connecting-ip') ?? h.get('x-forwarded-for'),
    userAgent: h.get('user-agent'),
  });

  if (!ok) redirect(`/step-up?error=invalid&next=${encodeURIComponent(safeNext)}`);

  await d
    .update(schema.staffSession)
    .set({ stepUpVerifiedAt: new Date() })
    .where(eq(schema.staffSession.id, session.session.id));
  redirect(safeNext);
}
