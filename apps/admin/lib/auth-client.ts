'use client';
import { createStaffAuthClient } from '@dex/auth/client/staff';

export const staffAuthClient = createStaffAuthClient(process.env.NEXT_PUBLIC_ADMIN_URL ?? '');
