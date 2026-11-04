import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DomainError } from '@dex/domain';
import { getStaffPrincipal } from '@/lib/auth';
import { env } from '@/lib/env';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  let principal;
  try {
    principal = await getStaffPrincipal();
  } catch (err) {
    if (err instanceof DomainError && err.code === 'FORBIDDEN') {
      return <main className="p-8 text-sm">Access from this network is not permitted.</main>;
    }
    throw err;
  }
  if (!principal) redirect('/sign-in');
  if (!principal.isActive) redirect('/sign-in');
  if (env().STAFF_REQUIRE_MFA && !principal.mfaEnabled) {
    return (
      <main className="mx-auto max-w-md p-8 text-sm">
        <h1 className="text-lg font-semibold">Multi-factor authentication required</h1>
        <p className="mt-2 text-muted">
          Enable an authenticator app or passkey on your account before continuing.
        </p>
      </main>
    );
  }
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col">
      <nav className="flex items-center gap-4 border-b border-border px-6 py-3 text-sm">
        <span className="font-semibold">DeX Staff</span>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/flags">Flags</Link>
        <Link href="/audit">Audit</Link>
        <span className="ml-auto text-muted">{principal.email}</span>
      </nav>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
