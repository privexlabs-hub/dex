import { expect, type APIRequestContext } from '@playwright/test';

export const WEB = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
export const ADMIN = process.env.E2E_ADMIN_URL ?? 'http://localhost:3100';
export const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';

export const STAFF_EMAIL = process.env.SEED_STAFF_EMAIL ?? 'admin@dex.localhost';
export const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD ?? 'change-me-before-anything-else!';

export function uniqueEmail(prefix: string): string {
  return `${prefix}+${Date.now()}${Math.floor(Math.random() * 1000)}@example.test`;
}

/** Poll Mailpit's API for the newest message to `to` and extract the first matching link. */
export async function waitForLink(
  request: APIRequestContext,
  to: string,
  pattern: RegExp,
): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await request.get(`${MAILPIT}/api/v1/search?query=to:${encodeURIComponent(to)}`);
    if (list.ok()) {
      const data = (await list.json()) as { messages?: { ID: string }[] };
      const id = data.messages?.[0]?.ID;
      if (id) {
        const msg = await request.get(`${MAILPIT}/api/v1/message/${id}`);
        const body = (await msg.json()) as { Text?: string; HTML?: string };
        const m = (body.Text ?? body.HTML ?? '').match(pattern);
        if (m) return m[0];
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  expect.soft(false, `no email to ${to} matching ${pattern}`).toBe(true);
  throw new Error(`no email to ${to}`);
}
