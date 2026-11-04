import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { timestamps, uuidPk } from './_common.js';

/* ------------------------------------------------------------------------ */
/* Audit log (append-only)                                                   */
/* ------------------------------------------------------------------------ */

export const auditActorType = pgEnum('audit_actor_type', ['user', 'staff', 'system']);
export const auditResult = pgEnum('audit_result', ['success', 'denied', 'failure']);

/**
 * Append-only. The migration revokes UPDATE/DELETE from every role and adds a
 * trigger that raises on either statement, so even the owner role cannot
 * rewrite history without dropping the trigger (which is itself audited at
 * the infrastructure level).
 */
export const auditEvent = pgTable(
  'audit_event',
  {
    id: uuidPk(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actorType: auditActorType('actor_type').notNull(),
    actorId: text('actor_id'),
    /** Tenant the action concerns, when any. Staff actions on platform config have none. */
    orgId: text('org_id'),
    /** Dotted verb, e.g. `org.suspend`, `staff.role.grant`, `content.access.read`. */
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    result: auditResult('result').notNull(),
    reason: text('reason'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    /** SHA-256 of (previous_hash || canonical row); enables tamper evidence. */
    previousHash: text('previous_hash'),
    hash: text('hash'),
  },
  (t) => [
    index('audit_event_occurred_idx').on(t.occurredAt),
    index('audit_event_actor_idx').on(t.actorType, t.actorId, t.occurredAt),
    index('audit_event_org_idx').on(t.orgId, t.occurredAt),
    index('audit_event_target_idx').on(t.targetType, t.targetId),
  ],
);

/* ------------------------------------------------------------------------ */
/* Feature flags                                                             */
/* ------------------------------------------------------------------------ */

export const featureFlag = pgTable('feature_flag', {
  key: text('key').primaryKey(),
  description: text('description').notNull(),
  /** Default when no rule matches. */
  defaultEnabled: boolean('default_enabled').notNull().default(false),
  /** Optional JSON payload for variant/config flags. */
  defaultValue: jsonb('default_value').$type<unknown>(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  ...timestamps,
});

/**
 * Targeting rules evaluated in `priority` order (lowest first). The first
 * matching rule wins. Rules target an org, a user, a plan tier or a percentage
 * rollout (deterministic hash of the targeting key).
 */
export const featureFlagRule = pgTable(
  'feature_flag_rule',
  {
    id: uuidPk(),
    flagKey: text('flag_key')
      .notNull()
      .references(() => featureFlag.key, { onDelete: 'cascade' }),
    priority: integer('priority').notNull().default(100),
    orgId: text('org_id'),
    userId: text('user_id'),
    planTier: text('plan_tier'),
    rolloutPercent: integer('rollout_percent'),
    enabled: boolean('enabled').notNull(),
    value: jsonb('value').$type<unknown>(),
    ...timestamps,
  },
  (t) => [
    index('feature_flag_rule_flag_idx').on(t.flagKey, t.priority),
    uniqueIndex('feature_flag_rule_org_uq')
      .on(t.flagKey, t.orgId)
      .where(sql`org_id is not null`),
  ],
);

/* ------------------------------------------------------------------------ */
/* System settings                                                           */
/* ------------------------------------------------------------------------ */

export const systemSetting = pgTable('system_setting', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  description: text('description'),
  updatedByStaffId: text('updated_by_staff_id'),
  ...timestamps,
});
