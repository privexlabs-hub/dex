# ADR-002 Hosting: Docker images on Fly.io Machines (fra) for every process

**Context.** Rendering and media need long-running containers with FFmpeg and Chromium (10–60 min, multi-GB). Video bytes must not transit serverless functions. Lagos-origin users are best served from Frankfurt (co-located with Neon).

**Options.** Vercel for web + separate workers · Netlify/Cloudflare OpenNext · Fly.io Machines · Railway/Render · AWS ECS/Fargate · Hetzner.

**Decision.** One Docker pipeline, all processes on Fly.io Machines in `fra`, Cloudflare in front (DNS/CDN/WAF/Access). Next.js apps run `output: 'standalone'`. Render fleet autoscaled on queue depth (Phase 4); Hetzner is the cost fallback at scale.

**Consequences.** DeX owns scaling and SSE without platform timeouts; preview apps per PR; no vendor-specific Next features required. Measure Lagos↔Frankfurt latency in Phase 2 (open item).

**Sources.** Neon Functions runtime limits (15 min TTFB, 2048 MiB fixed, 100 concurrent); Fly.io Machines docs.
