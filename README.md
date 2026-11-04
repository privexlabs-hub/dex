# DeX

AI product marketing, video creation and creative production platform. A founder gives DeX a real software product (website, docs, repository, screenshots, recordings); DeX understands it, extracts its brand, proposes original marketing concepts, builds an editable storyboard, renders a professional video with the real product UI, and packages ready-to-publish deliverables. Mobile-first, with a separate staff backoffice.

**Status: Phase 1 (application foundation) — implemented and verified.** Product ingestion, AI, rendering and the editor arrive in Phases 2–6. Nothing in this repository simulates those features; what is not built is not present.

## What exists today

| Area                            | Implemented                                                                                                                                                                                                                                                                                                     | Verified by                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Monorepo                        | pnpm 12 workspaces + Turborepo, shared TS/ESLint/Prettier config, dependency-direction rules                                                                                                                                                                                                                    | `pnpm check`, `pnpm deps:check`                                                                                       |
| Customer app (`apps/web`)       | Next.js 16 App Router; email/password sign-up with mandatory verification, sign-in, organization onboarding, workspace dashboard, sign-out; security headers; edge proxy + server-side session gate                                                                                                             | Playwright `e2e/customer-journey.spec.ts` (Pixel 7 and desktop viewports)                                             |
| Staff backoffice (`apps/admin`) | Separate Better Auth realm (own tables/secret/cookies), no self sign-up, optional IP allowlist, MFA enforcement switch, DB-driven RBAC with 7 built-in roles and 31 permissions, step-up re-authentication for privileged actions, real platform metrics, queue counts, feature-flag toggling, audit log viewer | Playwright `e2e/staff-backoffice.spec.ts`                                                                             |
| Database (`packages/db`)        | Drizzle schema (customer auth, tenancy, staff realm, RBAC, break-glass grants, append-only hash-chained audit log, feature flags, system settings), migrations, Row-Level Security on tenant tables, non-owner application role, tenant-scoped transactions                                                     | Integration test proves cross-tenant reads/writes are blocked and audit rows cannot be updated or deleted by any role |
| Queue (`packages/queue`)        | BullMQ 6 on Redis, Zod job contracts, idempotent enqueue, worker factory with abort signals; `apps/worker` with role selection, readiness probes, graceful shutdown                                                                                                                                             | Integration round-trip test; readiness probe                                                                          |
| Storage (`packages/storage`)    | S3-compatible client (R2 in production, RustFS locally), tenant-prefixed keys, short-lived signed URLs that refuse other tenants' keys                                                                                                                                                                          | Integration test                                                                                                      |
| Observability                   | pino with secret redaction, OpenTelemetry SDK 3 bootstrap (OTLP/HTTP), shutdown manager                                                                                                                                                                                                                         | Unit test for redaction                                                                                               |
| Flags                           | Postgres-backed OpenFeature provider with org/user/plan/rollout rules                                                                                                                                                                                                                                           | Unit tests                                                                                                            |
| CI                              | Lint, typecheck, unit tests, build, audit, integration tests, e2e, Docker image builds                                                                                                                                                                                                                          | `.github/workflows/ci.yml`                                                                                            |

See `docs/` for architecture, database, security, operations and the decision records.

## Local setup

Full walkthrough, including every key and production setup: **[docs/SETUP.md](docs/SETUP.md)**.

Requirements: Node.js 26 (see `.nvmrc`; 22.12+ works), Docker (for Postgres/Redis/RustFS/Mailpit), pnpm 12.

```bash
npm install -g pnpm@12.16.1
pnpm install
cp .env.example .env.local      # then generate the two auth secrets (docs/SETUP.md, step 3)
pnpm infra:up                   # Postgres 18 + pgvector, Redis 8, RustFS, Mailpit; creates the bucket
pnpm db:migrate                 # applies packages/db/drizzle with the owner role
pnpm db:seed:dev                # built-in staff roles + a super admin (dev only)
pnpm dev                        # builds packages, then web :3000, admin :3100, worker :4000
```

Default dev staff login: `admin@dex.localhost` / `change-me-before-anything-else!` (override with `SEED_STAFF_EMAIL` / `SEED_STAFF_PASSWORD`). Emails land in Mailpit at http://localhost:58025. RustFS console: http://localhost:59001.

`neon.ts`/Neon branches are used for shared environments; locally everything runs in Docker.

## Commands

| Command                 | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `pnpm check`            | lint + typecheck + unit tests + build                                           |
| `pnpm test:integration` | DB/queue/storage tests against live services (reads env)                        |
| `pnpm test:e2e`         | Playwright against running apps (`E2E_WEB_URL`, `E2E_ADMIN_URL`, `MAILPIT_URL`) |
| `pnpm deps:check`       | dependency-cruiser boundary rules                                               |
| `pnpm db:generate`      | generate a migration from schema changes (review the SQL)                       |
| `pnpm audit`            | fails on high/critical advisories                                               |

## Environment variables

Every variable is documented in `.env.example`. Every pnpm script loads the root `.env.local` automatically; `.env.production` is a fill-in sheet that the apps never load. Variables are validated at process start by `packages/env` (missing or invalid keys fail fast and never echo values). Two database URLs are required: `DATABASE_URL` (application role, subject to RLS) and `DATABASE_ADMIN_URL` (owner, migrations/seeds only). See [docs/SETUP.md](docs/SETUP.md).

## Repository layout

```
apps/web        customer application (Next.js)
apps/admin      staff backoffice (Next.js, separate auth realm)
apps/worker     background worker (BullMQ); WORKER_ROLES selects queues
packages/config shared ESLint / TS / Prettier presets
packages/env    validated configuration
packages/db     Drizzle schema, migrations, tenant-scoped client, permission catalogue
packages/domain authorization, domain errors, audit writer
packages/auth   Better Auth realms (customer, staff) + principal resolvers
packages/queue  BullMQ contracts, queues, worker factory
packages/storage S3-compatible storage with tenant-prefixed signed URLs
packages/observability pino + OpenTelemetry + shutdown
packages/flags  Postgres-backed OpenFeature provider
packages/email  SMTP sender + templates
docker/         local infrastructure
docs/           architecture, database, security, operations, ADRs
e2e/            Playwright suites
```

## Deployment

Each app ships as a Docker image (`apps/*/Dockerfile`, Node 26, non-root). Target topology, environments, backups and rollback are described in `docs/OPERATIONS.md`. Production secrets come from the secrets manager, never from files.
