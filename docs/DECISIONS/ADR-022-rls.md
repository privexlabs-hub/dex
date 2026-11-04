# ADR-022 Row-Level Security with a non-owner application role

**Decision.** All tenant tables enable RLS with policies bound to `current_setting('app.org_id', true)` for the `dex_app` role (NOBYPASSRLS). The app sets the tenant per transaction via `withTenant()`. Staff aggregates use SECURITY DEFINER functions returning counts only. Migrations and seeds use the owner role.

**Consequences.** A forgotten `withTenant` fails closed (zero rows). Every tenant-scoped query must run in a transaction; Neon/PgBouncer transaction pooling is compatible with transaction-local settings.

**Status.** Implemented and integration-tested.
