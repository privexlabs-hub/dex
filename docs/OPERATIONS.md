# Operations

## Processes

| Process       | Image                                                      | Port | Health                                                            | Scaling                                                        |
| ------------- | ---------------------------------------------------------- | ---- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web`    | `apps/web/Dockerfile` (Next standalone, Node 26, non-root) | 3000 | `GET /api/health` (Postgres ping)                                 | horizontal; stateless                                          |
| `apps/admin`  | `apps/admin/Dockerfile`                                    | 3100 | `GET /api/health`                                                 | 1–2 instances behind Cloudflare Access                         |
| `apps/worker` | `apps/worker/Dockerfile`                                   | 4000 | `GET /health` (liveness), `GET /ready` (Postgres, Redis, storage) | per role via `WORKER_ROLES`; queue-depth autoscaling (Phase 4) |

Workers drain on `SIGTERM`: in-flight jobs receive an `AbortSignal`, the BullMQ worker closes, then pools close, within a 25s deadline. Deploys use rolling replacement so a job is never killed without a chance to checkpoint.

## Environments

| Environment      | Database                                                                       | Storage                 | Secrets                        | Notes                               |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------- | ------------------------------ | ----------------------------------- |
| Local            | Docker Postgres 18 + pgvector                                                  | MinIO                   | `.env` (git-ignored)           | `pnpm infra:up`                     |
| Preview (per PR) | Neon branch from `staging`                                                     | R2 bucket `dex-preview` | secrets manager, preview scope | auto-deleted on PR close            |
| Staging          | Neon project `dex-staging` (Frankfurt)                                         | R2 `dex-staging`        | secrets manager                | migrations applied before promotion |
| Production       | Neon project `dex-prod` (Frankfurt, Launch plan; Scale when SOC 2 is required) | R2 `dex-prod`           | secrets manager                | scale-to-zero disabled              |

Required out-of-band setup per environment: the `dex_app` role (NOBYPASSRLS) in Postgres, the R2 bucket with public access disabled, DNS + Cloudflare Access policy for the admin hostname.

## Deploy and rollback

1. CI builds images on `main` and pushes them tagged with the commit SHA (pipeline step to be added when the registry exists).
2. `pnpm db:migrate` runs against the target database with the owner URL **before** the new images start (expand/contract migrations keep the previous version running).
3. Rolling restart of web, admin, worker.
4. Rollback = redeploy the previous image tag. Contract migrations are only applied after the deploy that stopped using the column has been stable for 24h.

## Backups and restore

- Neon point-in-time restore (7 days on Launch, 30 on Scale) plus a nightly `pg_dump` to a separate-account R2 bucket (job to be scheduled in Phase 2 with the `system` worker role).
- Quarterly restore drill: restore a branch from PITR, run the integration suite against it, record the result in `docs/OPERATIONS.md` history.

## Observability

- Logs: pino JSON to stdout; secrets and auth headers redacted (`packages/observability`).
- Traces/metrics: OpenTelemetry SDK 3 → OTLP/HTTP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (Grafana Cloud recommended; any OTLP backend works). Next.js apps register through `instrumentation.ts`; the worker through `startTelemetry()`.
- Health probes above; the staff dashboard shows live queue counts from Redis and platform counts from Postgres.
- Alerts (to configure with the backend): worker `/ready` failing > 2 min, failed-job rate, render duration p95, 5xx rate, Postgres connection saturation.

## Runbooks

**Staff account locked / needs reset** — a super admin deactivates/reactivates via the DB until the Phase 7 UI lands; password reset goes through the staff realm's reset email (15-minute token).

**Rotate a secret** — update the secrets manager, roll the affected process; Better Auth secrets rotation invalidates sessions (announce first).

**Queue backlog** — check `/dashboard` queue table; scale the role's worker count; failed jobs keep their error and can be retried from the Phase 7 jobs UI (or via BullMQ CLI until then).

**Audit chain verification** — `select count(*) from audit_event where previous_hash is distinct from lag(hash) …` (job scheduled in Phase 8); any break is an incident.
