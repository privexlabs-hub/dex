import { createHash } from 'node:crypto';
import { desc } from 'drizzle-orm';
import { schema, type Database, type Transaction } from '@dex/db';

export interface AuditInput {
  actorType: 'user' | 'staff' | 'system';
  actorId?: string | null;
  orgId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  result: 'success' | 'denied' | 'failure';
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
}

function canonical(input: AuditInput, occurredAt: Date, previousHash: string | null): string {
  return JSON.stringify({
    previousHash,
    occurredAt: occurredAt.toISOString(),
    actorType: input.actorType,
    actorId: input.actorId ?? null,
    orgId: input.orgId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    result: input.result,
    reason: input.reason ?? null,
    metadata: input.metadata ?? null,
  });
}

/**
 * Append an audit event. Hash-chains to the previous row for tamper evidence.
 * Writes are intentionally simple and synchronous with the action: an action
 * whose audit write fails must fail too (callers run this inside their tx).
 */
export async function recordAudit(db: Database | Transaction, input: AuditInput): Promise<string> {
  const occurredAt = new Date();
  const [prev] = await db
    .select({ hash: schema.auditEvent.hash })
    .from(schema.auditEvent)
    .orderBy(desc(schema.auditEvent.occurredAt), desc(schema.auditEvent.id))
    .limit(1);
  const previousHash = prev?.hash ?? null;
  const hash = createHash('sha256')
    .update(canonical(input, occurredAt, previousHash))
    .digest('hex');
  const [row] = await db
    .insert(schema.auditEvent)
    .values({
      occurredAt,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      orgId: input.orgId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      result: input.result,
      reason: input.reason ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
      metadata: input.metadata ?? null,
      previousHash,
      hash,
    })
    .returning({ id: schema.auditEvent.id });
  if (!row) throw new Error('audit insert returned no row');
  return row.id;
}
