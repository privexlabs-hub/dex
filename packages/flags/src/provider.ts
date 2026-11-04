import {
  type EvaluationContext,
  type JsonValue,
  type Provider,
  type ResolutionDetails,
  StandardResolutionReasons,
} from '@openfeature/server-sdk';
import { eq, isNull } from 'drizzle-orm';
import { schema, type Database } from '@dex/db';
import { evaluateFlag, type FlagContext, type FlagDefinition, type FlagRule } from './evaluate.js';

interface Snapshot {
  flags: Map<string, { flag: FlagDefinition; rules: FlagRule[] }>;
  loadedAt: number;
}

/**
 * OpenFeature provider backed by `feature_flag` + `feature_flag_rule`.
 * Flags are read with a short in-memory cache (default 15s) so evaluation
 * never adds a DB round trip to hot paths. Flags are platform-wide data, not
 * tenant rows, so they are read outside `withTenant`.
 */
export class PostgresFlagProvider implements Provider {
  readonly metadata = { name: 'dex-postgres-flags' } as const;
  readonly runsOn = 'server' as const;
  private snapshot: Snapshot | null = null;

  constructor(
    private readonly db: Database,
    private readonly ttlMs = 15_000,
  ) {}

  private async load(): Promise<Snapshot> {
    if (this.snapshot && Date.now() - this.snapshot.loadedAt < this.ttlMs) return this.snapshot;
    const flags = await this.db
      .select()
      .from(schema.featureFlag)
      .where(isNull(schema.featureFlag.archivedAt));
    const rules = await this.db.select().from(schema.featureFlagRule);
    const map = new Map<string, { flag: FlagDefinition; rules: FlagRule[] }>();
    for (const f of flags) {
      map.set(f.key, {
        flag: {
          key: f.key,
          defaultEnabled: f.defaultEnabled,
          defaultValue: f.defaultValue,
          archivedAt: f.archivedAt,
        },
        rules: [],
      });
    }
    for (const r of rules) map.get(r.flagKey)?.rules.push(r);
    this.snapshot = { flags: map, loadedAt: Date.now() };
    return this.snapshot;
  }

  /** Force a reload (admin writes call this after mutations). */
  invalidate(): void {
    this.snapshot = null;
  }

  private toCtx(ctx: EvaluationContext): FlagContext {
    return {
      orgId: typeof ctx.orgId === 'string' ? ctx.orgId : undefined,
      userId: typeof ctx.targetingKey === 'string' ? ctx.targetingKey : undefined,
      planTier: typeof ctx.planTier === 'string' ? ctx.planTier : undefined,
    };
  }

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<boolean>> {
    const snap = await this.load();
    const entry = snap.flags.get(flagKey);
    if (!entry) return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT };
    const r = evaluateFlag(entry.flag, entry.rules, this.toCtx(context));
    return {
      value: r.enabled,
      reason:
        r.reason === 'DEFAULT'
          ? StandardResolutionReasons.DEFAULT
          : StandardResolutionReasons.TARGETING_MATCH,
    };
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<string>> {
    const v = await this.resolveObjectEvaluation(flagKey, defaultValue, context);
    return {
      value: typeof v.value === 'string' ? v.value : defaultValue,
      reason: v.reason ?? StandardResolutionReasons.DEFAULT,
    };
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<number>> {
    const v = await this.resolveObjectEvaluation(flagKey, defaultValue, context);
    return {
      value: typeof v.value === 'number' ? v.value : defaultValue,
      reason: v.reason ?? StandardResolutionReasons.DEFAULT,
    };
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext,
  ): Promise<ResolutionDetails<T>> {
    const snap = await this.load();
    const entry = snap.flags.get(flagKey);
    if (!entry) return { value: defaultValue, reason: StandardResolutionReasons.DEFAULT };
    const r = evaluateFlag(entry.flag, entry.rules, this.toCtx(context));
    const value = (
      r.enabled && r.value !== undefined && r.value !== null ? r.value : defaultValue
    ) as T;
    return {
      value,
      reason:
        r.reason === 'DEFAULT'
          ? StandardResolutionReasons.DEFAULT
          : StandardResolutionReasons.TARGETING_MATCH,
    };
  }
}

/** Convenience for admin pages: list flags with rule counts. */
export async function listFlags(db: Database) {
  const flags = await db.select().from(schema.featureFlag);
  const rules = await db.select().from(schema.featureFlagRule);
  return flags.map((f) => ({ ...f, rules: rules.filter((r) => r.flagKey === f.key) }));
}

export async function getFlag(db: Database, key: string) {
  const [flag] = await db.select().from(schema.featureFlag).where(eq(schema.featureFlag.key, key));
  return flag ?? null;
}
