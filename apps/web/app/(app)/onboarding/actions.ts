'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { newId, schema, withTenant } from '@dex/db';
import { recordAudit } from '@dex/domain';
import { auth, getSession } from '@/lib/auth';
import { db } from '@/lib/db';

const input = z.object({ name: z.string().trim().min(2).max(80) });

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

/**
 * Creates the organization (via Better Auth so membership/role are consistent)
 * and a default workspace inside the tenant transaction, then audits it.
 */
export async function createOrganizationAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { name } = input.parse({ name: formData.get('name') });
  const base = slugify(name) || 'org';
  const slug = `${base}-${newId().slice(-6)}`;

  const org = await auth().api.createOrganization({
    headers: await headers(),
    body: { name, slug, userId: session.user.id },
  });
  if (!org) throw new Error('organization creation failed');

  await withTenant(db(), { orgId: org.id, actorId: session.user.id }, async (tx) => {
    await tx.insert(schema.workspace).values({
      id: newId(),
      orgId: org.id,
      name: 'Default',
      slug: 'default',
      createdByUserId: session.user.id,
    });
    await recordAudit(tx, {
      actorType: 'user',
      actorId: session.user.id,
      orgId: org.id,
      action: 'org.create',
      targetType: 'organization',
      targetId: org.id,
      result: 'success',
      metadata: { name, slug },
    });
  });

  await auth().api.setActiveOrganization({
    headers: await headers(),
    body: { organizationId: org.id },
  });
  redirect('/dashboard');
}
