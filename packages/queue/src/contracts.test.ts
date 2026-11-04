import { describe, expect, it } from 'vitest';
import { jobEnvelope, systemJobs } from './contracts.js';

describe('job contracts', () => {
  it('rejects payloads without tenant context', () => {
    expect(
      jobEnvelope.safeParse({ actorId: 'a', requestId: 'r', idempotencyKey: 'k' }).success,
    ).toBe(false);
  });
  it('accepts a valid ping', () => {
    const r = systemJobs.ping.safeParse({
      kind: 'ping',
      orgId: 'o',
      actorId: 'a',
      requestId: 'r',
      idempotencyKey: 'k',
      echo: 'hi',
    });
    expect(r.success).toBe(true);
  });
});
