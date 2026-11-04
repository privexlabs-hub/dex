import { describe, expect, it } from 'vitest';
import {
  composeEnv,
  coreSchema,
  databaseSchema,
  EnvValidationError,
  loadEnv,
  storageSchema,
} from './index.js';

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(coreSchema, {});
    expect(env.APP_ENV).toBe('development');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('lists every invalid key without echoing values', () => {
    expect(() => loadEnv(databaseSchema, { DATABASE_URL: 'not a url' })).toThrowError(
      EnvValidationError,
    );
    try {
      loadEnv(databaseSchema, { DATABASE_URL: 'not a url' });
    } catch (e) {
      const err = e as EnvValidationError;
      expect(err.issues[0]?.path).toBe('DATABASE_URL');
      expect(err.message).not.toContain('not a url');
    }
  });

  it('composes schemas', () => {
    const schema = composeEnv(coreSchema, storageSchema);
    const env = loadEnv(schema, {
      S3_ENDPOINT: 'http://localhost:9000',
      S3_BUCKET: 'dex',
      S3_ACCESS_KEY_ID: 'a',
      S3_SECRET_ACCESS_KEY: 'b',
      S3_FORCE_PATH_STYLE: 'true',
    });
    expect(env.S3_FORCE_PATH_STYLE).toBe(true);
    expect(env.S3_SIGNED_URL_TTL_SECONDS).toBe(600);
    expect(env.APP_ENV).toBe('development');
  });

  it('caps signed URL TTL at 15 minutes', () => {
    expect(() =>
      loadEnv(storageSchema, {
        S3_ENDPOINT: 'http://localhost:9000',
        S3_BUCKET: 'dex',
        S3_ACCESS_KEY_ID: 'a',
        S3_SECRET_ACCESS_KEY: 'b',
        S3_SIGNED_URL_TTL_SECONDS: '3600',
      }),
    ).toThrow();
  });
});
