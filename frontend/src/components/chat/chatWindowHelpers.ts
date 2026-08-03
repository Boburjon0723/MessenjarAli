import { parseCreatedToMs } from '@/lib/chat-message-cache';
import { chatDebug } from '@/lib/chat-debug';

/** Vaqtinchalik: `send_message` emit — merge loglari bilan birga lifecycle */
export function logChatEmitSend(payload: {
    roomId?: unknown;
    clientSideId?: unknown;
    type?: unknown;
    content?: unknown;
}) {
    const c = payload.content;
    const contentPreview =
        typeof c === 'string' ? (c.length > 100 ? `${c.slice(0, 100)}…` : c) : String(c ?? '');
    chatDebug('emit send_message', {
        roomId: payload.roomId,
        clientSideId: payload.clientSideId ?? '(none)',
        type: payload.type ?? 'text',
        contentPreview,
    });
}

export function inferMessageTypeFromFile(name?: string, mime?: string): 'image' | 'video' | 'voice' | 'file' {
    const m = String(mime || '').toLowerCase();
    if (m.startsWith('image/')) return 'image';
    if (m.startsWith('video/')) return 'video';
    if (m.startsWith('audio/')) return 'voice';

    const n = String(name || '').toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/.test(n)) return 'image';
    if (/\.(mp4|mov|webm|mkv|avi|m4v)$/.test(n)) return 'video';
    if (/\.(mp3|wav|ogg|m4a|aac|flac|opus|weba)$/.test(n)) return 'voice';
    return 'file';
}

export function parseMessageDate(msg: { created_at?: unknown; createdAt?: unknown }): Date | null {
    const ms = parseCreatedToMs(msg?.created_at ?? msg?.createdAt);
    if (ms == null) return null;
    return new Date(ms);
}
