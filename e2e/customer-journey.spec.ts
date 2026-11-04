import { expect, test } from '@playwright/test';
import { uniqueEmail, waitForLink } from './helpers';

const PASSWORD = 'correct-horse-battery-staple';

test.describe('customer foundation journey', () => {
  test('sign up, verify email, sign in, create organization, reach dashboard, sign out', async ({
    page,
    request,
  }) => {
    const email = uniqueEmail('e2e');

    await page.goto('/sign-up');
    await page.getByLabel('Name').fill('E2E User');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('status')).toContainText('verify');

    // Unverified accounts cannot sign in.
    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    // Next's route announcer is also role=alert, so target the form's own alert element.
    await expect(page.locator('p[role="alert"]')).toContainText(/not verified/i);

    const link = await waitForLink(
      request,
      email,
      /https?:\/\/[^\s]+\/api\/auth\/verify-email\?[^\s)]+/,
    );
    await page.goto(link);
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByLabel('Organization name').fill('E2E Org');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Default')).toBeVisible();
    await expect(page.getByText('No projects yet')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fdashboard$/);
  });

  test('open-redirect guard ignores absolute next targets', async ({ page }) => {
    await page.goto('/sign-in?next=https://evil.example');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
