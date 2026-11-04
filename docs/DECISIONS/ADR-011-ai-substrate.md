# ADR-011 AI substrate: Vercel AI SDK provider packages under DeX interfaces

**Context.** Anthropic, xAI, OpenAI, Google and ElevenLabs must be interchangeable; no model ids in code; structured outputs with Zod; usage metering and cost tables in the DB.

**Options.** raw SDKs per vendor · AI SDK provider packages · LiteLLM/Portkey proxy.

**Decision.** `ai` 7.x provider packages as transport only, wrapped by `packages/ai` interfaces (LanguageModel, Vision, ImageGeneration, SpeechGeneration, SpeechRecognition, AudioGeneration, VideoGeneration). Model registry, prices and routes live in Postgres and are admin-editable; code references task keys.

**Consequences.** Fast-moving SDK majors are isolated behind our interfaces; capability discovery per provider is explicit.
