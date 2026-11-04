# ADR-003 Database platform: Neon Postgres, aws-eu-central-1

**Context.** Need managed Postgres with branching for previews, PITR, and a clean exit path; Object Storage/Functions/AI Gateway exist only in four regions and are not needed.

**Options.** Neon · Supabase · RDS/Aurora Serverless v2 · Cloud SQL · self-managed.

**Decision.** Neon for Postgres only (Launch plan; Scale when SOC 2/30-day PITR is required). Branch per PR, separate projects for staging and production. Postgres 18 locally (pgvector image) to match Neon.

**Consequences.** Standard Postgres on disk (dump/restore exit); scale-to-zero must be disabled in production; avoid queue polling in Postgres to keep compute idle-able (see ADR-006).

**Sources.** neon.com/docs/introduction/plans; neon.com/docs/compute/functions/reference/runtime-limits; attached Neon docs (regions).
