import { expect, test } from '@playwright/test';
import { ADMIN, STAFF_EMAIL, STAFF_PASSWORD } from './helpers';

test.describe('staff backoffice', () => {
  test.use({ baseURL: ADMIN });
  // The staff realm rate-limits sign-in to 5 attempts per 5 minutes; running this
  // spec once per browser project keeps CI well inside that budget.
  test.skip(
    ({ browserName, isMobile }) => browserName !== 'chromium' || isMobile === true,
    'desktop-only',
  );

  test('requires staff sign-in, shows real metrics, enforces step-up on privileged actions and audits them', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.getByLabel('Staff email').fill(STAFF_EMAIL);
    await page.getByLabel('Password').fill(STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Staff accounts')).toBeVisible();
    await expect(page.locator('table tbody tr')).toHaveCount(6); // one row per queue

    await page.goto('/flags');
    const toggle = page.getByRole('button', { name: /Turn (on|off)/ }).first();
    await toggle.click();
    await expect(page).toHaveURL(/\/step-up\?next=%2Fflags|\/step-up\?next=\/flags/);

    await page.getByLabel('Password').fill('definitely-not-the-password');
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page).toHaveURL(/error=invalid/);

    await page.getByLabel('Password').fill(STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page).toHaveURL(/\/flags$/);
    const before = await page
      .getByRole('button', { name: /Turn (on|off)/ })
      .first()
      .textContent();
    await page
      .getByRole('button', { name: /Turn (on|off)/ })
      .first()
      .click();
    await expect(page.getByRole('button', { name: /Turn (on|off)/ }).first()).not.toHaveText(
      before ?? '',
    );

    await page.goto('/audit');
    const audit = page.locator('table');
    await expect(audit).toContainText('staff.step_up');
    await expect(audit).toContainText('platform.flag.toggle');
    await expect(audit).toContainText('authz.platform.flags.write');
  });

  test('customer credentials are rejected by the staff realm', async ({ request }) => {
    const res = await request.post(`${ADMIN}/api/staff-auth/sign-in/email`, {
      data: { email: 'ada@example.test', password: 'correct-horse-battery-staple' },
      headers: { Origin: ADMIN },
    });
    // 401 = rejected credentials; 429 = the realm's sign-in rate limit (5 per 5 min) already tripped.
    expect([401, 429]).toContain(res.status());
    expect(res.headers()['set-cookie'] ?? '').not.toContain('dex-staff.session_token');
  });
});
