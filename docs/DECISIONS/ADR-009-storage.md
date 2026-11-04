# ADR-009 Object storage: Cloudflare R2 behind the S3 API

**Context.** Video delivery makes egress the dominant storage cost; uploads must go direct from phones; buckets must be private.

**Decision.** R2 in production, RustFS locally, accessed only through `packages/storage` (tenant-prefixed keys `org/{orgId}/{category}/{id}`, signed URLs ≤ 15 min, ownership check before signing). Multipart presigned uploads from the browser (Phase 2).

**Consequences.** Zero egress fees; any S3-compatible store is a configuration change.

**Update, 2026-11-04.** Local and CI storage moved from MinIO to RustFS 1.0.4 (Apache-2.0) because the official MinIO images are no longer available from Docker Hub or anonymously from quay.io, and `bitnami/minio` is gone too. Production stays on R2. The S3 API boundary made this a configuration change, as predicted above.
