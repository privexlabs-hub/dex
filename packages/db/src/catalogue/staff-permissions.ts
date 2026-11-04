/**
 * Static catalogue of staff permissions and built-in roles. Lives in @dex/db so
 * the seed and the domain layer share one definition without a dependency cycle.
 *
 * The DB table `staff.permission` is seeded from this list and `authorize()`
 * checks against DB-resolved grants, so adding a key here without a seed or
 * migration grants nothing (by design: code cannot grant itself permissions).
 */
export const STAFF_PERMISSIONS = {
  // Platform
  'platform.dashboard.view': { description: 'View operational dashboards', stepUp: false },
  'platform.settings.write': { description: 'Change platform configuration', stepUp: true },
  'platform.flags.write': { description: 'Change feature flags', stepUp: true },
  'platform.audit.view': { description: 'Read audit logs', stepUp: false },
  // Staff management
  'staff.user.view': { description: 'View staff accounts', stepUp: false },
  'staff.user.write': { description: 'Create/deactivate staff accounts', stepUp: true },
  'staff.role.write': { description: 'Edit roles and permissions', stepUp: true },
  // Customers
  'org.view': { description: 'View organizations and workspaces', stepUp: false },
  'org.suspend': { description: 'Suspend or restore an organization', stepUp: true },
  'org.member.write': { description: 'Manage org memberships', stepUp: true },
  'user.view': { description: 'View customer accounts', stepUp: false },
  'user.recovery': { description: 'Initiate account recovery', stepUp: true },
  // Customer content (denied by default; requires content_access_grant)
  'content.access.request': { description: 'Request break-glass content access', stepUp: false },
  'content.access.approve': { description: 'Approve break-glass content access', stepUp: true },
  // Billing
  'billing.view': { description: 'View subscriptions and usage', stepUp: false },
  'billing.refund': { description: 'Issue refunds', stepUp: true },
  'billing.plan.write': { description: 'Edit plans and entitlements', stepUp: true },
  // Operations
  'jobs.view': { description: 'View queues and jobs', stepUp: false },
  'jobs.retry': { description: 'Retry or cancel jobs', stepUp: false },
  'render.view': { description: 'View render jobs', stepUp: false },
  'render.retry': { description: 'Retry or cancel renders', stepUp: false },
  'ai.config.view': { description: 'View AI provider configuration', stepUp: false },
  'ai.config.write': { description: 'Edit AI providers, models and routes', stepUp: true },
  'ai.usage.view': { description: 'View AI usage and cost', stepUp: false },
  // Catalogue
  'catalogue.view': { description: 'View audio/voice catalogue', stepUp: false },
  'catalogue.write': { description: 'Edit catalogue and licences', stepUp: false },
  // Moderation & support
  'moderation.view': { description: 'View moderation cases', stepUp: false },
  'moderation.act': { description: 'Take moderation actions', stepUp: true },
  'support.ticket.view': { description: 'View support tickets', stepUp: false },
  'support.ticket.write': { description: 'Reply to and assign tickets', stepUp: false },
  // Analytics
  'analytics.view': { description: 'View aggregated metrics', stepUp: false },
} as const;

export type StaffPermission = keyof typeof STAFF_PERMISSIONS;

export interface BuiltInRole {
  name: string;
  description: string;
  permissions: readonly StaffPermission[] | 'ALL';
}

export const BUILT_IN_STAFF_ROLES: Record<string, BuiltInRole> = {
  super_admin: {
    name: 'Super Administrator',
    description: 'Full platform administration',
    permissions: 'ALL',
  },
  platform_admin: {
    name: 'Platform Administrator',
    description: 'User, workspace and platform configuration',
    permissions: [
      'platform.dashboard.view',
      'platform.settings.write',
      'platform.flags.write',
      'platform.audit.view',
      'org.view',
      'org.suspend',
      'org.member.write',
      'user.view',
      'user.recovery',
      'content.access.request',
      'content.access.approve',
      'billing.view',
      'jobs.view',
      'jobs.retry',
      'render.view',
      'render.retry',
      'ai.config.view',
      'ai.usage.view',
      'catalogue.view',
      'moderation.view',
      'support.ticket.view',
      'support.ticket.write',
      'analytics.view',
    ],
  },
  support_agent: {
    name: 'Support Agent',
    description: 'Customer support and approved troubleshooting',
    permissions: [
      'platform.dashboard.view',
      'org.view',
      'user.view',
      'user.recovery',
      'content.access.request',
      'billing.view',
      'jobs.view',
      'render.view',
      'support.ticket.view',
      'support.ticket.write',
    ],
  },
  finance_admin: {
    name: 'Finance Administrator',
    description: 'Subscriptions, payments and refunds',
    permissions: [
      'platform.dashboard.view',
      'org.view',
      'billing.view',
      'billing.refund',
      'billing.plan.write',
      'analytics.view',
    ],
  },
  content_moderator: {
    name: 'Content Moderator',
    description: 'Abuse reports and content review',
    permissions: [
      'platform.dashboard.view',
      'org.view',
      'content.access.request',
      'moderation.view',
      'moderation.act',
    ],
  },
  operations_engineer: {
    name: 'Operations Engineer',
    description: 'Jobs, rendering, providers and incidents',
    permissions: [
      'platform.dashboard.view',
      'platform.audit.view',
      'platform.flags.write',
      'jobs.view',
      'jobs.retry',
      'render.view',
      'render.retry',
      'ai.config.view',
      'ai.config.write',
      'ai.usage.view',
      'catalogue.view',
      'catalogue.write',
    ],
  },
  analyst: {
    name: 'Analyst',
    description: 'Read-only aggregated metrics',
    permissions: ['platform.dashboard.view', 'analytics.view', 'ai.usage.view', 'billing.view'],
  },
};
