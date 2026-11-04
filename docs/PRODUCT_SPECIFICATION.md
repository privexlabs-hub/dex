# Product specification

DeX turns a real software product into an original, professionally produced, editable marketing campaign. The primary experience: **connect or upload your product → DeX understands it → develop a marketing concept → approve the storyboard → produce a professional video → edit it → download and share.** Everything must be usable from a phone.

This document is the functional contract. Each requirement carries its delivery phase and an acceptance criterion; "status" says whether it is shipped today.

## Personas

Indie hackers and SaaS founders (primary), developer-tool companies, startup marketing and DevRel teams, small agencies. Staff personas: super admin, platform admin, support, finance, moderator, operations engineer, analyst.

## Requirements

### Identity and tenancy (Phase 1 — shipped)

- R1 Register with email + password; verification required before sign-in. _Acceptance:_ unverified sign-in returns `EMAIL_NOT_VERIFIED`; verification link signs in and lands on onboarding (e2e).
- R2 Create an organization with a default workspace; owner role granted; audited. _Acceptance:_ dashboard shows the workspace; audit row `org.create` exists (e2e + DB).
- R3 Sessions are revocable; protected routes redirect when signed out. _Acceptance:_ `/dashboard` → `/sign-in?next=/dashboard` after sign-out (e2e).
- R4 TOTP and passkeys available to customers (UI in the design track). _Acceptance:_ plugins enabled (unit test).
- R5 Tenant isolation enforced by RLS. _Acceptance:_ integration test.

### Product ingestion and intelligence (Phase 2)

- R6 Import website URL, documentation URL, GitHub repository (public; private via GitHub App), description, screenshots, logo, images, recordings, promo video, brand guidelines; multiple sources per project.
- R7 SSRF-safe capture at mobile/tablet/desktop viewports with full-page and element shots; crawl scope limited to nav-linked pages and sitemap within plan caps.
- R8 Extract name, category, description, features, capabilities, audience, problems, benefits, USPs, pricing (only when explicit), CTAs, screenshots, logo/brand assets, typography, palette, visual patterns.
- R9 Every claim carries evidence (source URL, selector/coordinates, screenshot crop, confidence) and a status ∈ {verified, inferred, missing, user_supplied, unsupported}. _Acceptance:_ no claim without evidence reaches a storyboard; benchmark of 30 sites yields reviewable profiles for ≥90%.
- R10 Editable product profile with approval gates.

### Brand intelligence (Phase 2)

- R11 BrandProfile from CSS/tokens/logos/screenshots/guidelines: colours (primary, secondary, accent, background, text), typography, radius, shadows, spacing, imagery, icon and animation style. Unknown values are marked unknown and confirmed by the user; DeX never injects default branding. Optional custom creative direction is labelled as such.

### Marketing intelligence (Phase 3)

- R12 Multiple genuinely different concepts (objective, audience, problem, benefit, message, angle, hook, emotion, narrative, CTA, duration, treatment, rationale); users select, combine, edit.
- R13 Scene-by-scene storyboard (purpose, duration, visuals, source assets, UI elements, animation, camera, overlays, voiceover, SFX, music, transition, brand elements, evidence); add/delete/duplicate/reorder/edit/preview; approval before expensive rendering.
- R14 Originality: individual (product-specific creative) and collective (fingerprint comparison, alternatives when too similar); diversity metrics tracked. Privacy: no cross-tenant asset exposure.

### Creative production (Phase 4)

- R15 Deterministic scene archetypes using real product UI; no fabricated interfaces; decorative assets stored separately.
- R16 Licensed music/SFX catalogue with rights metadata, search, moods, trending/most-liked from platform data; preview, trim, position, volume.
- R17 AI voiceover (languages, accents, speed, pronunciation, preview, per-scene regeneration); user recording/upload with trim and sync; consent-gated own-voice cloning only.
- R18 Audio composition: ducking, normalisation (−14 LUFS), fades, mixing, loudness checks.
- R19 Asynchronous preview and final renders with progress, retry, cancel, resume; MP4 (H.264/AAC) at 9:16, 1:1, 16:9; 1080p/4K; 30/60 fps.

### Editor (Phase 5)

- R20 One workspace: preview, scenes, timeline, layers, assets, audio, text, brand, voice, AI assistant, export; mobile uses bottom sheets and tap-based reordering (≥44px targets).
- R21 Conversational edits produce structured, previewable changes; never overwrite the only version; undo/redo, revision history, autosave.

### Deliverables and billing (Phase 6)

- R22 MP4, thumbnail, poster, social copy, hooks, captions (SRT/VTT), hashtags, platform descriptions, optional audio stems; mobile download via signed URL/Web Share.
- R23 Usage ledger (tokens, images, speech, transcription, render minutes, resolution, storage, bandwidth, premium audio); plans Free/Creator/Pro/Studio/Agency; entitlements; cost estimate before expensive operations; ordinary edits do not consume credits.
- R24 Payments via adapter: Paddle (international, MoR) and Paystack (NGN); webhook-driven fulfilment with signature verification and idempotency.

### Staff backoffice (Phase 1 foundation shipped; Phase 7 completes)

- R25 Separate realm, MFA, RBAC, step-up, audit, IP allowlist — _shipped_.
- R26 Dashboards with real metrics — _shipped (platform counts, queue counts)_; AI costs, render stats, revenue in later phases.
- R27 User/org management, break-glass content access, subscriptions, provider configuration, jobs/renders with retry, catalogue/licences, moderation, tickets, flags, settings.

### Non-functional

- Mobile-first on iOS/Android browsers; WCAG 2.2 AA; non-blocking workflows; persistent/resumable jobs; p95 page TTFB < 500ms from Lagos for authenticated pages (to be measured in Phase 2).
- Security per SECURITY.md; privacy per NDPA/GDPR.
