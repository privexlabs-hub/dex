# AI architecture (planned — Phase 3; nothing here is implemented yet)

## Provider abstraction (`packages/ai`)

Interfaces: `LanguageModelProvider`, `VisionProvider`, `ImageGenerationProvider`, `SpeechGenerationProvider`, `SpeechRecognitionProvider`, `AudioGenerationProvider`, `VideoGenerationProvider`. Providers implement only the capabilities they support; `capabilities()` drives discovery. Transport uses the Vercel AI SDK provider packages (Anthropic, OpenAI, Google, xAI, ElevenLabs, Deepgram) wrapped by these interfaces (ADR-011); providers are called directly (ADR-012).

## Registry and routing (database, admin-editable)

- `ai_provider` (enabled, credential reference — never the secret), `ai_model` (external id, capabilities, status), `ai_model_price` (unit, price, effective window), `ai_route` (task key → ordered model chain, plan tier, max cost, timeout).
- Code references **task keys** (`brand.extract`, `concept.generate`, `storyboard.write`, `copy.social`, `edit.interpret`), never model ids.
- Fallback on 429/5xx/timeouts; retries with jittered backoff honouring `retry-after`; errors normalised to RateLimited, Overloaded, InvalidRequest, ContentFiltered, Timeout, ProviderDown.

## Orchestration

Structured workflow, not a free agent. Logical roles — product analyst, brand analyst, marketing strategist, creative director, storyboard planner, asset curator, audio producer, quality evaluator — are separate task keys with Zod-validated structured outputs, persisted intermediate results (`workflow_execution`), resumable steps and per-stage regeneration.

## Metering and cost control

Every call writes `ai_usage` (provider, model, task, tokens incl. cached, characters, seconds, images, provider cost from the active price version, credits charged). Estimates before expensive steps use rolling per-task averages. Levers: Haiku-class models for extraction, prompt caching, batch API for non-interactive stages, cached ingestion.

## Prompt management

Immutable `prompt_template` versions referencing output schemas; A/B via feature flags; prompts never embed customer secrets.

## Prompt-injection isolation

Ingested websites, documents and repositories are passed as delimited untrusted data; extraction calls have no tools; outputs are schema-validated and cross-checked against `product_evidence`; the LLM can only emit specs that reference whitelisted archetype and asset ids.

## Privacy and observability

Zero-retention / DPA options enabled per provider where offered (to verify per vendor); OpenTelemetry GenAI semantic attributes (`gen_ai.system`, `gen_ai.request.model`, `gen_ai.usage.*`) without prompt bodies.

## Pricing seed (verified 2026-11-04, Anthropic only)

| Model                    | Input / MTok | Output / MTok | Cache hit / MTok |
| ------------------------ | ------------ | ------------- | ---------------- |
| Claude Fable 5.1         | $10          | $50           | $0.25            |
| Claude Opus 5.5          | $4           | $20           | $0.20            |
| Claude Sonnet 5.5        | $2           | $10           | $0.10            |
| Claude Haiku 5.5 (≤100K) | $0.10        | $0.50         | $0.01            |

OpenAI, Gemini, xAI and ElevenLabs model ids and prices are seeded from official pages when Phase 3 starts.
