import { describe, expect, it } from 'vitest';

// Mirrors the guard in sign-in/page.tsx: only same-origin relative paths are honoured.
const safe = (next?: string) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : undefined;

describe('open-redirect guard', () => {
  it('accepts relative paths', () => expect(safe('/dashboard')).toBe('/dashboard'));
  it('rejects protocol-relative and absolute urls', () => {
    expect(safe('//evil.example')).toBeUndefined();
    expect(safe('https://evil.example')).toBeUndefined();
    expect(safe(undefined)).toBeUndefined();
  });
});
