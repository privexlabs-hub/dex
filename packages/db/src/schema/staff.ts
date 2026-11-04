import {
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps, uuidPk } from './_common.js';

/**
 * Staff realm. Lives in its own Postgres schema (`staff`) with its own
 * Better Auth instance, session cookie and secret. Staff identities never
 * share tables with customer identities (ADR-015).
 */
export const staff = pgSchema('staff');

export const staffUser = staff.table(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    /** Deactivated staff keep their audit trail but cannot sign in. */
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('staff_user_email_uq').on(t.email)],
);

export const staffSession = staff.table(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    token: text('token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => staffUser.id, { onDelete: 'cascade' }),
    /** Set after a successful step-up re-authentication; checked for privileged actions. */
    stepUpVerifiedAt: timestamp('step_up_verified_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('staff_session_token_uq').on(t.token),
    index('staff_session_user_idx').on(t.userId),
  ],
);

export const staffAccount = staff.table(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => staffUser.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('staff_account_user_idx').on(t.userId)],
);

export const staffVerification = staff.table(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('staff_verification_identifier_idx').on(t.identifier)],
);

export const staffTwoFactor = staff.table(
  'two_factor',
  {
    id: text('id').primaryKey(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    verified: boolean('verified').notNull().default(false),
    failedVerificationCount: integer('failed_verification_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    userId: text('user_id')
      .notNull()
      .references(() => staffUser.id, { onDelete: 'cascade' }),
  },
  (t) => [index('staff_two_factor_user_idx').on(t.userId)],
);

export const staffPasskey = staff.table(
  'passkey',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    publicKey: text('public_key').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => staffUser.id, { onDelete: 'cascade' }),
    credentialID: text('credential_id').notNull(),
    counter: integer('counter').notNull(),
    deviceType: text('device_type').notNull(),
    backedUp: boolean('backed_up').notNull(),
    transports: text('transports'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    aaguid: text('aaguid'),
  },
  (t) => [index('staff_passkey_user_idx').on(t.userId)],
);

/* ------------------------------------------------------------------------ */
/* RBAC                                                                      */
/* ------------------------------------------------------------------------ */

export const staffRole = staff.table(
  'role',
  {
    id: uuidPk(),
    /** Stable machine key, e.g. `super_admin`, `support_agent`. */
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** Built-in roles cannot be deleted; their permissions can still be edited by super admins. */
    isBuiltIn: boolean('is_built_in').notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex('staff_role_key_uq').on(t.key)],
);

export const staffPermission = staff.table('permission', {
  /** Dotted key, e.g. `org.suspend`, `billing.refund`, `content.view_restricted`. */
  key: text('key').primaryKey(),
  description: text('description').notNull(),
  /** Permissions that require a fresh step-up authentication to exercise. */
  requiresStepUp: boolean('requires_step_up').notNull().default(false),
});

export const staffRolePermission = staff.table(
  'role_permission',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => staffRole.id, { onDelete: 'cascade' }),
    permissionKey: text('permission_key')
      .notNull()
      .references(() => staffPermission.key, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionKey] })],
);

export const staffUserRole = staff.table(
  'user_role',
  {
    userId: text('user_id')
      .notNull()
      .references(() => staffUser.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => staffRole.id, { onDelete: 'cascade' }),
    grantedByUserId: text('granted_by_user_id'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

/**
 * Break-glass access to customer content. Staff are denied customer content by
 * default; a time-boxed grant with a justification is required, and every read
 * under a grant is written to audit_event.
 */
export const contentAccessGrant = staff.table(
  'content_access_grant',
  {
    id: uuidPk(),
    staffUserId: text('staff_user_id')
      .notNull()
      .references(() => staffUser.id, { onDelete: 'cascade' }),
    orgId: text('org_id').notNull(),
    /** Optional narrowing to one project. */
    projectId: text('project_id'),
    justification: text('justification').notNull(),
    supportTicketRef: text('support_ticket_ref'),
    approvedByUserId: text('approved_by_user_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedByUserId: text('revoked_by_user_id'),
    scope: jsonb('scope').$type<{ assets?: boolean; specs?: boolean; sources?: boolean }>(),
    ...timestamps,
  },
  (t) => [
    index('content_access_grant_staff_idx').on(t.staffUserId, t.expiresAt),
    index('content_access_grant_org_idx').on(t.orgId, t.expiresAt),
  ],
);
