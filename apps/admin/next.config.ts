import type { NextConfig } from 'next';

// React's dev build needs eval for debugging; production keeps the strict policy.
const devScriptSrc = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';

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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${devScriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
