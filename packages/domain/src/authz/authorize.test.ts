import { describe, expect, it } from 'vitest';
import {
  authorizeOrg,
  authorizeStaff,
  can,
  type CustomerPrincipal,
  type StaffPrincipal,
} from './authorize.js';
import { DomainError } from '../errors/index.js';

const staff = (over: Partial<StaffPrincipal> = {}): StaffPrincipal => ({
  kind: 'staff',
  id: 's1',
  email: 's@dex.test',
  isActive: true,
  mfaEnabled: true,
  permissions: new Set(['org.view', 'org.suspend']),
  stepUpVerifiedAt: new Date(),
  ...over,
});

const code = (fn: () => void) => {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof DomainError ? { code: e.code, details: e.details } : 'other';
  }
};

describe('authorizeStaff', () => {
  it('allows a granted, non-step-up permission', () => {
    expect(code(() => authorizeStaff(staff(), 'org.view'))).toBeNull();
  });
  it('rejects anonymous', () => {
    expect(code(() => authorizeStaff(null, 'org.view'))).toEqual({
      code: 'UNAUTHENTICATED',
      details: undefined,
    });
  });
  it('rejects customer principals', () => {
    const user: CustomerPrincipal = {
      kind: 'user',
      id: 'u',
      email: 'u@x',
      emailVerified: true,
      memberships: new Map(),
    };
    expect(code(() => authorizeStaff(user, 'org.view'))).toMatchObject({ code: 'FORBIDDEN' });
  });
  it('rejects deactivated accounts', () => {
    expect(code(() => authorizeStaff(staff({ isActive: false }), 'org.view'))).toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('requires MFA when enforced', () => {
    expect(code(() => authorizeStaff(staff({ mfaEnabled: false }), 'org.view'))).toMatchObject({
      code: 'FORBIDDEN',
      details: { reason: 'mfa_required' },
    });
    expect(
      code(() =>
        authorizeStaff(staff({ mfaEnabled: false }), 'org.view', { requireStaffMfa: false }),
      ),
    ).toBeNull();
  });
  it('rejects missing permission', () => {
    expect(code(() => authorizeStaff(staff(), 'billing.refund'))).toMatchObject({
      code: 'FORBIDDEN',
    });
  });
  it('requires fresh step-up for privileged permissions', () => {
    const stale = staff({ stepUpVerifiedAt: new Date(Date.now() - 10 * 60 * 1000) });
    expect(code(() => authorizeStaff(stale, 'org.suspend'))).toMatchObject({
      code: 'STEP_UP_REQUIRED',
    });
    expect(code(() => authorizeStaff(staff(), 'org.suspend'))).toBeNull();
    expect(
      code(() => authorizeStaff(staff({ stepUpVerifiedAt: null }), 'org.suspend')),
    ).toMatchObject({
      code: 'STEP_UP_REQUIRED',
    });
  });
  it('can() never throws', () => {
    expect(can(null, 'org.view')).toBe(false);
    expect(can(staff(), 'org.view')).toBe(true);
  });
});

describe('authorizeOrg', () => {
  const user: CustomerPrincipal = {
    kind: 'user',
    id: 'u1',
    email: 'u@x',
    emailVerified: true,
    memberships: new Map([
      ['org_a', 'member'],
      ['org_b', 'owner'],
    ]),
  };
  it('allows members of the org', () => {
    expect(code(() => authorizeOrg(user, 'org_a'))).toBeNull();
  });
  it('denies cross-tenant access', () => {
    expect(code(() => authorizeOrg(user, 'org_c'))).toMatchObject({ code: 'FORBIDDEN' });
  });
  it('enforces role rank', () => {
    expect(code(() => authorizeOrg(user, 'org_a', 'admin'))).toMatchObject({ code: 'FORBIDDEN' });
    expect(code(() => authorizeOrg(user, 'org_b', 'admin'))).toBeNull();
  });
  it('denies staff principals', () => {
    expect(code(() => authorizeOrg(staff(), 'org_a'))).toMatchObject({ code: 'FORBIDDEN' });
  });
});
