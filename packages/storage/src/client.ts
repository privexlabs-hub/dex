import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertKeyBelongsTo } from './keys.js';

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  /** Seconds. Env schema caps this at 900. */
  signedUrlTtlSeconds: number;
}

export interface Storage {
  /** Presigned PUT for direct browser upload. Caller must have validated size/type policy. */
  signUpload(args: {
    orgId: string;
    key: string;
    contentType: string;
    contentLength?: number;
  }): Promise<string>;
  /** Presigned GET with attachment disposition for downloads, inline for playback. */
  signDownload(args: {
    orgId: string;
    key: string;
    filename?: string;
    inline?: boolean;
  }): Promise<string>;
  putObject(args: {
    orgId: string;
    key: string;
    body: Uint8Array | Buffer;
    contentType: string;
  }): Promise<void>;
  head(args: {
    orgId: string;
    key: string;
  }): Promise<{ size: number; contentType?: string | undefined } | null>;
  deleteObject(args: { orgId: string; key: string }): Promise<void>;
  /** Health probe: cheap HEAD on a well-known missing key must return 404, not a connection error. */
  check(): Promise<{ ok: true; latencyMs: number }>;
}

export function createStorage(cfg: StorageConfig): Storage {
  const client = new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    forcePathStyle: cfg.forcePathStyle ?? false,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  const Bucket = cfg.bucket;
  const expiresIn = cfg.signedUrlTtlSeconds;

  return {
    async signUpload({ orgId, key, contentType, contentLength }) {
      assertKeyBelongsTo(key, orgId);
      const cmd = new PutObjectCommand({
        Bucket,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
      });
      return getSignedUrl(client, cmd, { expiresIn });
    },
    async signDownload({ orgId, key, filename, inline }) {
      assertKeyBelongsTo(key, orgId);
      const safeName = (filename ?? key.split('/').pop() ?? 'file').replaceAll('"', '');
      const disposition = inline ? 'inline' : `attachment; filename="${safeName}"`;
      const cmd = new GetObjectCommand({
        Bucket,
        Key: key,
        ResponseContentDisposition: disposition,
      });
      return getSignedUrl(client, cmd, { expiresIn });
    },
    async putObject({ orgId, key, body, contentType }) {
      assertKeyBelongsTo(key, orgId);
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },
    async head({ orgId, key }) {
      assertKeyBelongsTo(key, orgId);
      try {
        const res = await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return { size: res.ContentLength ?? 0, contentType: res.ContentType };
      } catch (err) {
        if (isNotFound(err)) return null;
        throw err;
      }
    },
    async deleteObject({ orgId, key }) {
      assertKeyBelongsTo(key, orgId);
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
    async check() {
      const start = performance.now();
      try {
        await client.send(new HeadObjectCommand({ Bucket, Key: 'org/_health/uploads/_probe' }));
      } catch (err) {
        if (!isNotFound(err)) throw err;
      }
      return { ok: true, latencyMs: Math.round(performance.now() - start) };
    },
  };
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e.name === 'NotFound' || e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404;
}
