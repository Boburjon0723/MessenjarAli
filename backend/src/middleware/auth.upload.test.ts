import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';

describe('upload / media auth gate', () => {
    beforeEach(() => {
        process.env.JWT_SECRET = 'a'.repeat(32);
        process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
    });

    it('returns 401 without Authorization on protected route', async () => {
        const app = express();
        app.post('/api/media/upload', authenticateToken, (_req, res) => {
            res.json({ ok: true });
        });

        const server = app.listen(0);
        const port = (server.address() as any).port;
        const res = await fetch(`http://127.0.0.1:${port}/api/media/upload`, { method: 'POST' });
        expect(res.status).toBe(401);
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });
});
