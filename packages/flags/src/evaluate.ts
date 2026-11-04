import { createHash } from 'node:crypto';

export interface FlagDefinition {
  key: string;
  defaultEnabled: boolean;
  defaultValue?: unknown;
  archivedAt?: Date | null;
}

export interface FlagRule {
  priority: number;
  orgId?: string | null;
  userId?: string | null;
  planTier?: string | null;
  rolloutPercent?: number | null;
  enabled: boolean;
  value?: unknown;
}

export interface FlagContext {
  orgId?: string | undefined;
  userId?: string | undefined;
  planTier?: string | undefined;
}

export interface FlagResolution {
  enabled: boolean;
  value: unknown;
  reason: 'DEFAULT' | 'RULE' | 'ROLLOUT' | 'ARCHIVED';
}

/** Deterministic 0–99 bucket for percentage rollouts (stable per flag+subject). */
export function bucket(flagKey: string, subject: string): number {
  const h = createHash('sha256').update(`${flagKey}:${subject}`).digest();
  return h.readUInt32BE(0) % 100;
}

/**
 * Pure evaluation. Rules are checked in ascending priority; the first rule
 * whose every specified target matches the context wins. A rule with
 * rolloutPercent additionally requires the subject's bucket to be below it.
 */
export function evaluateFlag(
  flag: FlagDefinition,
  rules: FlagRule[],
  ctx: FlagContext,
): FlagResolution {
  if (flag.archivedAt)
    return { enabled: flag.defaultEnabled, value: flag.defaultValue, reason: 'ARCHIVED' };
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  for (const rule of sorted) {
    if (rule.orgId && rule.orgId !== ctx.orgId) continue;
    if (rule.userId && rule.userId !== ctx.userId) continue;
    if (rule.planTier && rule.planTier !== ctx.planTier) continue;
    if (rule.rolloutPercent !== null && rule.rolloutPercent !== undefined) {
      const subject = ctx.orgId ?? ctx.userId;
      if (!subject) continue;
      if (bucket(flag.key, subject) >= rule.rolloutPercent) continue;
      return { enabled: rule.enabled, value: rule.value ?? flag.defaultValue, reason: 'ROLLOUT' };
    }
    return { enabled: rule.enabled, value: rule.value ?? flag.defaultValue, reason: 'RULE' };
  }
  return { enabled: flag.defaultEnabled, value: flag.defaultValue, reason: 'DEFAULT' };
}
