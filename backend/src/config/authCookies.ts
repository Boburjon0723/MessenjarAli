import crypto from 'crypto';
import { Request, Response } from 'express';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

export function authCookieName(): string {
    return process.env.AUTH_COOKIE_NAME || 'access_token';
}

function isProd(): boolean {
    return process.env.NODE_ENV === 'production';
}

function cookieBase(): {
    path: string;
    secure: boolean;
    sameSite: 'lax' | 'none' | 'strict';
    maxAge: number;
} {
    const prod = isProd();
    return {
        path: '/',
        secure: prod,
        sameSite: prod ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // ms for Express res.cookie
    };
}

/** Parse a single cookie value from a Cookie header (no cookie-parser dep). */
export function getCookieFromHeader(raw: string | undefined, name: string): string | undefined {
    if (!raw) return undefined;
    const parts = raw.split(';');
    for (const part of parts) {
        const idx = part.indexOf('=');
        if (idx === -1) continue;
        const k = part.slice(0, idx).trim();
        if (k !== name) continue;
        return decodeURIComponent(part.slice(idx + 1).trim());
    }
    return undefined;
}

export function getCookie(req: Request, name: string): string | undefined {
    return getCookieFromHeader(req.headers.cookie, name);
}

export function newCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function setAuthCookie(res: Response, token: string): void {
    const base = cookieBase();
    res.cookie(authCookieName(), token, {
        httpOnly: true,
        path: base.path,
        secure: base.secure,
        sameSite: base.sameSite,
        maxAge: base.maxAge,
    });
}

export function clearAuthCookie(res: Response): void {
    const base = cookieBase();
    res.clearCookie(authCookieName(), {
        httpOnly: true,
        path: base.path,
        secure: base.secure,
        sameSite: base.sameSite,
    });
}

export function setCSRFCookie(res: Response, token?: string): string {
    const value = token || newCSRFToken();
    const base = cookieBase();
    res.cookie(CSRF_COOKIE_NAME, value, {
        httpOnly: false,
        path: base.path,
        secure: base.secure,
        sameSite: base.sameSite,
        maxAge: base.maxAge,
    });
    return value;
}

export function clearCSRFCookie(res: Response): void {
    const base = cookieBase();
    res.clearCookie(CSRF_COOKIE_NAME, {
        httpOnly: false,
        path: base.path,
        secure: base.secure,
        sameSite: base.sameSite,
    });
}

/** Set both session cookies after successful login/refresh. Returns CSRF value for JSON body (cross-origin). */
export function setSessionCookies(res: Response, accessToken: string): string {
    setAuthCookie(res, accessToken);
    return setCSRFCookie(res);
}

export function clearSessionCookies(res: Response): void {
    clearAuthCookie(res);
    clearCSRFCookie(res);
}
