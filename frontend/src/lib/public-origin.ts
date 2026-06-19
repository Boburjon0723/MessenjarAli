import { BACKEND_PUBLIC_ORIGIN } from './backend-origin';

/** REST fallback — `backend-origin.ts` */
const DEFAULT_API = BACKEND_PUBLIC_ORIGIN;

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
    if (!raw || isLocalOrLoopback(raw)) return DEFAULT_API;
    return raw;
}

/**
 * Socket.io ulanish URL — doim REST API bilan bir xil origin (`https://...`).
 *
 * `NEXT_PUBLIC_WS_URL` alohida hostga ishora qilsa REST bilan nomuvofiqlik bo‘lishi mumkin
 * (API ishlaydi, socket ulanmaydi). Shuning uchun WS faqat API origin dan olinadi.
 * Shuning uchun WS alohida env orqali emas, faqat API origin dan olinadi.
 */
export function getPublicWsUrl(): string {
    return getPublicApiUrl();
}
