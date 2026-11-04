import { describe, expect, it } from 'vitest';
import { assertKeyBelongsTo, objectKey, parseObjectKey } from './keys.js';

describe('object keys', () => {
  it('builds tenant-prefixed keys', () => {
    expect(objectKey('org_1', 'uploads', 'abc', 'PNG')).toBe('org/org_1/uploads/abc.png');
  });
  it('rejects path traversal and unsafe ids', () => {
    expect(() => objectKey('../x', 'uploads', 'a')).toThrow();
    expect(() => objectKey('org', 'uploads', 'a/b')).toThrow();
  });
  it('parses and validates ownership', () => {
    expect(parseObjectKey('org/o1/renders/r1.mp4')).toEqual({
      orgId: 'o1',
      category: 'renders',
      objectId: 'r1',
    });
    expect(parseObjectKey('something/else')).toBeNull();
    expect(() => assertKeyBelongsTo('org/o1/renders/r1.mp4', 'o2')).toThrow();
    expect(() => assertKeyBelongsTo('org/o1/renders/r1.mp4', 'o1')).not.toThrow();
  });
});
