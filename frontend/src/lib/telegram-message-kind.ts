/**
 * Telegram Desktop `DocumentData` qoidalari
 * (`tdesktop-dev/.../data/data_document.cpp`):
 *
 * - isVoiceMessage()  == type == VoiceDocument  — faqat mikrofon yozuvi
 * - isSong()          == type == SongDocument   — musiqa (mp3/flac/…)
 * - isAudioFile()     — song yoki audio/*, LEKIN voice emas
 *
 * Fayl tanlash hech qachon Voice qaytarmaydi.
 * ZIP/RAR va boshqa hujjatlar — har doim `file` (Windows bo‘sh MIME yuborsa ham).
 */

export type TelegramMessageKind =
    | 'text'
    | 'image'
    | 'video'
    | 'voice'
    | 'song'
    | 'file'
    | 'sticker'
    | 'other';

const SONG_EXT = /\.(mp3|flac|aac|m4a|wav|wma|aiff|opus)$/i;
const SONG_MIME = /^audio\/(mpeg|mp3|mp4|flac|aac|x-m4a|m4a|wav|x-wav|vnd\.wave|ogg|opus)/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|mov|webm|mkv|avi|m4v)$/i;
const VOICE_RECORD_MIME = /^audio\/(webm|ogg|opus)/i;
const ARCHIVE_EXT = /\.(zip|rar|7z|tar|tgz|gz|bz2|xz)$/i;
const ARCHIVE_MIME = /(zip|x-zip|x-rar|vnd\.rar|x-7z|x-tar|gzip|x-gzip|x-bzip|x-xz|x-compressed)/i;

const EXT_MIME: Record<string, string> = {
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    tgz: 'application/gzip',
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    webm: 'video/webm',
    mp4: 'video/mp4',
};

export function mimeFromFilename(name?: string, declaredMime?: string): string {
    const declared = String(declaredMime || '').trim().toLowerCase();
    if (declared && declared !== 'application/octet-stream') return declared;
    const ext = String(name || '').split('.').pop()?.toLowerCase() || '';
    return EXT_MIME[ext] || declared || 'application/octet-stream';
}

export function isArchiveFile(name?: string, mime?: string): boolean {
    return ARCHIVE_EXT.test(String(name || '')) || ARCHIVE_MIME.test(String(mime || ''));
}

export function classifyTelegramMessage(input: {
    type?: string;
    mime?: string;
    filename?: string;
}): TelegramMessageKind {
    const type = String(input.type || '').toLowerCase().trim();
    const mime = String(input.mime || '').toLowerCase();
    const name = String(input.filename || '');

    if (type === 'sticker') return 'sticker';
    if (type === 'image' || type === 'img' || type === 'photo') return 'image';
    if (type === 'video') return 'video';
    if (type === 'audio' || type === 'song') return 'song';

    const looksLikeSong = SONG_MIME.test(mime) || SONG_EXT.test(name);
    if (type !== 'file' && type !== 'text' && looksLikeSong) return 'song';

    if (type === 'voice') {
        if (looksLikeSong) return 'song';
        return 'voice';
    }

    if (type === 'text') return 'text';

    if (isArchiveFile(name, mime)) return 'file';

    if (type === 'file') {
        if (mime.startsWith('image/') || IMAGE_EXT.test(name)) return 'image';
        if (mime.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
        if (looksLikeSong) return 'song';
        if (mime.startsWith('audio/') || VOICE_RECORD_MIME.test(mime)) return 'song';
        return 'file';
    }

    if (!type) {
        if (mime.startsWith('image/') || IMAGE_EXT.test(name)) return 'image';
        if (mime.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
        if (looksLikeSong) return 'song';
        if (/\.[a-z0-9]{1,8}(\s|$)/i.test(name)) return 'file';
        return 'text';
    }

    return 'other';
}

/** Diskdan fayl: Voice EMAS. Mos: image | video | audio(song) | file */
export function inferSendTypeFromFile(name?: string, mime?: string): 'image' | 'video' | 'audio' | 'file' {
    const m = String(mime || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    if (isArchiveFile(n, m)) return 'file';
    if (m.startsWith('image/') || IMAGE_EXT.test(n)) return 'image';
    if (m.startsWith('video/') || VIDEO_EXT.test(n)) return 'video';
    if (m.startsWith('audio/') || SONG_EXT.test(n)) return 'audio';
    return 'file';
}

export function sanitizeDownloadName(filename: string): string {
    return filename.replace(/[\\/:"*?<>|\r\n]+/g, '_').slice(0, 180) || 'file';
}

export function resolveChatMediaUrl(raw: string): string {
    const t = (raw || '').trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t) || t.startsWith('data:') || t.startsWith('blob:')) return t;
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
    return `${base}${t.startsWith('/') ? '' : '/'}${t}`;
}
