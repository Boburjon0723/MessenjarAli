import { describe, expect, it } from 'vitest';
import { buildCorsAllowlist, isOriginAllowed, originMatchesPattern, parseOriginList } from './corsOrigins';

describe('corsOrigins', () => {
    it('parses comma list', () => {
        expect(parseOriginList(' https://a.com , *.vercel.app ')).toEqual([
            'https://a.com',
            '*.vercel.app',
        ]);
    });

    it('matches exact origin', () => {
        expect(
            originMatchesPattern(
                'https://messenjar-ali-onedays-projects-0a24a63d.vercel.app',
                'https://messenjar-ali-onedays-projects-0a24a63d.vercel.app'
            )
        ).toBe(true);
    });

    it('matches *.vercel.app for preview hosts', () => {
        expect(
            originMatchesPattern(
                'https://messenjar-ali-onedays-projects-0a24a63d.vercel.app',
                '*.vercel.app'
            )
        ).toBe(true);
        expect(
            originMatchesPattern(
                'https://messenjar-ali-git-main-onedays-projects.vercel.app',
                '*.vercel.app'
            )
        ).toBe(true);
        expect(originMatchesPattern('https://evil.com', '*.vercel.app')).toBe(false);
    });

    it('matches https://*.vercel.app with scheme check', () => {
        expect(
            originMatchesPattern('https://foo.vercel.app', 'https://*.vercel.app')
        ).toBe(true);
        expect(
            originMatchesPattern('http://foo.vercel.app', 'https://*.vercel.app')
        ).toBe(false);
    });

    it('allowlist uses patterns', () => {
        expect(
            isOriginAllowed('https://preview-abc.vercel.app', ['*.vercel.app'], {
                allowInDevWhenEmpty: false,
            })
        ).toBe(true);
    });

    it('buildCorsAllowlist auto-adds *.vercel.app', () => {
        const prev = process.env.CORS_ALLOW_VERCEL;
        delete process.env.CORS_ALLOW_VERCEL;
        const list = buildCorsAllowlist(
            'https://messenjar-ali-onedays-projects-0a24a63d.vercel.app'
        );
        expect(list).toContain('*.vercel.app');
        expect(
            isOriginAllowed(
                'https://messenjar-bspcrbj83-onedays-projects-0a24a63d.vercel.app',
                list
            )
        ).toBe(true);
        process.env.CORS_ALLOW_VERCEL = prev;
    });
});
