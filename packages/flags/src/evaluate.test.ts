import { describe, expect, it } from 'vitest';
import { bucket, evaluateFlag } from './evaluate.js';

const flag = { key: 'editor.conversational', defaultEnabled: false };

describe('evaluateFlag', () => {
  it('returns default with no rules', () => {
    expect(evaluateFlag(flag, [], {})).toMatchObject({ enabled: false, reason: 'DEFAULT' });
  });
  it('matches org rule by priority', () => {
    const rules = [
      { priority: 10, orgId: 'o1', enabled: true },
      { priority: 1, planTier: 'pro', enabled: false },
    ];
    expect(evaluateFlag(flag, rules, { orgId: 'o1', planTier: 'pro' })).toMatchObject({
      enabled: false,
      reason: 'RULE',
    });
    expect(evaluateFlag(flag, rules, { orgId: 'o1', planTier: 'free' })).toMatchObject({
      enabled: true,
      reason: 'RULE',
    });
    expect(evaluateFlag(flag, rules, { orgId: 'o2' })).toMatchObject({
      enabled: false,
      reason: 'DEFAULT',
    });
  });
  it('rollout is deterministic and bounded', () => {
    const b = bucket('f', 'subject');
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(100);
    expect(bucket('f', 'subject')).toBe(b);
    const rules = [{ priority: 1, rolloutPercent: 0, enabled: true }];
    expect(evaluateFlag(flag, rules, { orgId: 'x' }).enabled).toBe(false);
    expect(
      evaluateFlag(flag, [{ priority: 1, rolloutPercent: 100, enabled: true }], { orgId: 'x' }),
    ).toMatchObject({ enabled: true, reason: 'ROLLOUT' });
    expect(
      evaluateFlag(flag, [{ priority: 1, rolloutPercent: 100, enabled: true }], {}).enabled,
    ).toBe(false);
  });
  it('archived flags fall back to default', () => {
    expect(
      evaluateFlag({ ...flag, archivedAt: new Date() }, [{ priority: 1, enabled: true }], {}),
    ).toMatchObject({ enabled: false, reason: 'ARCHIVED' });
  });
});
