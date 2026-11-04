import { describe, expect, it } from 'vitest';
import { parseHeaders } from './otel.js';

describe('parseHeaders', () => {
  it('returns nothing for an empty value', () => {
    expect(parseHeaders('')).toEqual({});
    expect(parseHeaders(undefined)).toEqual({});
  });

  it('parses several headers', () => {
    expect(parseHeaders('a=1, b=2')).toEqual({ a: '1', b: '2' });
  });

  it('keeps "=" inside a value (base64 padding in Basic auth)', () => {
    expect(parseHeaders('Authorization=Basic abc==')).toEqual({ Authorization: 'Basic abc==' });
  });

  it('decodes the OTEL spec percent-encoded form', () => {
    expect(parseHeaders('Authorization=Basic%20abc%3D%3D')).toEqual({
      Authorization: 'Basic abc==',
    });
  });

  it('ignores malformed pairs', () => {
    expect(parseHeaders('novalue,=x,ok=1')).toEqual({ ok: '1' });
  });
});
