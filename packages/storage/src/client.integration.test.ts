import { describe, expect, it } from 'vitest';
import { createStorage } from './client.js';
import { objectKey } from './keys.js';

const env = process.env;
const run =
  env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
    ? describe
    : describe.skip;

run('storage round trip (MinIO/R2)', () => {
  const storage = createStorage({
    endpoint: env.S3_ENDPOINT ?? '',
    region: env.S3_REGION ?? 'auto',
    bucket: env.S3_BUCKET ?? '',
    accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    forcePathStyle: env.S3_FORCE_PATH_STYLE === 'true',
    signedUrlTtlSeconds: 120,
  });

  it('writes, heads, signs and deletes within the tenant prefix', async () => {
    const key = objectKey('orgtest', 'uploads', `k${Date.now()}`, 'txt');
    await storage.putObject({
      orgId: 'orgtest',
      key,
      body: Buffer.from('hello'),
      contentType: 'text/plain',
    });
    expect(await storage.head({ orgId: 'orgtest', key })).toMatchObject({ size: 5 });
    const url = await storage.signDownload({ orgId: 'orgtest', key, filename: 'hello.txt' });
    expect(url).toContain('X-Amz-Signature');
    const res = await fetch(url);
    expect(await res.text()).toBe('hello');
    await expect(storage.signDownload({ orgId: 'other', key })).rejects.toThrow();
    await storage.deleteObject({ orgId: 'orgtest', key });
    expect(await storage.head({ orgId: 'orgtest', key })).toBeNull();
  });

  it('health check succeeds', async () => {
    expect((await storage.check()).ok).toBe(true);
  });
});
