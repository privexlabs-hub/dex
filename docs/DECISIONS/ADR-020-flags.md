# ADR-020 Feature flags in Postgres via OpenFeature

**Decision.** `feature_flag` + `feature_flag_rule` evaluated by a pure function (org/user/plan targeting, deterministic percentage rollouts) exposed through an OpenFeature provider with a 15s in-memory snapshot; changes are audited and admin-editable. Flagsmith/Unleash/PostHog rejected as unnecessary services for Phase 1–6.

**Status.** Implemented.
