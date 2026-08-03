import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import {
    setSessionCookies,
    authCookieName,
    CSRF_COOKIE_NAME,
    getCookieFromHeader,
} from '../config/authCookies';

describe('setSessionCookies', () => {
    const prev = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = prev;
        vi.restoreAllMocks();
    });

    it('sets access_token HttpOnly and csrf_token cookies', async () => {
        process.env.NODE_ENV = 'development';
        const app = express();
        app.get('/login', (_req, res) => {
            const csrf = setSessionCookies(res, 'jwt-access-value');
            res.json({ csrfToken: csrf });
        });
        const server = app.listen(0);
        const port = (server.address() as any).port;
        const res = await fetch(`http://127.0.0.1:${port}/login`);
        const setCookie = res.headers.getSetCookie?.() || [];
        const joined = setCookie.join('\n');
        expect(joined).toContain(`${authCookieName()}=`);
        expect(joined).toMatch(/HttpOnly/i);
        expect(joined).toContain(`${CSRF_COOKIE_NAME}=`);
        const body = await res.json();
        expect(body.csrfToken).toMatch(/^[a-f0-9]{64}$/);
        await new Promise<void>((r) => server.close(() => r()));
    });

    it('extracts the access token from a Socket.IO Cookie header', () => {
        const header = `other=value; ${authCookieName()}=socket-jwt%2Evalue; ${CSRF_COOKIE_NAME}=csrf`;
        expect(getCookieFromHeader(header, authCookieName())).toBe('socket-jwt.value');
        expect(getCookieFromHeader(undefined, authCookieName())).toBeUndefined();
    });
});
