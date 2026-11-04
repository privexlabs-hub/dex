# ADR-004 ORM: Drizzle

**Context.** Need SQL-first typed queries, RLS policy definitions in schema, explicit migrations, and `pg` Pool for long-lived processes.

**Options.** Drizzle 0.45 (1.0 RC) · Prisma 7/8 · Kysely.

**Decision.** Drizzle ORM 0.45.4 + drizzle-kit 0.31.11; `pgPolicy` + `.enableRLS()` in schema; generated SQL migrations reviewed in PRs; hand-written `--custom` migrations for grants/triggers/functions. Adopt 1.0 when GA (Better Auth already supports the RC range).

**Consequences.** Migrations are plain SQL (auditable); session variables for RLS are set with `set_config(..., true)` per transaction.

**Sources.** orm.drizzle.team (RLS, migrations); npm registry.
