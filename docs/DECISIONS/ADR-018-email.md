# ADR-018 Email: SMTP behind an EmailSender interface; Postmark/Resend after onboarding checks

**Decision.** `packages/email` exposes `EmailSender`; only SMTP is implemented (Mailpit locally, any relay in production). Postmark and Resend are added as adapters once their acceptance of Nigerian-registered senders and DMARC setup are confirmed. The env enum only lists implemented providers so misconfiguration fails at boot rather than silently.
