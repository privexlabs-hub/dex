# ADR-015 Staff backoffice as a separate app and auth realm

**Decision.** `apps/admin` on its own hostname behind Cloudflare Access/IP allowlist, own Better Auth instance, cookies, secret and Postgres schema; DB-driven RBAC evaluated by one `authorizeStaff()`; step-up for privileged permissions; break-glass grants for customer content; append-only audit. A route group inside the customer app was rejected because it would share sessions, bundles and blast radius.

**Status.** Implemented in Phase 1 (see ../ADMIN_BACKOFFICE.md).
