import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // The tracer misses this dependency of @opentelemetry/instrumentation-http, and
  // the standalone server then fails to boot whenever OTLP export is enabled.
  outputFileTracingIncludes: {
    '/**': [
      '../../node_modules/.pnpm/forwarded-parse@*/node_modules/forwarded-parse/**',
      '../../node_modules/.pnpm/@opentelemetry+instrumentation-http@*/node_modules/forwarded-parse',
    ],
  },
  serverExternalPackages: [
    'pg',
    'pino',
    'pino-pretty',
    'ioredis',
    'bullmq',
    '@opentelemetry/sdk-node',
  ],
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },
};

export default nextConfig;
