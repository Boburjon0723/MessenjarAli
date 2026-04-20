import { NextResponse } from 'next/server';

const DDG_API_BASE = 'https://api.duckduckgo.com/';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const q = (searchParams.get('q') || '').trim();

        if (!q) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const upstream = `${DDG_API_BASE}?q=${encodeURIComponent(
            q
        )}&format=json&no_html=1&skip_disambig=1&t=mali_consult`;

        const response = await fetch(upstream, {
            method: 'GET',
            // DDG response can be slow/unreliable occasionally.
            signal: AbortSignal.timeout(10_000),
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Search provider error', status: response.status },
                { status: 502 }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Search request failed', message: error?.message || 'Unknown error' },
            { status: 500 }
        );
    }
}

