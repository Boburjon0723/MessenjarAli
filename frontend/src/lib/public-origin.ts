import { BACKEND_PUBLIC_ORIGIN } from './backend-origin';

/** REST fallback — `backend-origin.ts` */
const RAILWAY_API = BACKEND_PUBLIC_ORIGIN;

function isLocalOrLoopback(url: string): boolean {
    try {
        const normalized = url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
        const u = new URL(normalized);
        const h = u.hostname.toLowerCase();
        return (
            h === 'localhost' ||
            h === '127.0.0.1' ||
            h === '[::1]' ||
            h.endsWith('.local')
        );
    } catch {
        return false;
    }
}

export function getPublicApiUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
    if (!raw || isLocalOrLoopback(raw)) return RAILWAY_API;
    return raw;
}

/**
 * Socket.io ulanish URL — doim REST API bilan bir xil origin (`https://...`).
 *
 * Avvalgi `NEXT_PUBLIC_WS_URL` alohida hostga (masalan, eski Railway `...-ad05...`) ishora qilganda
 * REST `NEXT_PUBLIC_API_URL` boshqacha deployment bo‘lishi mumkin edi: xabarlar kutish (socket yo‘q), API ishlaydi.
 * Shuning uchun WS alohida env orqali emas, faqat API origin dan olinadi.
 */
export function getPublicWsUrl(): string {
    return getPublicApiUrl();
}
