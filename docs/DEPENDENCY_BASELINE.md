# Dependency baseline

Verified against the npm registry on **2026-11-04** (`npm view <pkg> version license`). Every version below is the exact `latest` dist-tag on that date unless a different pin is stated with a reason. The committed `pnpm-lock.yaml` is the authoritative record; this file explains the choices.

## Runtime and tooling

| Package            | Pinned                                   | Latest on 2026-11-04              | License    | Note                                                                                                                                                                                                                           |
| ------------------ | ---------------------------------------- | --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Node.js            | `26.x` (`.nvmrc`), engines `>=22.12 <27` | 26 LTS (per `@types/node` 26.6.6) | MIT        | Local verification in this session ran on Node 22.23.4; CI and Docker images use Node 26. `vitest` 5 supports 22.12 / 24 / 26 only.                                                                                            |
| pnpm               | 12.16.1                                  | 12.16.1                           | MIT        | `packageManager` field; Corepack installs it.                                                                                                                                                                                  |
| turbo              | 2.11.10                                  | 2.11.10                           | MIT        |                                                                                                                                                                                                                                |
| typescript         | **5.9.3**                                | 7.0.2                             | Apache-2.0 | TypeScript 7 is the new native (Go-based) compiler line. `typescript-eslint` 8.72.1 declares `typescript >=4.8.4 <6.1.0`, and Next.js/Drizzle tooling has not been validated against 7.x in this repo. Re-evaluate in Phase 8. |
| eslint             | **9.39.5**                               | 10.14.0                           | MIT        | Flat config. `eslint-config-next` 16.4.5 pulls `eslint-plugin-import` 2.32 and `eslint-plugin-jsx-a11y` 6.10, whose peer ranges stop at ESLint 9. Move to 10 once those plugins declare support.                               |
| typescript-eslint  | 8.72.1                                   | 8.72.1                            | MIT        |                                                                                                                                                                                                                                |
| prettier           | 3.9.10                                   | 3.9.10                            | MIT        |                                                                                                                                                                                                                                |
| vitest             | 5.1.0                                    | 5.1.0                             | MIT        |                                                                                                                                                                                                                                |
| @playwright/test   | 1.64.1                                   | 1.64.1                            | Apache-2.0 | Next 16 peer `^1.51.1`.                                                                                                                                                                                                        |
| dependency-cruiser | 18.7.2                                   | 18.7.2                            | MIT        | Enforces package dependency direction.                                                                                                                                                                                         |
| tsx                | 4.23.15                                  | 4.23.15                           | MIT        | Dev-only script runner.                                                                                                                                                                                                        |

## Web

| Package                           | Pinned  | License    | Note                                                                                                        |
| --------------------------------- | ------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| next                              | 16.4.5  | MIT        | App Router. Engines `node >=20.9.0`.                                                                        |
| react / react-dom                 | 19.3.1  | MIT        |                                                                                                             |
| @types/react                      | 19.3.0  | MIT        |                                                                                                             |
| tailwindcss, @tailwindcss/postcss | 4.3.4   | MIT        | CSS-first `@theme`.                                                                                         |
| react-aria-components             | 1.22.1  | Apache-2.0 | Accessible primitives for the editor. `@base-ui-components/react` is still `1.0.0-rc.0`, so it is not used. |
| react-hook-form                   | 7.91.0  | MIT        |                                                                                                             |
| zod                               | 4.6.7   | MIT        | Zod 4 is the current major; `drizzle-zod` 0.8.3 supports it.                                                |
| @tanstack/react-query             | 5.105.3 | MIT        |                                                                                                             |
| zustand                           | 5.0.16  | MIT        | Editor store only (Phase 5).                                                                                |
| lucide-react                      | 1.68.0  | ISC        |                                                                                                             |
| @t3-oss/env-core                  | 0.13.11 | MIT        | Env validation with Zod.                                                                                    |

## Data

| Package                  | Pinned  | License    | Note                                                                    |
| ------------------------ | ------- | ---------- | ----------------------------------------------------------------------- |
| drizzle-orm              | 0.45.4  | Apache-2.0 | Stable line. `1.0.0-rc.x` exists; it will be adopted once GA (ADR-004). |
| drizzle-kit              | 0.31.11 | MIT        | `generate` + `migrate`; never `push` against shared environments.       |
| drizzle-zod              | 0.8.3   | MIT        |                                                                         |
| pg                       | 8.23.1  | MIT        | Pool for long-lived processes (web server, workers).                    |
| @neondatabase/serverless | 1.2.0   | MIT        | Reserved for short-lived/edge contexts; not used by default.            |
| @types/pg                | 8.23.1  | MIT        |                                                                         |

## Queue and realtime

| Package | Pinned | License | Note                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bullmq  | 6.6.0  | MIT     | v6 (pluggable backends). The v5→v6 migration guide lists the breaking changes: repeatable jobs replaced by Job Schedulers, `debounce` replaced by deduplication, `Queue.resume()` is async, flow nodes get UUID ids, telemetry `createGauge` required. In v6, `ioredis` is an **optional peer** (`>=5.0.0`), so it is installed explicitly. Plain `connection: { host, port }` still creates an ioredis client; `maxRetriesPerRequest: null` is required for blocking workers. |
| ioredis | 5.11.1 | MIT     | Latest 5.x. ioredis 6.0.0 was released days before this baseline; it will be adopted after BullMQ's docs confirm it.                                                                                                                                                                                                                                                                                                                                                           |

## Auth

| Package     | Pinned | License | Note                                                                                                                                                     |
| ----------- | ------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| better-auth | 1.7.16 | MIT     | Peer: `next ^16`, `drizzle-orm ^0.45.2`, `drizzle-kit >=0.31.4`, `pg ^8`. Two instances (customer realm, staff realm) share the library, not the tables. |

## Storage, observability, flags

| Package                                                                                   | Pinned          | License    | Note                                                                |
| ----------------------------------------------------------------------------------------- | --------------- | ---------- | ------------------------------------------------------------------- |
| @aws-sdk/client-s3, @aws-sdk/s3-request-presigner                                         | 3.1161.0        | Apache-2.0 | S3 API against R2 (prod) / MinIO (local).                           |
| @opentelemetry/api                                                                        | 1.10.0          | Apache-2.0 |                                                                     |
| @opentelemetry/sdk-node                                                                   | 0.300.0         | Apache-2.0 |                                                                     |
| @opentelemetry/sdk-trace-node                                                             | 2.12.0          | Apache-2.0 |                                                                     |
| @opentelemetry/sdk-metrics, @opentelemetry/resources                                      | 3.0.0           | Apache-2.0 |                                                                     |
| @opentelemetry/exporter-trace-otlp-http, exporter-metrics-otlp-http, instrumentation-http | 0.300.0         | Apache-2.0 |                                                                     |
| @opentelemetry/instrumentation-pg                                                         | 0.77.0          | Apache-2.0 |                                                                     |
| @opentelemetry/instrumentation-ioredis                                                    | 0.72.0          | Apache-2.0 |                                                                     |
| @opentelemetry/semantic-conventions                                                       | 1.44.0          | Apache-2.0 |                                                                     |
| @vercel/otel                                                                              | 2.2.1           | Apache-2.0 | Next.js instrumentation hook helper (works self-hosted).            |
| pino                                                                                      | 10.4.0          | MIT        | Structured logs; `pino-pretty` 13.2.0 dev only.                     |
| @openfeature/server-sdk                                                                   | 1.23.0          | Apache-2.0 | Flags evaluated via a Postgres-backed provider in `packages/flags`. |
| hono + @hono/node-server                                                                  | 4.13.16 / 2.1.6 | MIT        | Worker health/metrics endpoint only.                                |

## Later phases (verified now, installed when the phase starts)

| Package                                                                          | Version                                        | License                                                              | Phase                                              |
| -------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| remotion, @remotion/renderer, @remotion/player                                   | 4.0.540                                        | Remotion License (source-available; Company License at 4+ employees) | 4                                                  |
| ai (Vercel AI SDK)                                                               | 7.0.162                                        | Apache-2.0                                                           | 3                                                  |
| @ai-sdk/anthropic / openai / google / xai / elevenlabs                           | 4.0.96 / 4.0.108 / 4.0.111 / 5.0.38 / 3.0.79   | Apache-2.0                                                           | 3–4                                                |
| @anthropic-ai/sdk, openai, @google/genai                                         | 1.4.0 / 7.50.0 / 2.32.0                        | Apache-2.0                                                           | 3                                                  |
| @elevenlabs/elevenlabs-js                                                        | 2.76.0                                         | MIT                                                                  | 4                                                  |
| @paddle/paddle-node-sdk                                                          | 3.10.0                                         | Apache-2.0                                                           | 6                                                  |
| @bachs/sdk                                                                       | 2.0.0                                          | MIT                                                                  | 6 (second adapter)                                 |
| playwright (library)                                                             | 1.64.1                                         | Apache-2.0                                                           | 2                                                  |
| culori / node-vibrant / css-tree / @mozilla/readability / unpdf / mammoth        | 4.0.2 / 4.0.4 / 3.2.1 / 0.6.0 / 2.1.0 / 1.13.0 | MIT / MIT / MIT / Apache-2.0 / MIT / BSD-2-Clause                    | 2                                                  |
| @dnd-kit/react, vaul, motion, @tanstack/react-virtual, @uppy/core + @uppy/aws-s3 | 0.5.3 / 1.1.2 / 14.9.1 / 3.14.26 / 6.3.1       | MIT                                                                  | 5                                                  |
| @sentry/nextjs                                                                   | 11.10.0                                        | MIT                                                                  | 1 (optional, DSN-gated)                            |
| @casl/ability                                                                    | 7.1.1                                          | MIT                                                                  | 7 (if DB-driven `authorize()` proves insufficient) |

## Local environment vs targets

|          | Local sandbox (this session)    | CI / Docker                                      |
| -------- | ------------------------------- | ------------------------------------------------ |
| Node     | 22.23.4                         | 26 LTS                                           |
| FFmpeg   | 6.1.1 (system)                  | 8.1.x LGPL build in the renderer image (Phase 4) |
| Postgres | Docker `pgvector/pgvector:pg18` | Neon (Postgres 18)                               |
| Redis    | Docker `redis:8-alpine`         | Managed Redis                                    |

## Re-verification policy

- Renovate opens grouped PRs weekly; majors are never auto-merged.
- Any change to this file must cite the registry date.
- `pnpm audit --prod` runs in CI and fails on high/critical.
