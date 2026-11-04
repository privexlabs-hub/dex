# ADR-005 Authentication: self-hosted Better Auth with two realms

**Context.** Customers need email verification, TOTP, passkeys, organizations, session revocation; staff need a separate identity space, enforced MFA, step-up, IP allowlists, audit hooks.

**Options.** Neon Managed Better Auth · self-hosted Better Auth · Auth.js · Clerk · custom.

**Decision.** Self-host Better Auth 1.7.16 twice: customer realm (public schema, organization plugin) and staff realm (`staff` schema, no sign-up, stricter limits). Shared library, nothing else shared. DB sessions, no JWT.

**Consequences.** Auth tables live in our migrations; plugin schema changes must be mirrored (Better Auth validates and reports missing columns at boot, which caught two in Phase 1). Managed Auth rejected because realm separation and staff policies would be out of our control.

**Sources.** better-auth.com docs (drizzle adapter, two-factor, passkey, organization).
