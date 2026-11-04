import { redirect } from 'next/navigation';
import { getStaffPrincipal } from '@/lib/auth';
import { stepUpAction } from './actions';

export const metadata = { title: 'Confirm it is you' };
export const dynamic = 'force-dynamic';

/**
 * Step-up re-authentication. Privileged permissions (see catalogue) require a
 * verification within the last 5 minutes; this page records one on the
 * current session after the password (and TOTP, when enrolled) is re-entered.
 */
export default async function StepUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const principal = await getStaffPrincipal();
  if (!principal) redirect('/sign-in');
  const { next, error } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold">Confirm it is you</h1>
      <p className="text-sm text-muted">
        This action is privileged. Re-enter your password to continue; the confirmation lasts five
        minutes.
      </p>
      <form action={stepUpAction} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={safeNext} />
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-11 rounded-lg border border-border bg-transparent px-3"
          />
        </label>
        {principal.mfaEnabled && (
          <label className="flex flex-col gap-1 text-sm">
            Authenticator code
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="min-h-11 rounded-lg border border-border bg-transparent px-3"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error === 'invalid' ? 'Verification failed.' : 'Something went wrong.'}
          </p>
        )}
        <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 text-accent-fg">
          Confirm
        </button>
      </form>
    </main>
  );
}
