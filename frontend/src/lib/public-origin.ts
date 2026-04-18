/**
 * API/WebSocket: `.env` da localhost qolsa ham production (Railway) ishlatiladi.
 */
const RAILWAY_API = 'https://backend-production-ad05.up.railway.app';
const RAILWAY_WS = 'wss://backend-production-ad05.up.railway.app';

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

export function getPublicWsUrl(): string {
    const raw = (process.env.NEXT_PUBLIC_WS_URL || '').trim().replace(/\/$/, '');
    if (!raw) return RAILWAY_WS;
    const forCheck = raw.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
    if (isLocalOrLoopback(forCheck)) return RAILWAY_WS;
    return raw;
}

