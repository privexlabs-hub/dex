import { desc } from 'drizzle-orm';
import { schema } from '@dex/db';
import { DomainError } from '@dex/domain';
import { requireStaff } from '@/lib/auth';
import { db } from '@/lib/db';
import { Forbidden } from '../forbidden';

export const metadata = { title: 'Audit log' };
export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const permission = 'platform.audit.view' as const;
  try {
    await requireStaff(permission);
  } catch (err) {
    if (err instanceof DomainError) return <Forbidden permission={permission} />;
    throw err;
  }
  const rows = await db()
    .select()
    .from(schema.auditEvent)
    .orderBy(desc(schema.auditEvent.occurredAt))
    .limit(100);
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="text-xs text-muted">
        Append-only. Most recent 100 events. Hash-chained for tamper evidence.
      </p>
      <table className="w-full text-xs">
        <thead className="text-left text-muted">
          <tr>
            <th className="py-1">Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="py-1 whitespace-nowrap">{r.occurredAt.toISOString()}</td>
              <td>
                {r.actorType}:{r.actorId ?? '—'}
              </td>
              <td className="font-mono">{r.action}</td>
              <td>
                {r.targetType ?? ''} {r.targetId ?? ''}
              </td>
              <td className={r.result === 'success' ? '' : 'text-danger'}>
                {r.result}
                {r.reason ? ` (${r.reason})` : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
