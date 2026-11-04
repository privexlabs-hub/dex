/**
 * Creates the local development bucket. Safe to re-run. Production buckets are
 * provisioned in Cloudflare R2 (docs/SETUP.md), so this refuses to run there.
 */
import {
  BucketAlreadyOwnedByYou,
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';

async function main() {
  const appEnv = process.env.APP_ENV ?? 'development';
  if (appEnv !== 'development' && appEnv !== 'test') {
    throw new Error(`refusing to create a bucket in APP_ENV=${appEnv}`);
  }
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_REGION } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error(
      'S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required',
    );
  }
  const client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  try {
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.warn(`[storage] bucket ${S3_BUCKET} already exists`);
    return;
  } catch {
    // Missing: create it below. Bad credentials surface from CreateBucket.
  }
  try {
    await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
  } catch (err) {
    if (!(err instanceof BucketAlreadyOwnedByYou)) throw err;
  }
  console.warn(`[storage] bucket ${S3_BUCKET} ready`);
}

main().catch((err: unknown) => {
  console.error('[storage] bucket init failed', err);
  process.exitCode = 1;
});
