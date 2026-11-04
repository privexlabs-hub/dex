/**
 * Next.js instrumentation hook. Runs once per server process (Node runtime
 * only; the edge runtime cannot host the OTel Node SDK). Exports via OTLP/HTTP
 * when OTEL_EXPORTER_OTLP_ENDPOINT is set; otherwise a no-op.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;
  const { startTelemetry } = await import('@dex/observability/otel');
  await startTelemetry({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'dex-web',
    environment: process.env.APP_ENV ?? 'development',
    endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    headers: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  });
}
