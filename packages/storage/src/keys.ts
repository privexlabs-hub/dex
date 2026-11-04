import { z } from 'zod';

/**
 * Object keys are always tenant-prefixed:
 *   org/{orgId}/{category}/{objectId}[.{ext}]
 * so a leaked key never reveals other tenants' layout, and lifecycle rules
 * (e.g. purge previews after 24h) can target a category prefix.
 */
export const objectCategory = z.enum([
  'uploads',
  'captures',
  'brand',
  'generated',
  'audio',
  'voice',
  'previews',
  'renders',
  'thumbnails',
  'exports',
]);
export type ObjectCategory = z.infer<typeof objectCategory>;

const SAFE = /^[A-Za-z0-9_-]+$/;

export function objectKey(
  orgId: string,
  category: ObjectCategory,
  objectId: string,
  ext?: string,
): string {
  if (!SAFE.test(orgId)) throw new Error('invalid orgId for object key');
  if (!SAFE.test(objectId)) throw new Error('invalid objectId for object key');
  objectCategory.parse(category);
  const safeExt = ext ? `.${ext.replace(/[^A-Za-z0-9]/g, '').toLowerCase()}` : '';
  return `org/${orgId}/${category}/${objectId}${safeExt}`;
}

/** Parse a key back; returns null for keys outside the convention. */
export function parseObjectKey(
  key: string,
): { orgId: string; category: ObjectCategory; objectId: string } | null {
  const m = /^org\/([A-Za-z0-9_-]+)\/([a-z]+)\/([A-Za-z0-9_-]+)(?:\.[a-z0-9]+)?$/.exec(key);
  if (!m) return null;
  const cat = objectCategory.safeParse(m[2]);
  if (!cat.success) return null;
  return { orgId: m[1] ?? '', category: cat.data, objectId: m[3] ?? '' };
}

/** Guard used before signing: the key must belong to the requesting tenant. */
export function assertKeyBelongsTo(key: string, orgId: string): void {
  const parsed = parseObjectKey(key);
  if (parsed?.orgId !== orgId) throw new Error('object key does not belong to tenant');
}
