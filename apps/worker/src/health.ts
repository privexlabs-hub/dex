import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import type { Logger } from '@dex/observability';

export interface HealthProbe {
  name: string;
  check: () => Promise<{ ok: true; latencyMs?: number }>;
}

/**
 * Minimal HTTP surface for a worker: liveness, readiness (dependencies), and
 * queue counts for the backoffice. Not exposed publicly.
 */
export function startHealthServer(opts: {
  port: number;
  probes: HealthProbe[];
  log: Logger;
  isShuttingDown: () => boolean;
}) {
  const app = new Hono();
  app.get('/health', (c) => c.json({ ok: true, ts: new Date().toISOString() }));
  app.get('/ready', async (c) => {
    if (opts.isShuttingDown()) return c.json({ ok: false, reason: 'shutting_down' }, 503);
    const results = await Promise.all(
      opts.probes.map(async (p) => {
        try {
          const r = await p.check();
          return { name: p.name, ok: true, latencyMs: r.latencyMs ?? null };
        } catch (err) {
          opts.log.warn({ probe: p.name, err }, 'readiness probe failed');
          return { name: p.name, ok: false };
        }
      }),
    );
    const ok = results.every((r) => r.ok);
    return c.json({ ok, checks: results }, ok ? 200 : 503);
  });
  const server = serve({ fetch: app.fetch, port: opts.port, hostname: '0.0.0.0' }, (info) => {
    opts.log.info({ port: info.port }, 'health server listening');
  });
  return () =>
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
}
