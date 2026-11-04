# ADR-012 Call AI providers directly; gateways only as optional fallback routes

**Decision.** No Neon/Vercel AI Gateway, OpenRouter or Portkey in the primary path: they add markup and another data processor, and frontier access on Neon's gateway needs a request. DeX meters usage itself (OpenTelemetry GenAI attributes, no prompt bodies on spans).

**Consequences.** DeX implements retries/backoff/rate-limit handling and fallback chains in `packages/ai`.
