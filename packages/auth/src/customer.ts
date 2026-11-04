import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { organization, twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { schema, type Database } from '@dex/db';
import { templates, type EmailSender } from '@dex/email';

export interface CustomerAuthConfig {
  db: Database;
  secret: string;
  baseUrl: string;
  appUrl: string;
  email: EmailSender;
  /** Hostname used as WebAuthn rpID (e.g. app.dex.example). */
  rpId: string;
  appEnv: 'development' | 'test' | 'staging' | 'production';
}

/**
 * Customer realm. Email/password with mandatory verification, optional TOTP
 * and passkeys, organizations as the tenant boundary.
 *
 * Sessions are database-backed (no JWT) so revocation is immediate.
 */
export function createCustomerAuth(cfg: CustomerAuthConfig) {
  return betterAuth({
    appName: 'DeX',
    secret: cfg.secret,
    baseURL: cfg.baseUrl,
    trustedOrigins: [cfg.appUrl],
    database: drizzleAdapter(cfg.db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        twoFactor: schema.twoFactor,
        passkey: schema.passkey,
        organization: schema.organization,
        member: schema.member,
        invitation: schema.invitation,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      sendResetPassword: async ({ user, url }) => {
        const t = templates.resetPassword(url);
        await cfg.email.send({ to: user.email, ...t });
      },
      resetPasswordTokenExpiresIn: 60 * 60,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        const t = templates.verifyEmail(url);
        await cfg.email.send({ to: user.email, ...t });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/forget-password': { window: 300, max: 3 },
      },
    },
    advanced: {
      cookiePrefix: 'dex',
      useSecureCookies: cfg.appEnv === 'production' || cfg.appEnv === 'staging',
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'fly-client-ip', 'x-forwarded-for'] },
    },
    user: {
      changeEmail: { enabled: true },
      deleteUser: { enabled: true },
    },
    plugins: [
      twoFactor({ issuer: 'DeX' }),
      passkey({ rpID: cfg.rpId, rpName: 'DeX', origin: cfg.appUrl }),
      organization({
        allowUserToCreateOrganization: true,
        organizationLimit: 5,
        sendInvitationEmail: async ({ email, organization: org, id }) => {
          const url = `${cfg.appUrl}/invite/${id}`;
          const t = templates.organizationInvite(org.name, url);
          await cfg.email.send({ to: email, ...t });
        },
      }),
      nextCookies(),
    ],
  });
}

export type CustomerAuth = ReturnType<typeof createCustomerAuth>;
