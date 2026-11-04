import { describe, expect, it } from 'vitest';
import { newId } from './ids.js';

describe('newId', () => {
  it('produces time-ordered UUIDv7', () => {
    const a = newId();
    const b = newId();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a < b).toBe(true);
  });
});
