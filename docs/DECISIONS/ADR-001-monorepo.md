# ADR-001 Monorepo tooling: pnpm workspaces + Turborepo

**Context.** Several deployable processes (web, admin, worker, renderer) share domain code. We need strict dependency boundaries, fast incremental CI and reproducible installs.

**Options.** pnpm + Turborepo · Nx · plain pnpm workspaces · Bun workspaces.

**Decision.** pnpm 12 (strict node_modules, exact pins, `minimum-release-age`, explicit native build allowlist) with Turborepo 2.11 for the task graph and caching. Boundaries enforced by dependency-cruiser. Bun deferred because Remotion/Playwright toolchains are validated on Node.

**Consequences.** Simple mental model; no code generators; Remote cache optional later. Developers must use Corepack-managed pnpm.

**Sources.** pnpm docs (settings: minimumReleaseAge, onlyBuiltDependencies); turbo.build docs.
