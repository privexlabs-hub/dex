# ADR-023 Append-only, hash-chained audit log

**Decision.** `audit_event` has UPDATE/DELETE/TRUNCATE revoked for all roles and a trigger that raises for the owner; each row stores `previous_hash` and `hash = sha256(previous_hash || canonical row)`. Privileged actions write their audit row in the same transaction as the change. Denied staff authorizations are also recorded.

**Consequences.** Retention/partitioning and periodic chain verification are scheduled for Phase 8.

**Status.** Implemented and integration-tested.
