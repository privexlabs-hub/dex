import { describe, expect, it } from 'vitest';
import { Writable } from 'node:stream';
import pino from 'pino';
import { REDACT_PATHS } from './logger.js';

describe('log redaction', () => {
  it('redacts secrets and auth headers', () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      },
    });
    const log = pino({ redact: { paths: REDACT_PATHS, censor: '[redacted]' } }, sink);
    log.info(
      {
        password: 'hunter2',
        req: { headers: { authorization: 'Bearer x', cookie: 'a=b' } },
        env: { DATABASE_URL: 'postgres://u:p@h/db' },
      },
      'hi',
    );
    const out = lines.join('');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('Bearer x');
    expect(out).not.toContain('a=b');
    expect(out).not.toContain('postgres://');
    expect(out).toContain('[redacted]');
  });
});
