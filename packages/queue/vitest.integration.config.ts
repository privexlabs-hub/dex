import { defineConfig } from 'vitest/config';
// Real environment variables win; the file is optional (absent in CI).
try {
  process.loadEnvFile('../../.env.local');
} catch {
  // Tests that need a service skip when its variables are missing.
}

export default defineConfig({
  test: { include: ['src/**/*.integration.test.ts'], testTimeout: 30_000, fileParallelism: false },
});
