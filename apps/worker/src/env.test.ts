import { describe, expect, it } from 'vitest';
import { envSchema } from './env.js';

const base = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/dex',
  REDIS_URL: 'redis://localhost:6379',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'dex',
  S3_ACCESS_KEY_ID: 'a',
  S3_SECRET_ACCESS_KEY: 'b',
};

describe('worker env', () => {
  it('parses role list', () => {
    const env = envSchema.parse({ ...base, WORKER_ROLES: 'system, render' });
    expect(env.WORKER_ROLES).toEqual(['system', 'render']);
    expect(env.WORKER_HTTP_PORT).toBe(4000);
  });
  it('rejects unknown roles', () => {
    expect(() => envSchema.parse({ ...base, WORKER_ROLES: 'system,bogus' })).toThrow();
  });
});
