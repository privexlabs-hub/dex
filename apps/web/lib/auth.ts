import 'server-only';
import { headers } from 'next/headers';
import { createCustomerAuth, type CustomerAuth } from '@dex/auth/customer';
import { resolveCustomerPrincipal } from '@dex/auth';
import { createEmailSender } from '@dex/email';
import type { CustomerPrincipal } from '@dex/domain';
import { db } from './db';
import { env } from './env';

const g = globalThis as unknown as { __dexAuth?: CustomerAuth };

export function auth(): CustomerAuth {
  if (!g.__dexAuth) {
    const e = env();
    g.__dexAuth = createCustomerAuth({
      db: db(),
      secret: e.BETTER_AUTH_SECRET,
      baseUrl: e.BETTER_AUTH_URL,
      appUrl: e.NEXT_PUBLIC_APP_URL,
      rpId: new URL(e.NEXT_PUBLIC_APP_URL).hostname,
      appEnv: e.APP_ENV,
      email: createEmailSender({ provider: 'smtp', smtpUrl: e.SMTP_URL, from: e.EMAIL_FROM }),
    });
  }
  return g.__dexAuth;
}

/** Current session or null. Server components and route handlers only. */
export async function getSession() {
  // Read headers first: it opts the route into dynamic rendering before env/secrets are touched.
  const h = await headers();
  return auth().api.getSession({ headers: h });
}

/** Resolved principal with org memberships, or null when signed out. */
export async function getPrincipal(): Promise<CustomerPrincipal | null> {
  const session = await getSession();
  if (!session) return null;
  return resolveCustomerPrincipal(db(), session.user.id);
}
