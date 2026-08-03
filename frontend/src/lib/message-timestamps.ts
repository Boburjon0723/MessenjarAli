/**
 * Xabar vaqtlari — backend `stableMessageCreatedAt` bilan bir xil mantiq.
 */

/** Backend ba'zan Unix soniyada yuboradi; JS Date ms kutadi — noto'g'ri parse sortni buzadi. */
export function parseCreatedToMs(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return null;
    if (raw < 1e12) return raw * 1000;
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const n = parseFloat(trimmed);
      if (!Number.isFinite(n)) return null;
      if (n < 1e12) return Math.round(n * 1000);
      return Math.round(n);
    }
    const d = new Date(trimmed);
    const t = d.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/**
 * `created_at` bo'sh/null bo'lganda — **Date.now() emas**; backend bilan bir xil.
 * 2020-01-01 emas — "2020 yanvar" va haqiqiy sanalar aralashmasin.
 */
const SYNTHETIC_DAY_ANCHOR_UTC_MS = Date.UTC(2026, 3, 12);

export function stableIsoWhenCreatedAtNull(messageId: string, index: number): string {
  const hex = String(messageId).replace(/-/g, '');
  let n = 0;
  for (let i = 0; i < Math.min(hex.length, 16); i++) {
    const v = parseInt(hex[i]!, 16);
    if (!Number.isNaN(v)) n = (n * 16 + v) >>> 0;
  }
  return new Date(SYNTHETIC_DAY_ANCHOR_UTC_MS + (n % 86_400_000) + index).toISOString();
}
