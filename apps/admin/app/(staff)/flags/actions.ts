'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '@dex/db';
import { DomainError, recordAudit } from '@dex/domain';
import { requireStaff } from '@/lib/auth';
import { db } from '@/lib/db';

const input = z.object({ key: z.string().min(1).max(100), enabled: z.enum(['true', 'false']) });

/**
 * Flip a flag's default. `platform.flags.write` requires a fresh step-up, so a
 * stale session is sent to /step-up and returned here. The write and its
 * audit share a transaction.
 */
export async function toggleFlagAction(formData: FormData) {
  let principal;
  try {
    principal = await requireStaff('platform.flags.write');
  } catch (err) {
    if (err instanceof DomainError && err.code === 'STEP_UP_REQUIRED')
      redirect('/step-up?next=/flags');
    if (err instanceof DomainError) redirect(`/flags?error=${err.code.toLowerCase()}`);
    throw err;
  }
  const { key, enabled } = input.parse({
    key: formData.get('key'),
    enabled: formData.get('enabled'),
  });
  await db().transaction(async (tx) => {
    const [row] = await tx
      .update(schema.featureFlag)
      .set({ defaultEnabled: enabled === 'true' })
      .where(eq(schema.featureFlag.key, key))
      .returning({ key: schema.featureFlag.key });
    if (!row) throw new DomainError('NOT_FOUND', 'flag not found');
    await recordAudit(tx, {
      actorType: 'staff',
      actorId: principal.id,
      action: 'platform.flag.toggle',
      targetType: 'feature_flag',
      targetId: key,
      result: 'success',
      metadata: { enabled: enabled === 'true' },
    });
  });
  revalidatePath('/flags');
}
