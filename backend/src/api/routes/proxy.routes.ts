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

export default router;
