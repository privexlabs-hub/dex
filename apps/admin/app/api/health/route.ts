import { checkDatabase } from '@dex/db';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pg = await checkDatabase(db());
    return Response.json({ ok: true, checks: { postgres: pg } });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 503 },
    );
  }
}
