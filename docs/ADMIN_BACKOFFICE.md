# Staff backoffice

A separate Next.js application (`apps/admin`) on its own hostname, with its own Better Auth instance, cookie prefix (`dex-staff`), secret and Postgres schema (`staff`). Customer identities cannot sign in to it and vice versa (verified by e2e).

## Authentication

- Email/password only for staff (no self sign-up; accounts are created by a super admin — the dev seed creates the first one).
- Password minimum 16 characters; 5 sign-in attempts per 5 minutes per IP.
- TOTP and passkeys available; `STAFF_REQUIRE_MFA=true` blocks every page until MFA is enrolled.
- Sessions: 12 hours, refreshed hourly, never cookie-cached, so deactivation (`staff.user.is_active=false`) and role changes apply on the next request. A DB hook refuses session creation for deactivated users.
- Optional `STAFF_IP_ALLOWLIST` (CIDRs) checked before the session is read.

## Authorization

- Roles and permissions are rows (`staff.role`, `staff.permission`, `staff.role_permission`, `staff.user_role`), seeded from the catalogue in `packages/db/src/catalogue/staff-permissions.ts`.
- Built-in roles: Super Administrator, Platform Administrator, Support Agent, Finance Administrator, Content Moderator, Operations Engineer, Analyst.
- `requireStaff(permission)` resolves grants on each request and throws `DomainError`; denials are audited (`authz.<permission>` with reason).
- Permissions marked `stepUp` need a re-authentication within 5 minutes (`/step-up`: password + TOTP when enrolled); the stamp lives on `staff.session.step_up_verified_at`.
- Customer content is denied by default. `staff.content_access_grant` (justification, ticket reference, approver, expiry ≤ 4h, scope) is the break-glass path; its UI and approver workflow arrive in Phase 7, and every read under a grant will be audited.

## Pages (Phase 1)

| Page         | Permission                                                                | Data                                                                                                                             |
| ------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard` | `platform.dashboard.view`                                                 | users, new users (7d), organizations, workspaces, projects, staff accounts via `platform_counts()`; live BullMQ counts per queue |
| `/flags`     | view: `platform.dashboard.view`; toggle: `platform.flags.write` (step-up) | `feature_flag` + rule counts; toggle writes flag + audit in one transaction                                                      |
| `/audit`     | `platform.audit.view`                                                     | newest 100 `audit_event` rows                                                                                                    |
| `/step-up`   | any staff session                                                         | re-authentication                                                                                                                |

Later phases add user/org management, break-glass grants, subscriptions, AI provider configuration and usage, render/job monitoring with retry, catalogue and licence management, moderation, support tickets and system settings — each gated by the permissions already in the catalogue.
