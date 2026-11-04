# ADR-009 Object storage: Cloudflare R2 behind the S3 API

**Context.** Video delivery makes egress the dominant storage cost; uploads must go direct from phones; buckets must be private.

**Decision.** R2 in production, MinIO locally, accessed only through `packages/storage` (tenant-prefixed keys `org/{orgId}/{category}/{id}`, signed URLs ≤ 15 min, ownership check before signing). Multipart presigned uploads from the browser (Phase 2).

**Consequences.** Zero egress fees; any S3-compatible store is a configuration change.
