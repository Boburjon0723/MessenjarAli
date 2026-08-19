import { describe, expect, it } from 'vitest';
import {
    classifyTelegramMessage,
    inferSendTypeFromFile,
    isArchiveFile,
    mimeFromFilename,
    sanitizeDownloadName,
} from '@/lib/telegram-message-kind';

describe('zip / archive as Telegram document', () => {
    it('treats empty MIME + .zip as file (Windows)', () => {
        expect(inferSendTypeFromFile('report.zip', '')).toBe('file');
        expect(inferSendTypeFromFile('report.zip', 'application/octet-stream')).toBe('file');
        expect(inferSendTypeFromFile('report.zip', 'application/x-zip-compressed')).toBe('file');
        expect(classifyTelegramMessage({ type: 'file', mime: '', filename: 'report.zip' })).toBe('file');
        expect(classifyTelegramMessage({ mime: '', filename: 'report.zip' })).toBe('file');
    });

    it('does not treat text mentioning zip as a document', () => {
        expect(classifyTelegramMessage({ type: 'text', filename: 'please send report.zip' })).toBe('text');
    });

    it('fills zip MIME from filename', () => {
        expect(mimeFromFilename('a.zip', '')).toBe('application/zip');
        expect(mimeFromFilename('a.zip', 'application/octet-stream')).toBe('application/zip');
        expect(mimeFromFilename('a.zip', 'application/x-zip-compressed')).toBe('application/x-zip-compressed');
    });

    it('detects archives', () => {
        expect(isArchiveFile('pack.7z', '')).toBe(true);
        expect(isArchiveFile('x.bin', 'application/zip')).toBe(true);
        expect(isArchiveFile('song.mp3', '')).toBe(false);
    });

    it('keeps songs and images distinct from zip', () => {
        expect(inferSendTypeFromFile('track.mp3', 'audio/mpeg')).toBe('audio');
        expect(inferSendTypeFromFile('pic.png', 'image/png')).toBe('image');
        expect(classifyTelegramMessage({ type: 'file', mime: 'audio/mpeg', filename: 'a.mp3' })).toBe('song');
    });

    it('sanitizes download names without dropping extension', () => {
        expect(sanitizeDownloadName('hisobot.zip')).toBe('hisobot.zip');
        expect(sanitizeDownloadName('a/b\\c:"x.zip')).toBe('a_b_c_x.zip');
    });
});
