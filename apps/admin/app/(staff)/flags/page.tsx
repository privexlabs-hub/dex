import { DomainError } from '@dex/domain';
import { listFlags } from '@dex/flags';
import { requireStaff } from '@/lib/auth';
import { db } from '@/lib/db';
import { Forbidden } from '../forbidden';
import { toggleFlagAction } from './actions';

export const metadata = { title: 'Feature flags' };
export const dynamic = 'force-dynamic';

export default async function FlagsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const permission = 'platform.dashboard.view' as const;
  let principal;
  try {
    principal = await requireStaff(permission);
  } catch (err) {
    if (err instanceof DomainError) return <Forbidden permission={permission} />;
    throw err;
  }
  const canWrite = principal.permissions.has('platform.flags.write');
  const flags = await listFlags(db());

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Feature flags</h1>
      {error && (
        <p role="alert" className="text-sm text-danger">
          Action refused: {error}. This attempt has been recorded.
        </p>
      )}
      {flags.length === 0 && <p className="text-sm text-muted">No flags defined.</p>}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {flags.map((f) => (
          <li key={f.key} className="flex items-center gap-4 px-4 py-3 text-sm">
            <div className="flex-1">
              <div className="font-mono">{f.key}</div>
              <div className="text-xs text-muted">
                {f.description} · {f.rules.length} rule{f.rules.length === 1 ? '' : 's'}
                {f.archivedAt ? ' · archived' : ''}
              </div>
            </div>
            <span className={f.defaultEnabled ? 'text-accent' : 'text-muted'}>
              {f.defaultEnabled ? 'on' : 'off'}
            </span>
            {canWrite && !f.archivedAt && (
              <form action={toggleFlagAction}>
                <input type="hidden" name="key" value={f.key} />
                <input type="hidden" name="enabled" value={f.defaultEnabled ? 'false' : 'true'} />
                <button className="min-h-9 rounded-lg border border-border px-3">
                  Turn {f.defaultEnabled ? 'off' : 'on'}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {!canWrite && (
        <p className="text-xs text-muted">Read-only: your role lacks platform.flags.write.</p>
      )}
    </main>
  );
}
