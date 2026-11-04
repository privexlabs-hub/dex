import { describe, expect, it } from 'vitest';
import { assertIpAllowed, ipMatches } from './ip-allowlist';

describe('ip allowlist', () => {
  it('matches cidr ranges', () => {
    expect(ipMatches('10.1.2.3', '10.1.0.0/16')).toBe(true);
    expect(ipMatches('10.2.0.1', '10.1.0.0/16')).toBe(false);
    expect(ipMatches('203.0.113.9', '203.0.113.9')).toBe(true);
    expect(ipMatches('2001:db8::1', '2001:db8::1')).toBe(true);
  });
  it('is a no-op when empty and enforces when set', () => {
    const h = new Headers({ 'cf-connecting-ip': '198.51.100.7' });
    expect(() => assertIpAllowed(h, '')).not.toThrow();
    expect(() => assertIpAllowed(h, '198.51.100.0/24')).not.toThrow();
    expect(() => assertIpAllowed(h, '192.0.2.0/24')).toThrow();
    expect(() => assertIpAllowed(new Headers(), '192.0.2.0/24')).toThrow();
  });
});
