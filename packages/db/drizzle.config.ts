import { defineConfig } from 'drizzle-kit';

// drizzle-kit does not load env files itself. Real environment variables win; the file is optional.
try {
  process.loadEnvFile('../../.env.local');
} catch {
  // No .env.local (CI, production): rely on the real environment.
}

const url = process.env.DATABASE_ADMIN_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_ADMIN_URL (or DATABASE_URL) is required for drizzle-kit');

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
