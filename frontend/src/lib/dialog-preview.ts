/**
 * Telegram dialogSubtitle / wrapMessageForReply — chat ro‘yxati preview.
 * Media (mp3/video/…) hech qachon xom URL ko‘rsatilmaydi.
 */

export type DialogPreviewInput = {
    type?: string | null;
    content?: string | null;
    metadata?: unknown;
    /** E2E — matn o‘rniga shifrlangan yorliq */
    encrypted?: boolean;
};

type MediaKind = 'image' | 'video' | 'audio' | 'voice' | 'sticker' | 'file';

function metaObj(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw === 'object') return raw as Record<string, unknown>;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return {};
}

function metaString(meta: Record<string, unknown>, ...keys: string[]): string {
    for (const k of keys) {
        const v = meta[k];
        if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
}

/** Content ichidan http(s) URL (prefiks: "Siz: …" bo‘lsa ham). */

function extractHttpUrl(s: string): string | null {
    const m = String(s || '').match(/https?:\/\/[^\s<>"']+/i);
    return m ? m[0].replace(/[),.;]+$/g, '') : null;
}

function decodeUrlish(s: string): string {
    try {
        return decodeURIComponent(s);
    } catch {
        return s;
    }
}

function isStorageHost(url: string): boolean {
    return /storage\.googleapis\.com|firebasestorage\.googleapis\.com|\.firebasestorage\.app/i.test(
        url
    );
}

function looksLikeStickerUrl(s: string): boolean {
    return (
        /notoemoji|telemoji|sticker/i.test(s) ||
        (/fonts\.gstatic\.com/i.test(s) && /emoji/i.test(s))
    );
}

function kindFromUrl(url: string): MediaKind | null {
    if (!url) return null;
    if (looksLikeStickerUrl(url)) return 'sticker';
    const u = decodeUrlish(url);
    if (/\.(mp3|flac|wav|m4a|aac|wma|aiff|opus)(\?|#|$)/i.test(u)) return 'audio';
    if (/\.(mp4|webm|mov|mkv|m4v|avi)(\?|#|$)/i.test(u)) return 'video';
    if (/\.(png|jpe?g|gif|webp|bmp|heic|heif)(\?|#|$)/i.test(u)) return 'image';
    if (/\.(ogg)(\?|#|$)/i.test(u)) return 'audio';
    if (/\.(pdf|zip|rar|7z|doc|docx|xls|xlsx|ppt|pptx|txt)(\?|#|$)/i.test(u)) return 'file';
    // GCS/Firebase media — hech qachon xom storage link qaytarmaslik
    if (isStorageHost(url)) return 'file';
    return null;
}

function kindFromMime(mime: string): MediaKind | null {
    const m = mime.toLowerCase();
    if (!m) return null;
    if (m.startsWith('image/')) return 'image';
    if (m.startsWith('video/')) return 'video';
    if (m.startsWith('audio/')) return 'audio';
    return null;
}

function kindFromFileName(name: string): MediaKind | null {
    if (!name || /^https?:\/\//i.test(name)) return null;
    return kindFromUrl(`https://local.invalid/${name}`);
}

function audioTitle(meta: Record<string, unknown>, fileName: string): string {
    const raw =
        metaString(meta, 'title', 'name', 'file_name', 'filename') ||
        (fileName && !/^https?:\/\//i.test(fileName) ? fileName : '');
    return raw.replace(/\.[^.]+$/, '').trim();
}

function fileLabel(meta: Record<string, unknown>, content: string): string {
    const name = metaString(meta, 'name', 'file_name', 'filename');
    if (name && !/^https?:\/\//i.test(name)) return name;
    if (isStorageHost(content)) return 'Fayl';
    const fromUrl = String(content || '')
        .split('/')
        .pop()
        ?.split('?')[0];
    if (
        fromUrl &&
        !/^https?:\/\//i.test(fromUrl) &&
        !/^[0-9a-f]{8}-[0-9a-f-]{20,}/i.test(fromUrl) &&
        /\.[a-z0-9]{1,8}$/i.test(fromUrl)
    ) {
        try {
            return decodeURIComponent(fromUrl);
        } catch {
            return fromUrl;
        }
    }
    return 'Fayl';
}

function labelForKind(
    kind: MediaKind,
    opts: { caption?: string; meta?: Record<string, unknown>; content?: string; fileName?: string }
): string {
    const caption = (opts.caption || '').trim();
    const meta = opts.meta || {};
    const fileName = opts.fileName || '';
    switch (kind) {
        case 'sticker': {
            const emoji = metaString(meta, 'emoji') || '✨';
            return `${emoji} Stiker`;
        }
        case 'image':
            return caption ? `📷 ${caption}` : '📷 Rasm';
        case 'video':
            return caption ? `🎬 ${caption}` : '🎬 Video';
        case 'voice':
            return '🎤 Ovozli xabar';
        case 'audio': {
            const title = audioTitle(meta, fileName);
            return title ? `🎵 ${title}` : '🎵 Musiqa';
        }
        case 'file':
        default:
            return `📁 ${fileLabel(meta, opts.content || '')}`;
    }
}

/** Chat list / notification uchun qisqa preview (Telegram uslubi). */

export function formatDialogPreview(input: DialogPreviewInput): string {
    if (input.encrypted) return '🔒 Shifrlangan xabar';
    const type = String(input.type || 'text').toLowerCase().trim();
    const content = String(input.content ?? '').trim();
    const meta = metaObj(input.metadata);
    const caption = metaString(meta, 'caption');
    const mime = metaString(
        meta,
        'mimetype',
        'mime',
        'contentType',
        'content_type',
        'file_type'
    ).toLowerCase();
    const fileName = metaString(meta, 'name', 'file_name', 'filename');
    // Allaqachon formatlangan preview (backend snippet) — qayta ishlash shart emas
    if (
        content &&
        !extractHttpUrl(content) &&
        /^[📷🎬🎵🎤✨📁🔒💰📞🚀]/.test(content)
    ) {
        return content;
    }
    if (type === 'sticker') return labelForKind('sticker', { meta });
    if (type === 'image' || type === 'photo' || type === 'img') {
        return labelForKind('image', { caption });
    }
    if (type === 'video') return labelForKind('video', { caption });
    if (type === 'voice') return labelForKind('voice', {});
    if (type === 'audio' || type === 'song' || type === 'music') {
        return labelForKind('audio', { meta, fileName, caption });
    }
    if (type === 'file' || type === 'document') {
        const url = extractHttpUrl(content) || (/^https?:\/\//i.test(fileName) ? fileName : null);
        const kind =
            kindFromMime(mime) ||
            kindFromFileName(fileName) ||
            (url ? kindFromUrl(url) : null) ||
            'file';
        if (kind !== 'file') return labelForKind(kind, { caption, meta, content, fileName });
        return labelForKind('file', { meta, content, fileName });
    }
    if (type === 'transaction') return "💰 O'tkazma";
    if (type === 'phone_call') return '📞 Qo‘ng‘iroq';
    if (type === 'lesson_start' || type === 'consult_panel_invite') {
        return content.slice(0, 80) || '🎓 Dars';
    }
    // type=text (yoki noma’lum): content URL / storage media
    const url = extractHttpUrl(content);
    if (url) {
        const kind =
            kindFromMime(mime) || kindFromFileName(fileName) || kindFromUrl(url);
        if (kind) return labelForKind(kind, { caption, meta, content: url, fileName });
    }
    if (caption && !content) return caption;
    if (/^https?:\/\//i.test(content) && isStorageHost(content)) {
        return labelForKind(kindFromUrl(content) || 'file', {
            caption,
            meta,
            content,
            fileName,
        });
    }
    return content || '';
}

/** Telegram dialogSubtitle: "You:" / group sender first name. */

export function withDialogSenderPrefix(
    body: string,
    opts: {
        fromMe?: boolean;
        senderName?: string | null;
        isGroupOrChannel?: boolean;
        youLabel?: string;
    }
): string {
    const text = String(body || '').trim();
    if (!text) return text;
    if (opts.fromMe) {
        const you = (opts.youLabel || 'You').trim() || 'You';
        return `${you}: ${text}`;
    }
    if (opts.isGroupOrChannel && opts.senderName) {
        const first = String(opts.senderName).trim().split(/\s+/)[0];
        if (first) return `${first}: ${text}`;
    }
    return text;
}
