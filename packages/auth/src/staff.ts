import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { eq } from 'drizzle-orm';
import { schema, type Database } from '@dex/db';
import { templates, type EmailSender } from '@dex/email';

export interface StaffAuthConfig {
  db: Database;
  secret: string;
  baseUrl: string;
  adminUrl: string;
  email: EmailSender;
  rpId: string;
  appEnv: 'development' | 'test' | 'staging' | 'production';
}

/**
 * Staff realm. Separate secret, cookie prefix, tables (schema `staff`) and
 * sessions. No self-service sign-up: accounts are created by a super admin
 * (seed or staff.user.write). Shorter sessions, no cookie cache so
 * deactivation and role changes apply on the next request.
 */
export function createStaffAuth(cfg: StaffAuthConfig) {
  return betterAuth({
    appName: 'DeX Staff',
    secret: cfg.secret,
    baseURL: cfg.baseUrl,
    basePath: '/api/staff-auth',
    trustedOrigins: [cfg.adminUrl],
    database: drizzleAdapter(cfg.db, {
      provider: 'pg',
      schema: {
        user: schema.staffUser,
        session: schema.staffSession,
        account: schema.staffAccount,
        verification: schema.staffVerification,
        twoFactor: schema.staffTwoFactor,
        passkey: schema.staffPasskey,
      },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: false,
      minPasswordLength: 16,
      maxPasswordLength: 256,
      sendResetPassword: async ({ user, url }) => {
        const t = templates.resetPassword(url);
        await cfg.email.send({ to: user.email, ...t });
      },
      resetPasswordTokenExpiresIn: 15 * 60,
    },
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
      additionalFields: {
        stepUpVerifiedAt: { type: 'date', required: false, input: false },
      },
    },
    user: {
      additionalFields: {
        isActive: { type: 'boolean', required: false, defaultValue: true, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: { '/sign-in/email': { window: 300, max: 5 } },
    },
    advanced: {
      cookiePrefix: 'dex-staff',
      useSecureCookies: cfg.appEnv === 'production' || cfg.appEnv === 'staging',
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'fly-client-ip', 'x-forwarded-for'] },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            // Deactivated staff cannot start a session even with valid credentials.
            const [row] = await cfg.db
              .select({ isActive: schema.staffUser.isActive })
              .from(schema.staffUser)
              .where(eq(schema.staffUser.id, session.userId));
            if (!row?.isActive) return false;
            return { data: session };
          },
        },
      },
    },
    plugins: [
      twoFactor({ issuer: 'DeX Staff', skipVerificationOnEnable: false }),
      passkey({ rpID: cfg.rpId, rpName: 'DeX Staff', origin: cfg.adminUrl }),
      nextCookies(),
    ],
  });
}

export type StaffAuth = ReturnType<typeof createStaffAuth>;
