/**
 * CORS allowlist helper.
 * CORS_ORIGINS / SOCKET_CORS_ORIGINS: vergul bilan — exact origin yoki wildcard.
 *
 * Misollar:
 *   https://my-app.vercel.app
 *   *.vercel.app
 *   https://*.vercel.app
 *
 * Vercel preview URL har deployda o‘zgaradi — default holatda
 * `*.vercel.app` avtomatik ruxsat etiladi (CORS_ALLOW_VERCEL=false bilan o‘chirish mumkin).
 */
export function parseOriginList(raw: string | undefined): string[] {
    return String(raw || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
}

/** Runtime allowlist: env + ixtiyoriy Vercel preview wildcard. */
export function buildCorsAllowlist(raw: string | undefined): string[] {
    const list = parseOriginList(raw);
    const allowVercel = process.env.CORS_ALLOW_VERCEL !== 'false';
    if (allowVercel && !list.some((p) => p === '*.vercel.app' || p === 'https://*.vercel.app')) {
        list.push('*.vercel.app');
    }
    return list;
}

function hostMatchesWildcard(hostname: string, hostPattern: string): boolean {
    const host = hostname.toLowerCase();
    const pat = hostPattern.toLowerCase();
    if (pat.startsWith('*.')) {
        const suffix = pat.slice(1); // .vercel.app
        const apex = pat.slice(2); // vercel.app
        return host === apex || host.endsWith(suffix);
    }
    return host === pat;
}

export function originMatchesPattern(origin: string, pattern: string): boolean {
    if (pattern === origin) return true;
    if (!pattern.includes('*')) return false;

    try {
        const { protocol, hostname } = new URL(origin);

        if (pattern.startsWith('*.')) {
            return hostMatchesWildcard(hostname, pattern);
        }

        const schemeSep = pattern.indexOf('://');
        if (schemeSep !== -1) {
            const scheme = pattern.slice(0, schemeSep);
            if (protocol !== `${scheme}:`) return false;
            const hostPattern = pattern.slice(schemeSep + 3);
            return hostMatchesWildcard(hostname, hostPattern);
        }

        return false;
    } catch {
        return false;
    }
}

function isLoopbackOrigin(origin: string): boolean {
    try {
        const { hostname } = new URL(origin);
        const h = hostname.toLowerCase();
        return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
    } catch {
        return false;
    }
}

/** Dev: telefon/boshqa qurilmadan `http://192.168.x.x:3000` orqali ochilganda. */
function isPrivateLanOrigin(origin: string): boolean {
    try {
        const { hostname } = new URL(origin);
        const h = hostname.toLowerCase();
        if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
        if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
        const m = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h);
        if (m) {
            const second = Number(m[1]);
            return second >= 16 && second <= 31;
        }
        return false;
    } catch {
        return false;
    }
}

export function isOriginAllowed(
    origin: string,
    allowlist: string[],
    opts?: { allowInDevWhenEmpty?: boolean }
): boolean {
    try {
        if (new URL(origin).protocol === 'app:') return true;
    } catch {
        /* ignore */
    }
    // Local frontend (Next.js / Electron) — production .env often omits localhost.
    if (isLoopbackOrigin(origin)) return true;
    if (process.env.NODE_ENV !== 'production' && isPrivateLanOrigin(origin)) return true;
    if (allowlist.length === 0) {
        if (opts?.allowInDevWhenEmpty !== false) {
            return process.env.NODE_ENV !== 'production';
        }
        return false;
    }
    return allowlist.some((pattern) => originMatchesPattern(origin, pattern));
}
