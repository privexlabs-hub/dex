'use client';
import { createCustomerAuthClient } from '@dex/auth/client/customer';

export const authClient = createCustomerAuthClient(process.env.NEXT_PUBLIC_APP_URL ?? '');
