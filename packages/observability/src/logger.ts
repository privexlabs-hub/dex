import pino, { type Logger, type LoggerOptions } from 'pino';
import { SECRET_KEYS } from '@dex/env';

export type { Logger };

/** Paths redacted from every log line. Extend here, never in call sites. */
export const REDACT_PATHS = [
  ...SECRET_KEYS.map((k) => `env.${k}`),
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'password',
  '*.password',
  'token',
  '*.token',
  'secret',
  '*.secret',
  'apiKey',
  '*.apiKey',
  'connectionString',
];

export interface CreateLoggerOptions {
  service: string;
  level?: LoggerOptions['level'];
  env?: string;
  pretty?: boolean;
}

export function createLogger(opts: CreateLoggerOptions): Logger {
  const base: LoggerOptions = {
    level: opts.level ?? 'info',
    base: { service: opts.service, env: opts.env ?? 'development' },
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
  };
  if (opts.pretty) {
    return pino({ ...base, transport: { target: 'pino-pretty', options: { colorize: true } } });
  }
  return pino(base);
}
