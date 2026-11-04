# Phase 0 — Discovery & architecture package (verified 4 November 2026)

This is the research package the product owner approved before implementation began. It is kept verbatim for provenance; where implementation diverged (TypeScript 5.9 instead of 7.x, ESLint 9 instead of 10, BullMQ 6 instead of 5), the divergence is recorded in `DEPENDENCY_BASELINE.md` and the ADRs.

## Recommendations summary

| Area          | Recommendation                                                                   | Confidence  | Reason                                                         |
| ------------- | -------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| Runtime       | Node.js 26 LTS "Lithium" (LTS since 28 Oct 2026, supported to end of April 2029) | High        | Longest runway; Node 24 entered Maintenance 20 Oct 2026        |
| Web           | Next.js 16.4.x App Router, React 19.3                                            | High        | Current stable; Cache Components now recommended               |
| Monorepo      | pnpm workspaces + Turborepo                                                      | Medium      | Lightweight task graph; Nx heavier than needed                 |
| Database      | Neon Postgres, aws-eu-central-1 (Frankfurt)                                      | High        | Branching, PITR, standard Postgres exit path                   |
| ORM           | Drizzle (0.45.x stable; 1.0 when GA)                                             | Medium      | SQL-first, RLS policies, `pg` Pool + Neon driver               |
| Queue         | BullMQ on dedicated Redis                                                        | Medium-High | Progress, priorities, flows; avoids keeping Neon compute awake |
| Rendering     | Remotion 4.0.x self-hosted; FFmpeg 8.1.x LGPL build                              | High        | Deterministic React scenes; license understood                 |
| Storage/CDN   | Cloudflare R2 behind S3 API abstraction                                          | Medium      | Video egress dominates storage cost                            |
| Hosting       | Docker on Fly.io Machines (fra) for all process groups                           | Medium      | Co-located with Neon; one image pipeline                       |
| Auth          | Self-hosted Better Auth, separate customer and staff realms                      | Medium      | MFA, passkeys, orgs, full control                              |
| AI            | Vercel AI SDK provider packages + own `packages/ai`; direct calls                | High        | Covers all five required vendors                               |
| Payments      | Paddle + Paystack; Bachs later                                                   | Medium      | Tax offloaded globally; mature NGN rails                       |
| Observability | OpenTelemetry → Grafana Cloud + Sentry                                           | Medium      | Vendor-neutral; GenAI conventions                              |
| Secrets       | Infisical or Doppler                                                             | Medium      | OIDC to CI, per-env sync                                       |

## Could not verify at the time (status after Phase 1)

1. Library versions and SPDX ids — **verified from the registry on 2026-11-04**, see `DEPENDENCY_BASELINE.md`.
2. BullMQ major — **v6.6.0 is `latest`**; adopted (ADR-006).
3. Drizzle — **0.45.4 stable; 1.0.0-rc** exists; 0.45.4 adopted.
4. OpenAI, Gemini, xAI model ids, pricing, structured outputs, zero-retention — still open (Phase 3 seed).
5. ElevenLabs model names, pricing, SDK, music/SFX terms — still open (Phase 4); voice-cloning rules verified.
6. Neon egress allowance, SOC 2 plan mapping, AI Gateway markup — still open (not on the critical path).
7. Pricing for R2, Fly.io, Railway, Hetzner, Upstash, Grafana Cloud, Sentry, Resend, Postmark — still open.
8. Bachs fees page, payment-method page, payout rails, licensed partner, CBN licence, refund/dispute timelines — still open; Bachs is a later adapter (ADR-010).
9. Paddle payout currencies and approval of an AI video SaaS — apply early (Phase 2).
10. Lagos round-trip latency to Frankfurt / Cape Town / Johannesburg — measure in Phase 2.
11. Whether Remotion's bundled FFmpeg includes GPL components — legal review in Phase 4.
12. Music/SFX catalogue licences — Phase 4.

## A. Technology stack baseline

Node.js 26 LTS (Linux binaries link `libatomic` since Node 25 — included in base images); Next.js 16.4 (Cache Components default; monthly security releases, several critical RCE fixes shipped in 16.3.x); React 19.3; React Compiler experimental (not enabled until Phase 8); Turbopack default; pnpm + Turborepo; Tailwind v4 (`@theme`, OKLCH); shadcn/ui pattern on React Aria or Base UI primitives (Base UI still RC → React Aria); React Hook Form + Zod 4; TanStack Query, Zustand (editor only); Drizzle; BullMQ; `ai` 7.x; Remotion 4.0.540 (Remotion License); FFmpeg 8.1.x LGPL; Vitest, Playwright, Testing Library, BrowserStack real iOS; ESLint flat config + typescript-eslint + Prettier; OpenTelemetry JS; OpenFeature + Postgres provider; Docker Compose (Postgres + pgvector, Redis, MinIO, Mailpit, ClamAV, renderer).

## B. Backend platform evaluation

**Neon Functions (official runtime-limits page, 16 Sep 2026):** Node.js 24 microVM; "2048 MiB (fixed, not configurable)"; "Time to first byte: 15 minutes"; `waitUntil` capped at 15 minutes and "not a background job runner"; eviction with 5 s SIGINT grace; default 100 concurrent invocations. **Conclusion:** rendering, media processing, headless capture and long AI workflows must not run there.

**Neon pricing:** Free 100 CU-h/project; Launch $0.106/CU-h, 7-day history; Scale $0.222/CU-h, 30-day history, SOC 2/HIPAA eligibility (secondary); storage $0.35/GB-month; instant restore $0.20/GB-month; Object Storage $0.023/GB-month. A Postgres-polling queue would keep ≥1 CU awake (≈$77/month Launch, ≈$162 Scale) — a concrete reason for Redis. Lock-in limited to branching, serverless driver, `neon.ts`, `neon_auth`, Functions, Object Storage, AI Gateway; DeX uses Postgres + branching only. No African region; Frankfurt chosen.

**Alternatives (1–5):** Neon + R2 + Fly Machines (5/5/5/3/5, recommended); Supabase (good DB, wrong compute); AWS af-south-1 (strong at scale, heavy ops); GCP Johannesburg (viable render fleet); Azure South Africa North (no advantage); Cloudflare (R2/CDN only); Railway/Render (fallbacks); Fly.io (recommended compute, jnb region); Hetzner (cheapest render fleet at scale).

**Next.js hosting:** Vercel acceptable for `apps/web` only; Netlify/OpenNext need adapter parity testing; **self-hosted Docker on Fly.io (fra)** recommended.

**Cost estimates (indicative):** pre-launch $40–300/month; 1,000 users / 2,000 renders $1,100–2,700; 20,000 users / 50,000 renders $16,000–44,000. AI inference and voice are 70–80% of variable cost; levers: model routing, prompt caching (Opus 5.5 cache hits $0.20/MTok vs $4), 50%-off Batch API, cached ingestion, credits for regenerations, Hetzner render fleet. Claude 4.7+ tokenizers produce ~30% more tokens for the same text.

## C. Payment provider evaluation

**Bachs (verified):** Bachs Technologies Limited, Nigeria (RC 9494536), Merchant Terms effective 1 Aug 2026; "You are the seller of record"; "a technology provider and does not itself perform those regulated activities"; not MoR; no CBN licence or partner named; fees: NGN transfer 1.5% capped ₦2,000, virtual accounts 1% capped ₦300, local cards 2%, international cards 5% + 40¢, mobile money 2–3%, crypto 1.5%; fees retained on refunds/chargebacks, US$15 chargeback fee may be passed through; USD cards from 120+ countries, Apple/Google Pay, NGN transfer, mobile money in nine currencies, crypto; payout docs inconsistent (verify in sandbox); subscriptions via recurring-product checkout, USD cards only (`BASE_CURRENCY_NOT_HELD_BY_ORG`); `@bachs/sdk` TypeScript; status page 99.7–99.8%. Good API design; disqualified as sole first provider; adopt as second adapter after partner disclosure, sandbox-verified payouts/refunds/disputes and status history.

**Comparison:** Paddle (MoR; Nigeria VAT 7.5% B2B & B2C, EU/UK VAT, US sales tax; "Pay-as-you-go 5% + 50¢"; wire $15 or Payoneer; product approval required). Paystack (NG/GH/KE/ZA/CI; local 1.5% + ₦100 waived < ₦2,500, cap ₦2,000; international 3.9% + ₦100 / 4.5% Amex; card-token subscriptions; USD settlement via domiciliary pilot, secondary). Stripe: no direct Nigerian accounts; Atlas US entity ($500 setup, $100/yr) is a later option. Lemon Squeezy/Polar/Creem: Nigeria payouts per third-party sources only. Dodo: closed to new Nigerian sellers since 23 Mar 2026 (third-party). Flutterwave, Interswitch, Monnify, Korapay, Moniepoint, Chipper, PawaPay, DPO, Peach, Yoco, Pesapal, M-Pesa Daraja: Phase 8 candidates. Chargebee/Recurly premature.

**Strategy:** Paddle international (apply in Phase 1–2), Paystack Nigeria (DeX handles 7.5% VAT; engage a tax adviser), Bachs later, USD list prices with quarterly NGN points plus prepaid passes. Adapter interface and webhook processing rules are in ADR-010.

## D. AI providers

Anthropic pricing verified (see `AI_ARCHITECTURE.md`); Batch API halves prices; `inference_geo: "us"` 1.1×; model ids live in the DB registry. OpenAI/Gemini/xAI unverified (Phase 3). ElevenLabs: "You can only create a Professional Voice Clone of your own voice. Even with their consent, you cannot clone someone else's voice."; instant cloning needs consent confirmation; Voice Library voices carry a commercial licence; free-plan output not commercially licensed (secondary). Vercel AI SDK v6 Dec 2025, `ai@7.x` current; official providers for all required vendors; structured output, tools, image, speech, transcription supported. LiteLLM rejected (Python proxy); gateways optional fallback only.

## E–H. Ingestion, originality, rendering, mobile

Captured in `CREATIVE_ENGINE.md`, `SECURITY.md` (SSRF controls), ADR-007/008/013/014 and the roadmap in `ARCHITECTURE.md`. Mobile specifics: Serwist service worker for app shell only; Web Push only for installed PWAs (iOS 16.4+); MediaRecorder `audio/mp4` on iOS vs `webm/opus` on Chromium with server transcoding; S3 multipart presigned uploads with resumable state; progressive fast-start MP4 with range requests; Vaul bottom sheets, ≥44 px targets, dnd-kit with keyboard alternatives (WCAG 2.5.7), TanStack Virtual; SSE resume via `Last-Event-ID` with polling fallback.

## I–L. Backoffice, threat model, database, monorepo

Implemented in Phase 1 as documented in `ADMIN_BACKOFFICE.md`, `SECURITY.md`, `DATABASE.md`, `ARCHITECTURE.md`.

## M. Design system foundations (DeX app only)

OKLCH tokens in Tailwind v4 `@theme`, semantic light/dark, contrast ≥4.5:1 text / ≥3:1 UI; SIL OFL variable fonts (final choice in the design exploration), at most two families, self-hosted via `next/font`; 150–250 ms motion with `prefers-reduced-motion` fallbacks; WCAG 2.2 AA specifics (2.5.8, 2.4.11, 2.5.7, 3.3.8, 3.2.6); Lucide (ISC) or Phosphor (MIT). DeX tokens never leak into customer campaigns.

## P. Roadmap, risks, open questions, accounts

Roadmap in `ARCHITECTURE.md`. Risk register: AI cost vs plan price (routing, caching, batch, credit pre-authorisation); Paddle approval (fallbacks: Lemon Squeezy/Polar, Stripe via US entity); Bachs licensing opacity; Remotion v5 terms; H.264/AAC licensing; iOS Safari media quirks (real-device CI); voice-clone misuse; Lagos–Frankfurt latency; NGN volatility.

Owner assumptions recorded at approval: headcount < 4 for now (Remotion free tier, licence budgeted from Phase 4); Nigerian entity only; SOC 2 not a 2027 goal (Neon Launch); admin on a separate hostname behind Cloudflare Access; Frankfurt as the sole region; no commissioned music budget yet (CC0 + reviewed AI audio first); no talent-voice workflows.

Accounts by phase: 1 — GitHub org, Neon, Fly.io, Cloudflare (DNS/R2/Access), Redis host, Infisical/Doppler, Sentry, Grafana Cloud, email provider; 2 — GitHub App, optional Browserless/Brandfetch; 3 — Anthropic, OpenAI, Google AI/Vertex, xAI; 4 — ElevenLabs, remotion.pro, music licensors; 6 — Paddle, Paystack, Bachs sandbox, Nigerian tax adviser; 7–8 — BrowserStack, pen-test vendor, status page.

## Sources

Node.js releases and release-schedule post; nextjs.org/blog (16.2, 16.4); orm.drizzle.team latest releases; docs.bullmq.io changelogs and v5→v6 migration; bullmq.io pluggable Redis clients guide; github.com/vercel/ai releases; npm registry (remotion, versions verified 2026-11-04); FFmpeg release notes; neon.com/docs (plans, functions runtime limits, attached backend/DX/auth pages); platform.claude.com pricing; bachs.io merchant terms, pricing, supported businesses/currencies, payins-payouts, Connect payouts walkthrough, status page, bachs-node/bachs-python repositories; paddle.com supported countries, sales-tax coverage, pricing; paystack.com pricing; elevenlabs.io professional voice cloning docs and voice guide; remotion.dev license FAQ, terms, changelog; Friedman & Dieng, _The Vendi Score_ (TMLR 2023, arXiv:2210.02410); WebKit blog "Web Push for Web Apps on iOS and iPadOS" (Feb 2023).
