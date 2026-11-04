import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

export interface StartTelemetryOptions {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  /** OTLP/HTTP base endpoint. When absent, telemetry is a no-op. */
  endpoint?: string | undefined;
  /** "k=v,k2=v2" header string (e.g. auth for Grafana Cloud). */
  headers?: string | undefined;
}

function parseHeaders(raw?: string): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    raw
      .split(',')
      .map((kv) => kv.split('=').map((s) => s.trim()))
      .filter((p): p is [string, string] => p.length === 2 && p[0] !== '' && p[1] !== ''),
  );
}

/**
 * Start the OpenTelemetry Node SDK for a long-lived process (worker, renderer,
 * self-hosted Next server). Returns a shutdown function. Prompt and asset
 * payloads must never be placed on spans (see AI_ARCHITECTURE.md).
 */
export async function startTelemetry(opts: StartTelemetryOptions): Promise<() => Promise<void>> {
  if (!opts.endpoint) return () => Promise.resolve();
  const headers = parseHeaders(opts.headers);
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: opts.serviceName,
      [ATTR_SERVICE_VERSION]: opts.serviceVersion ?? '0.0.0',
      'deployment.environment.name': opts.environment ?? 'development',
    }),
    traceExporter: new OTLPTraceExporter({ url: `${opts.endpoint}/v1/traces`, headers }),
    metricReaders: [
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${opts.endpoint}/v1/metrics`, headers }),
        exportIntervalMillis: 15_000,
      }),
    ],
    instrumentations: [
      new HttpInstrumentation({ ignoreIncomingRequestHook: (req) => req.url === '/health' }),
      new PgInstrumentation({ enhancedDatabaseReporting: false }),
      new IORedisInstrumentation(),
    ],
  });
  sdk.start();
  return () => sdk.shutdown();
}
