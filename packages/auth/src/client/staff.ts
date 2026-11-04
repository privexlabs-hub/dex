import { createAuthClient } from 'better-auth/react';
import { twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

export function createStaffAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    basePath: '/api/staff-auth',
    plugins: [twoFactorClient(), passkeyClient()],
  });
}
export type StaffAuthClient = ReturnType<typeof createStaffAuthClient>;
