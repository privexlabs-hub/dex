# ADR-017 Observability: OpenTelemetry SDK 3 → OTLP (Grafana Cloud) + Sentry

**Decision.** Vendor-neutral OTel (sdk-node 0.300 / api 1.10) with pg, ioredis and http instrumentation; Sentry for error grouping; pino JSON logs with redaction. @vercel/otel dropped because it pins the OTel 2.x line (api <1.10) and conflicts with SDK 3.

**Status.** Bootstrap implemented; backend accounts pending.
