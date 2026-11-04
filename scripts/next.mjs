#!/usr/bin/env node
/**
 * Runs the Next.js CLI with the repo-root .env.local loaded first, so the
 * variables exist before Next or Turbopack read them (including NEXT_PUBLIC_*
 * inlining). Usage, from an app directory: node ../../scripts/next.mjs dev
 *
 * Not `node --env-file-if-exists`: Next re-launches itself with Node's flags in
 * NODE_OPTIONS, where that flag is rejected. Not @next/env: it would also load
 * the production fill-in sheet, .env.production.
 *
 * Variables that are already set win, and a missing file is fine, so CI and
 * Docker builds are unaffected.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

try {
  process.loadEnvFile(new URL('../.env.local', import.meta.url));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const require = createRequire(resolve('package.json'));
const bin = require.resolve('next/dist/bin/next');
process.argv = [process.argv[0], bin, ...process.argv.slice(2)];
await import(pathToFileURL(bin).href);
