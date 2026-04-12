import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, targetLanguage } = body;

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const defaultMirrors = [
            'https://translate.terraprint.co/translate',
            'https://libretranslate.de/translate',
            'https://lt.vern.cc/translate',
            'https://translate.argosopentech.com/translate'
        ];

        const urlsToTry = process.env.LIBRETRANSLATE_URL
            ? [process.env.LIBRETRANSLATE_URL]
            : defaultMirrors;

        for (const url of urlsToTry) {
            console.log(`Translation proxy trying mirror: ${url}`);
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: JSON.stringify({
                        q: text,
                        source: "auto",
                        target: targetLanguage || "uz"
                    }),
                    headers: { "Content-Type": "application/json" },
                    signal: AbortSignal.timeout(6000)
                });

                if (response.ok) {
                    const data = await response.json();
                    return NextResponse.json(data);
                } else {
                    console.warn(`Mirror ${url} returned status: ${response.status}`);
                }
            } catch (fetchError: any) {
                console.warn(`Mirror ${url} failed to connect:`, fetchError.message);
            }
        }

        // If loop finishes without returning, all mirrors failed
        console.error("All LibreTranslate mirrors failed.");
        return NextResponse.json({
            error: 'Barcha tarjima serverlari band.',
            details: 'All public mirrors failed to respond. Please try again later.'
        }, { status: 503 });
    } catch (error: any) {
        console.error('Next.js Translation API error:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
