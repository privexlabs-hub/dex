# ADR-007 Rendering: Remotion 4 self-hosted (Phase 4)

**Context.** Deterministic React scene components from a validated spec; preview and final profiles; chunked parallel renders; no AI-generated code executed.

**Options.** Remotion · Motion Canvas/Revideo · FFmpeg-only compositing · hosted render APIs (Creatomate, Shotstack).

**Decision.** Remotion 4.0.540 via @remotion/renderer in a Docker image with Chromium + FFmpeg on autoscaled machines; Player for in-browser preview with proxy assets.

**Consequences.** Company License required at 4+ employees (Automators: $0.01/render, $100/month minimum); budgeted from Phase 4. Confirm whether previews are billable and the v5 telemetry terms before upgrading.

**Sources.** remotion.dev/docs/license/faq; remotion.dev/docs/terms; npm registry.
