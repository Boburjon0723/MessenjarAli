import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const MIN_SECRET_LEN = 32;

export type JwtSecrets = {
    accessTokenSecret: string;
    refreshTokenSecret: string;
};

/** Axis-uslub: process startida secretlar majburiy. */
export function validateSecretsAtBoot(): void {
    const access = process.env.JWT_SECRET || '';
    const refresh = process.env.JWT_REFRESH_SECRET || '';
    const isProd = process.env.NODE_ENV === 'production';

    if (!access || !refresh) {
        console.error('FATAL: JWT_SECRET va JWT_REFRESH_SECRET majburiy');
        process.exit(1);
    }
    if (isProd && (access.length < MIN_SECRET_LEN || refresh.length < MIN_SECRET_LEN)) {
        console.error(`FATAL: Productionda JWT secretlar kamida ${MIN_SECRET_LEN} belgi bo‘lishi kerak`);
        process.exit(1);
    }
    if (isProd && !process.env.CORS_ORIGINS?.trim()) {
        console.error('FATAL: Productionda CORS_ORIGINS majburiy (allowlist)');
        process.exit(1);
    }
}

export function getJwtSecrets(): JwtSecrets {
    const accessTokenSecret = process.env.JWT_SECRET;
    const refreshTokenSecret = process.env.JWT_REFRESH_SECRET;
    if (!accessTokenSecret || !refreshTokenSecret) {
        throw new Error('JWT secrets are not configured');
    }
    if (
        process.env.NODE_ENV === 'production' &&
        (accessTokenSecret.length < MIN_SECRET_LEN || refreshTokenSecret.length < MIN_SECRET_LEN)
    ) {
        throw new Error('JWT secrets are too short for production');
    }
    return { accessTokenSecret, refreshTokenSecret };
}

export function accessTokenExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || process.env.NEXT_PUBLIC_JWT_EXPIRES_IN || '1d';
}

export function refreshTokenExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || process.env.NEXT_PUBLIC_JWT_REFRESH_EXPIRES_IN || '7d';
}

export const JWT_SIGN_OPTS = { algorithm: 'HS256' as const };
export const JWT_VERIFY_OPTS = { algorithms: ['HS256'] as jwt.Algorithm[] };

/** Constant-time string compare (S2S tokenlar uchun). */
export function timingSafeEqualString(a: string | undefined, b: string | undefined): boolean {
    if (!a || !b) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

export function randomDigits(length: number): string {
    const max = 10 ** length;
    const n = crypto.randomInt(0, max);
    return String(n).padStart(length, '0');
}

export function randomLinkCode(length = 6): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < length; i++) {
        out += alphabet[crypto.randomInt(0, alphabet.length)];
    }
    return out;
}
