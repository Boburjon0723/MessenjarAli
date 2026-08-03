import { describe, expect, it } from 'vitest';
import { stableIsoWhenCreatedAtNull } from './stableMessageCreatedAt';

describe('stableIsoWhenCreatedAtNull', () => {
  it('is deterministic for the same message id', () => {
    const id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    expect(stableIsoWhenCreatedAtNull(id, 0)).toBe(stableIsoWhenCreatedAtNull(id, 0));
  });

  it('shifts by index within the synthetic day', () => {
    const first = stableIsoWhenCreatedAtNull('abc123', 0);
    const second = stableIsoWhenCreatedAtNull('abc123', 3);
    expect(new Date(second).getTime() - new Date(first).getTime()).toBe(3);
  });

  it('ignores dashes in uuid ids', () => {
    const dashed = stableIsoWhenCreatedAtNull('a1b2-c3d4', 0);
    const plain = stableIsoWhenCreatedAtNull('a1b2c3d4', 0);
    expect(dashed).toBe(plain);
  });
});
