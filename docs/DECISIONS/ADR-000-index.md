# Architecture Decision Records

Format: Context · Options · Decision · Consequences · Sources. Status is _accepted_ unless noted. Dates are the decision date; versions were verified against the npm registry on 2026-11-04 (see ../DEPENDENCY_BASELINE.md).

| ADR | Decision                                                                        |
| --- | ------------------------------------------------------------------------------- |
| 001 | pnpm workspaces + Turborepo                                                     |
| 002 | Self-hosted Docker on Fly.io Machines for all processes                         |
| 003 | Neon Postgres (Frankfurt) as the system of record                               |
| 004 | Drizzle ORM                                                                     |
| 005 | Self-hosted Better Auth with two isolated realms                                |
| 006 | BullMQ on Redis for background jobs                                             |
| 007 | Remotion 4 self-hosted renderer                                                 |
| 008 | FFmpeg LGPL build with legal review of codecs                                   |
| 009 | Cloudflare R2 behind an S3 abstraction                                          |
| 010 | Payments: Paddle (MoR, international) + Paystack (NGN); Bachs as later adapter  |
| 011 | Vercel AI SDK provider packages under DeX's own abstraction                     |
| 012 | Direct provider calls; no AI gateway in the primary path                        |
| 013 | Originality engine: structural fingerprints, calibrated thresholds, Vendi score |
| 014 | Server-Sent Events + Redis pub/sub for progress                                 |
| 015 | Separate staff application and auth realm                                       |
| 016 | Secrets manager (Infisical or Doppler) with OIDC                                |
| 017 | OpenTelemetry → Grafana Cloud + Sentry                                          |
| 018 | Email: SMTP abstraction now; Postmark/Resend after onboarding checks            |
| 019 | Music/SFX: buy-out + CC0 + reviewed AI audio before partner APIs                |
| 020 | Feature flags in Postgres via OpenFeature                                       |
| 021 | TypeScript 5.9 (not 7.x) and ESLint 9 (not 10) for the baseline                 |
| 022 | Postgres Row-Level Security with a non-owner application role                   |
| 023 | Append-only, hash-chained audit log                                             |
