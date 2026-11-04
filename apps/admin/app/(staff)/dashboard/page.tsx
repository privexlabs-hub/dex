import { sql } from 'drizzle-orm';
import { DomainError } from '@dex/domain';
import { createRedis, getQueueCounts } from '@dex/queue';
import { requireStaff } from '@/lib/auth';
import { db } from '@/lib/db';
import { env } from '@/lib/env';
import { Forbidden } from '../forbidden';

export const metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

async function metrics() {
  // SECURITY DEFINER function: aggregates across tenants without granting the
  // app role row access (see drizzle/0002_platform_counts.sql).
  const res = await db().execute<{
    users: string;
    new_users_7d: string;
    organizations: string;
    workspaces: string;
    projects: string;
    staff_users: string;
  }>(sql`select * from platform_counts()`);
  const r = res.rows[0];
  const n = (v: string | undefined) => Number(v ?? 0);
  return {
    users: n(r?.users),
    newUsers7d: n(r?.new_users_7d),
    orgs: n(r?.organizations),
    workspaces: n(r?.workspaces),
    projects: n(r?.projects),
    staff: n(r?.staff_users),
  };
}

async function queues() {
  const redis = createRedis(env().REDIS_URL, 'dex-admin');
  try {
    return await getQueueCounts(redis);
  } finally {
    await redis.quit();
  }
}

export default async function DashboardPage() {
  const permission = 'platform.dashboard.view' as const;
  try {
    await requireStaff(permission);
  } catch (err) {
    if (err instanceof DomainError) return <Forbidden permission={permission} />;
    throw err;
  }
  const [m, q] = await Promise.all([metrics(), queues().catch(() => null)]);

  return (
    <main className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Platform</h1>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ['Users', m.users],
          ['New users (7d)', m.newUsers7d],
          ['Organizations', m.orgs],
          ['Workspaces', m.workspaces],
          ['Projects', m.projects],
          ['Staff accounts', m.staff],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-border p-4">
            <div className="text-xs text-muted">{label}</div>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Queues</h2>
        {q ? (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1">Queue</th>
                <th>Waiting</th>
                <th>Active</th>
                <th>Delayed</th>
                <th>Failed</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(q).map(([name, c]) => (
                <tr key={name} className="border-t border-border">
                  <td className="py-1 font-mono">{name}</td>
                  <td>{c.waiting ?? 0}</td>
                  <td>{c.active ?? 0}</td>
                  <td>{c.delayed ?? 0}</td>
                  <td>{c.failed ?? 0}</td>
                  <td>{c.completed ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-danger">Redis unreachable; queue metrics unavailable.</p>
        )}
      </section>
    </main>
  );
}
