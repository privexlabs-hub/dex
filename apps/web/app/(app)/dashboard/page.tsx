import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { schema, withTenant } from '@dex/db';
import { authorizeOrg } from '@dex/domain';
import { getPrincipal, getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { signOutAction } from './actions';

export const metadata = { title: 'Workspace' };

export default async function DashboardPage() {
  const principal = await getPrincipal();
  if (!principal) redirect('/sign-in');
  if (principal.memberships.size === 0) redirect('/onboarding');

  const session = await getSession();
  const activeOrgId = session?.session.activeOrganizationId ?? [...principal.memberships.keys()][0];
  if (!activeOrgId) redirect('/onboarding');
  authorizeOrg(principal, activeOrgId);

  const { workspaces, projects } = await withTenant(
    db(),
    { orgId: activeOrgId, actorId: principal.id },
    async (tx) => {
      const workspaces = await tx
        .select()
        .from(schema.workspace)
        .where(eq(schema.workspace.orgId, activeOrgId))
        .orderBy(desc(schema.workspace.createdAt));
      const projects = await tx
        .select()
        .from(schema.project)
        .where(eq(schema.project.orgId, activeOrgId))
        .orderBy(desc(schema.project.createdAt))
        .limit(20);
      return { workspaces, projects };
    },
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <p className="text-sm text-muted">{principal.email}</p>
        </div>
        <form action={signOutAction}>
          <button className="min-h-11 rounded-lg border border-border px-4 text-sm">
            Sign out
          </button>
        </form>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Workspaces</h2>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {workspaces.map((w) => (
            <li key={w.id} className="px-4 py-3">
              {w.name} <span className="text-xs text-muted">/{w.slug}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Projects</h2>
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted">
            No projects yet. Product import arrives in Phase 2.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {projects.map((p) => (
              <li key={p.id} className="px-4 py-3">
                {p.name} <span className="text-xs text-muted">{p.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted">
        Foundation build ·{' '}
        <Link href="/" className="underline">
          Home
        </Link>
      </p>
    </main>
  );
}
