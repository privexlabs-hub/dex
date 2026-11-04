# Testing

| Layer                       | Tool                                                     | Location                                             | Runs in                                                                                |
| --------------------------- | -------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Unit                        | Vitest 5                                                 | `packages/*/src/**/*.test.ts`, `apps/*/**/*.test.ts` | `pnpm test` (Turbo), CI `verify`                                                       |
| Integration (live services) | Vitest                                                   | `*.integration.test.ts` in `db`, `queue`, `storage`  | `pnpm test:integration`, CI `integration` with Postgres/Redis/MinIO service containers |
| End-to-end                  | Playwright 1.64 (Pixel 7 + Desktop Chrome projects)      | `e2e/*.spec.ts`                                      | `pnpm test:e2e` against running apps; CI `e2e` boots production builds + Mailpit       |
| Static                      | ESLint 9 (type-aware), tsc, Prettier, dependency-cruiser | repo-wide                                            | CI `verify`                                                                            |
| Supply chain                | `pnpm audit --prod --audit-level high`, Renovate         |                                                      | CI `verify`                                                                            |

## What the Phase 1 tests prove

- `authorizeStaff` / `authorizeOrg`: unauthenticated, wrong realm, deactivated, MFA-required, missing permission, stale step-up, role rank, cross-tenant membership.
- Permission catalogue consistency: every built-in role references real permissions; only `super_admin` has `ALL`; analysts/support cannot write config or approve content access.
- Env validation: defaults, composed schemas, signed-URL TTL cap, no value echo in errors.
- Log redaction: passwords, bearer tokens, cookies and database URLs never appear in output.
- Flags: rule priority, org/plan targeting, deterministic rollout buckets, archived fallback.
- Job contracts: tenant context required; valid pings parse.
- Storage keys: traversal-safe, tenant-checked; integration: put/head/sign/fetch/delete and cross-tenant signing refusal.
- Auth realms: distinct cookie prefixes/base paths, staff sign-up disabled, password minimums, session lifetimes, plugin sets.
- RLS (integration): cross-tenant read empty, cross-tenant write rejected, no-context fails closed, owner bypass; audit log immutable for both roles.
- Queue (integration): validated job round-trip; duplicate enqueue coalesces on idempotency key.
- E2E customer: sign-up → verification email (Mailpit API) → unverified sign-in refused → verify → onboarding server action → dashboard → sign-out → protected route redirects; open-redirect guard.
- E2E staff: unauthenticated redirect, metrics render, privileged action redirects to step-up, wrong password refused, step-up succeeds, flag toggles, audit shows step-up + toggle + the earlier denial; customer credentials rejected on the staff realm.

## Running locally

```bash
pnpm check                       # lint, typecheck, unit, build
set -a; . ./.env; set +a         # or use direnv
pnpm test:integration
pnpm test:e2e                    # apps must be running (pnpm dev or production builds)
```

Playwright browsers: `pnpm exec playwright install chromium`, or set `E2E_CHROME_CHANNEL=chrome` to use an installed Google Chrome.

## Quality gates

A PR merges only when `verify`, `integration` and `e2e` are green. New entities must ship with an authz test and, if tenant-scoped, an RLS integration case. Mobile viewport coverage is mandatory for every customer-facing flow.
