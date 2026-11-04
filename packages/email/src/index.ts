import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(msg: EmailMessage): Promise<{ messageId: string }>;
  check(): Promise<{ ok: true }>;
}

export interface SmtpConfig {
  provider: 'smtp';
  smtpUrl: string;
  from: string;
}

export type EmailConfig = SmtpConfig;

/**
 * Create the email sender for the configured provider. Only SMTP exists today;
 * additional providers implement `EmailSender` and are selected by
 * `EMAIL_PROVIDER` once added (ADR-018).
 */
export function createEmailSender(cfg: EmailConfig): EmailSender {
  const transporter: Transporter = nodemailer.createTransport(cfg.smtpUrl);
  return {
    async send(msg) {
      const info = await transporter.sendMail({
        from: cfg.from,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      });
      return { messageId: info.messageId };
    },
    async check() {
      await transporter.verify();
      return { ok: true };
    },
  };
}

/** Plain-text templates. HTML templates arrive with the design system (Phase 1, UI track). */
export const templates = {
  verifyEmail: (url: string) => ({
    subject: 'Verify your DeX email address',
    text: `Confirm your email address to finish setting up DeX:\n\n${url}\n\nIf you did not create a DeX account, ignore this message.`,
  }),
  resetPassword: (url: string) => ({
    subject: 'Reset your DeX password',
    text: `Use this link to choose a new password. It expires in one hour:\n\n${url}\n\nIf you did not request a reset, ignore this message.`,
  }),
  organizationInvite: (orgName: string, url: string) => ({
    subject: `You have been invited to ${orgName} on DeX`,
    text: `Accept the invitation to join ${orgName}:\n\n${url}`,
  }),
  staffSignIn: (url: string) => ({
    subject: 'DeX staff sign-in link',
    text: `Your staff sign-in link (valid for 10 minutes):\n\n${url}\n\nIf you did not request this, contact security immediately.`,
  }),
};
