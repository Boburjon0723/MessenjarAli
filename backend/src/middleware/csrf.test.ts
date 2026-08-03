import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';

vi.mock('../services/securityAudit.service', () => ({
    recordSecurityAudit: vi.fn(),
}));

import { csrfProtect } from '../middleware/csrf.middleware';
import { extractAccessToken } from '../middleware/auth.middleware';
import { authCookieName, CSRF_COOKIE_NAME } from '../config/authCookies';

describe('extractAccessToken', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'a'.repeat(32);
        process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
    });

    it('prefers cookie over Bearer', () => {
        const req = {
            headers: {
                cookie: `${authCookieName()}=cookie-token; other=1`,
                authorization: 'Bearer bearer-token',
            },
        } as any;
        expect(extractAccessToken(req)).toBe('cookie-token');
    });

    it('falls back to Bearer', () => {
        const req = {
            headers: { authorization: 'Bearer only-bearer' },
        } as any;
        expect(extractAccessToken(req)).toBe('only-bearer');
    });
});

describe('csrfProtect', () => {
    const makeApp = () => {
        const app = express();
        app.use(express.json());
        app.use(csrfProtect);
        app.post('/api/wallet/book', (_req, res) => res.json({ ok: true }));
        app.post('/api/auth/login', (_req, res) => res.json({ ok: true }));
        return app;
    };

    it('rejects cookie-session mutate without CSRF header', async () => {
        const app = makeApp();
        const server = app.listen(0);
        const port = (server.address() as any).port;
        const res = await fetch(`http://127.0.0.1:${port}/api/wallet/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `${CSRF_COOKIE_NAME}=abc123`,
            },
            body: '{}',
        });
        expect(res.status).toBe(403);
        await new Promise<void>((r) => server.close(() => r()));
    });

    it('allows Bearer mutate without CSRF', async () => {
        const app = makeApp();
        const server = app.listen(0);
        const port = (server.address() as any).port;
        const res = await fetch(`http://127.0.0.1:${port}/api/wallet/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer some.jwt.token',
            },
            body: '{}',
        });
        expect(res.status).toBe(200);
        await new Promise<void>((r) => server.close(() => r()));
    });

    it('allows login without CSRF', async () => {
        const app = makeApp();
        const server = app.listen(0);
        const port = (server.address() as any).port;
        const res = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}',
        });
        expect(res.status).toBe(200);
        await new Promise<void>((r) => server.close(() => r()));
    });

    it('allows cookie session when CSRF header matches', async () => {
        const app = makeApp();
        const server = app.listen(0);
        const port = (server.address() as any).port;
        const res = await fetch(`http://127.0.0.1:${port}/api/wallet/book`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Cookie: `${CSRF_COOKIE_NAME}=match-me`,
                'X-CSRF-Token': 'match-me',
            },
            body: '{}',
        });
        expect(res.status).toBe(200);
        await new Promise<void>((r) => server.close(() => r()));
    });
});
