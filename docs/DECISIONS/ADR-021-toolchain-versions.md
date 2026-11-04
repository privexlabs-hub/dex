# ADR-021 TypeScript 5.9 and ESLint 9 for the baseline

**Context.** On 2026-11-04 npm `latest` is TypeScript 7.0.2 (the new native compiler line) and ESLint 10.14.0. `typescript-eslint` 8.72.1 declares `typescript <6.1`; `eslint-config-next` 16.4.5 pulls plugins whose peer ranges stop at ESLint 9.

**Decision.** Pin TypeScript 5.9.3 and ESLint 9.39.5. Re-evaluate both in Phase 8 or when the peer ranges move.

**Consequences.** No native-compiler speedups yet; zero peer-dependency warnings in the lockfile.
