import { createAuthClient } from 'better-auth/react';
import { organizationClient, twoFactorClient } from 'better-auth/client/plugins';
import { passkeyClient } from '@better-auth/passkey/client';

export function createCustomerAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [twoFactorClient(), passkeyClient(), organizationClient()],
  });
}
export type CustomerAuthClient = ReturnType<typeof createCustomerAuthClient>;
