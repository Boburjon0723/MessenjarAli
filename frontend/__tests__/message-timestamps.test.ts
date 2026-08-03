import { describe, expect, it } from 'vitest';
import { parseCreatedToMs, stableIsoWhenCreatedAtNull } from '@/lib/message-timestamps';

describe('parseCreatedToMs', () => {
  it('returns null for empty values', () => {
    expect(parseCreatedToMs(null)).toBeNull();
    expect(parseCreatedToMs('')).toBeNull();
  });

  it('converts unix seconds to milliseconds', () => {
    expect(parseCreatedToMs(1_700_000_000)).toBe(1_700_000_000_000);
  });

  it('keeps millisecond timestamps', () => {
    expect(parseCreatedToMs(1_700_000_000_123)).toBe(1_700_000_000_123);
  });

  it('parses numeric strings as unix seconds or ms', () => {
    expect(parseCreatedToMs('1700000000')).toBe(1_700_000_000_000);
    expect(parseCreatedToMs('1700000000123')).toBe(1_700_000_000_123);
  });

  it('parses ISO date strings', () => {
    const iso = '2026-04-12T10:30:00.000Z';
    expect(parseCreatedToMs(iso)).toBe(new Date(iso).getTime());
  });

  it('parses Date objects', () => {
    const d = new Date('2026-04-12T10:30:00.000Z');
    expect(parseCreatedToMs(d)).toBe(d.getTime());
  });
});

describe('stableIsoWhenCreatedAtNull', () => {
  it('returns stable ISO for the same id and index', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(stableIsoWhenCreatedAtNull(id, 0)).toBe(stableIsoWhenCreatedAtNull(id, 0));
  });

  it('increments time by index', () => {
    const id = 'deadbeef';
    const a = stableIsoWhenCreatedAtNull(id, 0);
    const b = stableIsoWhenCreatedAtNull(id, 5);
    expect(new Date(b).getTime() - new Date(a).getTime()).toBe(5);
  });

  it('stays within one synthetic UTC day', () => {
    const iso = stableIsoWhenCreatedAtNull('cafebabe', 0);
    const ms = new Date(iso).getTime();
    const anchor = Date.UTC(2026, 3, 12);
    expect(ms).toBeGreaterThanOrEqual(anchor);
    expect(ms).toBeLessThan(anchor + 86_400_000);
  });
});
