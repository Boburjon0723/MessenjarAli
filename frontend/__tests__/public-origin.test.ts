import { afterEach, describe, expect, it } from 'vitest';
import { getPublicApiUrl, getPublicWsUrl } from '@/lib/public-origin';
import { BACKEND_PUBLIC_ORIGIN } from '@/lib/backend-origin';

describe('public-origin', () => {
    const env = { ...process.env };

    afterEach(() => {
        process.env = { ...env };
    });

    it('falls back to BACKEND_PUBLIC_ORIGIN when env empty', () => {
        delete process.env.NEXT_PUBLIC_API_URL;
        expect(getPublicApiUrl()).toBe(BACKEND_PUBLIC_ORIGIN);
    });

    it('falls back when env points to localhost', () => {
        process.env.NEXT_PUBLIC_API_URL = 'http://localhost:4000';
        expect(getPublicApiUrl()).toBe(BACKEND_PUBLIC_ORIGIN);
    });

    it('uses production Railway URL when set', () => {
        process.env.NEXT_PUBLIC_API_URL = 'https://messenjarali-production.up.railway.app/';
        expect(getPublicApiUrl()).toBe('https://messenjarali-production.up.railway.app');
    });

    it('socket URL matches API origin', () => {
        process.env.NEXT_PUBLIC_API_URL = 'https://messenjarali-production.up.railway.app';
        expect(getPublicWsUrl()).toBe(getPublicApiUrl());
    });
});
