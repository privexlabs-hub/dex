import type { Logger } from 'pino';

interface Hook {
  name: string;
  run: () => Promise<void> | void;
}

/**
 * Registers SIGTERM/SIGINT handlers that run shutdown hooks in reverse order
 * with a deadline. Workers register queue drains and pool closes here so a
 * deploy never kills a render mid-frame without a chance to checkpoint.
 */
export function createShutdownManager(log: Logger, deadlineMs = 25_000) {
  const hooks: Hook[] = [];
  let shuttingDown = false;

  async function shutdown(signal: string): Promise<number> {
    if (shuttingDown) return 0;
    shuttingDown = true;
    log.info({ signal }, 'shutdown requested');
    const timer = setTimeout(() => {
      log.error('shutdown deadline exceeded; exiting');
      process.exitCode = 1;
      // eslint-disable-next-line no-restricted-syntax
      process.exit(1);
    }, deadlineMs);
    timer.unref();
    for (const hook of [...hooks].reverse()) {
      try {
        await hook.run();
        log.debug({ hook: hook.name }, 'shutdown hook done');
      } catch (err) {
        log.error({ hook: hook.name, err }, 'shutdown hook failed');
      }
    }
    clearTimeout(timer);
    return 0;
  }

  for (const sig of ['SIGTERM', 'SIGINT'] as const) {
    process.once(sig, () => {
      void shutdown(sig).then((code) => {
        process.exitCode = code;
        // eslint-disable-next-line no-restricted-syntax
        process.exit(code);
      });
    });
  }

  return {
    register(name: string, run: Hook['run']) {
      hooks.push({ name, run });
    },
    get isShuttingDown() {
      return shuttingDown;
    },
  };
}
