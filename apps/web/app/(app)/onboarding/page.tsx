import { redirect } from 'next/navigation';
import { getPrincipal } from '@/lib/auth';
import { createOrganizationAction } from './actions';

export const metadata = { title: 'Set up your organization' };

export default async function OnboardingPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/sign-in');
  if (principal.memberships.size > 0) redirect('/dashboard');
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Name your organization</h1>
      <p className="text-sm text-muted">
        Projects, brand profiles and campaigns live inside an organization.
      </p>
      <form action={createOrganizationAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Organization name
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            className="min-h-11 rounded-lg border border-border bg-transparent px-3"
          />
        </label>
        <button type="submit" className="min-h-11 rounded-lg bg-accent px-4 text-accent-fg">
          Continue
        </button>
      </form>
    </main>
  );
}
