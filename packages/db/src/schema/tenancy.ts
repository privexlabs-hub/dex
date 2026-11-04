import { sql } from 'drizzle-orm';
import { index, pgEnum, pgPolicy, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { organization } from './auth.js';
import { tenantPredicate, timestamps, uuidPk } from './_common.js';

/**
 * Tenant-scoped domain tables (Phase 1 subset).
 *
 * Every table here:
 *   - carries `org_id` (text, FK to organization.id)
 *   - enables Row-Level Security with a policy bound to `app.org_id`
 *   - has composite indexes that lead with `org_id`
 *
 * Application code must still scope every query by org_id; RLS is defense in
 * depth, not the only guard (SECURITY.md).
 */

export const projectStatus = pgEnum('project_status', ['draft', 'active', 'archived']);

export const workspace = pgTable(
  'workspace',
  {
    id: uuidPk(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    createdByUserId: text('created_by_user_id'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('workspace_org_slug_uq').on(t.orgId, t.slug),
    index('workspace_org_created_idx').on(t.orgId, t.createdAt),
    pgPolicy('workspace_tenant_isolation', {
      for: 'all',
      to: 'dex_app',
      using: tenantPredicate('org_id'),
      withCheck: tenantPredicate('org_id'),
    }),
  ],
).enableRLS();

export const project = pgTable(
  'project',
  {
    id: uuidPk(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: projectStatus('status').notNull().default('draft'),
    createdByUserId: text('created_by_user_id'),
    ...timestamps,
  },
  (t) => [
    index('project_org_workspace_idx').on(t.orgId, t.workspaceId, t.createdAt),
    index('project_org_status_idx').on(t.orgId, t.status),
    pgPolicy('project_tenant_isolation', {
      for: 'all',
      to: 'dex_app',
      using: tenantPredicate('org_id'),
      withCheck: tenantPredicate('org_id'),
    }),
  ],
).enableRLS();

/** Helper exported for tests: the exact SQL used to set the tenant context. */
export const setTenantSql = (orgId: string) => sql`select set_config('app.org_id', ${orgId}, true)`;
