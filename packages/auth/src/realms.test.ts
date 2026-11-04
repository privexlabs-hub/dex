import { afterAll, describe, expect, it } from 'vitest';
import { createDatabase } from '@dex/db';
import type { EmailSender } from '@dex/email';
import { createCustomerAuth } from './customer.js';
import { createStaffAuth } from './staff.js';

// pg.Pool connects lazily, so constructing auth instances needs no database.
const { db, pool } = createDatabase({
  connectionString: 'postgres://u:p@127.0.0.1:1/none',
  max: 1,
});
const email: EmailSender = {
  send: async () => ({ messageId: 'x' }),
  check: async () => ({ ok: true }),
};
const secret = 's'.repeat(48);

afterAll(() => pool.end());

describe('auth realms are isolated', () => {
  const customer = createCustomerAuth({
    db,
    secret,
    baseUrl: 'http://app.test',
    appUrl: 'http://app.test',
    email,
    rpId: 'app.test',
    appEnv: 'test',
  });
  const staff = createStaffAuth({
    db,
    secret: secret.replace('s', 'x'),
    baseUrl: 'http://admin.test',
    adminUrl: 'http://admin.test',
    email,
    rpId: 'admin.test',
    appEnv: 'test',
  });

  it('use different cookie prefixes and base paths', () => {
    expect(customer.options.advanced?.cookiePrefix).toBe('dex');
    expect(staff.options.advanced?.cookiePrefix).toBe('dex-staff');
    expect((staff.options as { basePath?: string }).basePath).toBe('/api/staff-auth');
    expect((customer.options as { basePath?: string }).basePath).toBeUndefined();
  });

  it('staff realm forbids self sign-up and demands longer passwords', () => {
    expect(staff.options.emailAndPassword?.disableSignUp).toBe(true);
    expect(staff.options.emailAndPassword?.minPasswordLength).toBe(16);
    expect(customer.options.emailAndPassword?.requireEmailVerification).toBe(true);
    expect(customer.options.emailAndPassword?.minPasswordLength).toBe(12);
  });

  it('staff sessions are shorter and never cookie-cached', () => {
    expect(staff.options.session?.expiresIn).toBeLessThan(
      customer.options.session?.expiresIn ?? Infinity,
    );
    expect(staff.options.session?.cookieCache?.enabled).toBe(false);
  });

  it('only the customer realm has organizations', () => {
    const ids = (a: { options: { plugins?: { id: string }[] } }) =>
      (a.options.plugins ?? []).map((p) => p.id);
    expect(ids(customer)).toContain('organization');
    expect(ids(staff)).not.toContain('organization');
    expect(ids(staff)).toContain('two-factor');
    expect(ids(staff)).toContain('passkey');
  });
});
