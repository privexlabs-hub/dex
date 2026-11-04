import { describe, expect, it } from 'vitest';
import { BUILT_IN_STAFF_ROLES, STAFF_PERMISSIONS } from './staff-permissions.js';

describe('staff permission catalogue', () => {
  it('every built-in role references only catalogued permissions', () => {
    for (const [key, role] of Object.entries(BUILT_IN_STAFF_ROLES)) {
      if (role.permissions === 'ALL') continue;
      for (const p of role.permissions) {
        expect(STAFF_PERMISSIONS, `${key} -> ${p}`).toHaveProperty(p);
      }
    }
  });
  it('only super_admin has ALL', () => {
    const all = Object.entries(BUILT_IN_STAFF_ROLES)
      .filter(([, r]) => r.permissions === 'ALL')
      .map(([k]) => k);
    expect(all).toEqual(['super_admin']);
  });
  it('analyst and support cannot write platform config or approve content access', () => {
    for (const role of ['analyst', 'support_agent'] as const) {
      const perms = BUILT_IN_STAFF_ROLES[role]?.permissions;
      expect(perms).not.toContain('platform.settings.write');
      expect(perms).not.toContain('content.access.approve');
      expect(perms).not.toContain('staff.role.write');
    }
  });
});
