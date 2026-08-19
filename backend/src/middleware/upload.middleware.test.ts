import { describe, expect, it } from 'vitest';
import { attachmentDisposition, mimeFromFilename } from './upload.middleware';

describe('upload document MIME (Telegram-like)', () => {
    it('maps zip when browser sends empty or octet-stream MIME', () => {
        expect(mimeFromFilename('archive.zip', '')).toBe('application/zip');
        expect(mimeFromFilename('archive.zip', 'application/octet-stream')).toBe('application/zip');
        expect(mimeFromFilename('archive.zip', 'application/x-zip-compressed')).toBe(
            'application/x-zip-compressed'
        );
    });

    it('keeps declared image mime', () => {
        expect(mimeFromFilename('a.jpg', 'image/jpeg')).toBe('image/jpeg');
    });

    it('sets RFC 5987 Content-Disposition with original zip name', () => {
        const header = attachmentDisposition('Hisobot 2026.zip');
        expect(header).toContain('attachment;');
        expect(header).toContain("filename*=UTF-8''");
        expect(header).toContain(encodeURIComponent('Hisobot 2026.zip'));
        expect(header).toMatch(/filename="[^"]+\.zip"/);
    });
});
