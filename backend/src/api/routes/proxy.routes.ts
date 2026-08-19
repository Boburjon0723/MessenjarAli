import { Router, Request, Response } from 'express';

const router = Router();

const DDG_API_BASE = 'https://api.duckduckgo.com/';

const DEFAULT_TRANSLATE_MIRRORS = [
    'https://translate.terraprint.co/translate',
    'https://libretranslate.de/translate',
    'https://lt.vern.cc/translate',
    'https://translate.argosopentech.com/translate',
];

/** GET /api/consult-search?q=... — DuckDuckGo Instant Answer proxy (static frontend uchun) */
router.get('/consult-search', async (req: Request, res: Response) => {
    try {
        const q = String(req.query.q || '').trim();
        if (!q) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const upstream = `${DDG_API_BASE}?q=${encodeURIComponent(
            q
        )}&format=json&no_html=1&skip_disambig=1&t=mali_consult`;

        const response = await fetch(upstream, {
            method: 'GET',
            signal: AbortSignal.timeout(10_000),
            headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
            return res.status(502).json({
                error: 'Search provider error',
                status: response.status,
            });
        }

        const data = await response.json();
        return res.json(data);
    } catch (error: any) {
        return res.status(500).json({
            error: 'Search request failed',
            message: error?.message || 'Unknown error',
        });
    }
});

/** POST /api/translate — LibreTranslate proxy (static frontend uchun) */
router.post('/translate', async (req: Request, res: Response) => {
    try {
        const { text, targetLanguage } = req.body || {};
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const urlsToTry = process.env.LIBRETRANSLATE_URL
            ? [process.env.LIBRETRANSLATE_URL]
            : DEFAULT_TRANSLATE_MIRRORS;

        for (const url of urlsToTry) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: JSON.stringify({
                        q: text,
                        source: 'auto',
                        target: targetLanguage || 'uz',
                    }),
                    headers: { 'Content-Type': 'application/json' },
                    signal: AbortSignal.timeout(6000),
                });

                if (response.ok) {
                    const data = await response.json();
                    return res.json(data);
                }
            } catch {
                // try next mirror
            }
        }

        return res.status(503).json({
            error: 'Barcha tarjima serverlari band.',
            details: 'All public mirrors failed to respond. Please try again later.',
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Internal Server Error',
            message: error?.message || 'Unknown error',
        });
    }
});

/** GET /api/media-proxy?url=... — proxy Firebase Storage / external images to bypass CORS */
router.get('/media-proxy', async (req: Request, res: Response) => {
    try {
        const url = String(req.query.url || '').trim();
        if (!url) return res.status(400).json({ error: 'url required' });

        const allowed = ['storage.googleapis.com', 'firebasestorage.googleapis.com'];
        let hostname: string;
        try { hostname = new URL(url).hostname; } catch { return res.status(400).json({ error: 'invalid url' }); }
        if (!allowed.some(h => hostname === h || hostname.endsWith('.' + h) || hostname.endsWith('.firebasestorage.app'))) {
            return res.status(403).json({ error: 'host not allowed' });
        }

        const upstream = await fetch(url, { signal: AbortSignal.timeout(15_000) });
        if (!upstream.ok) return res.status(upstream.status).end();

        const ct = upstream.headers.get('content-type');
        if (ct) res.setHeader('Content-Type', ct);
        res.setHeader('Cache-Control', 'public, max-age=86400');

        const buf = Buffer.from(await upstream.arrayBuffer());
        res.send(buf);
    } catch (e: any) {
        res.status(500).json({ error: e?.message || 'proxy failed' });
    }
});

export default router;
