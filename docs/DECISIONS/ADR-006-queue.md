# ADR-006 Background jobs: BullMQ 6 on Redis

**Context.** Long render/AI jobs need progress, priorities, retries, cancellation, flows and dead-letter handling; Postgres compute should stay idle-able.

**Options.** BullMQ · Graphile Worker / pg-boss (Postgres-native) · Inngest / Trigger.dev · Temporal.

**Decision.** BullMQ 6.6.0 with ioredis 5.11 on a dedicated Redis. Zod contracts, idempotency-key job ids, UnrecoverableError for bad payloads, abortable handlers. Postgres-native queues rejected: constant polling defeats Neon scale-to-zero and LISTEN/NOTIFY is unreliable behind transaction pooling. Workflow engines deferred until orchestration complexity demands them.

**Consequences.** Redis is a required dependency; v6 breaking changes (job schedulers replace repeatables, async resume) are baked in from day one.

**Sources.** docs.bullmq.io migrate-from-v5-to-v6; bullmq.io pluggable Redis clients guide.
