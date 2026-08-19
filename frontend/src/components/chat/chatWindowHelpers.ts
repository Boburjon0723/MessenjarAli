import { parseCreatedToMs } from '@/lib/chat-message-cache';
import { chatDebug } from '@/lib/chat-debug';
import { inferSendTypeFromFile } from '@/lib/telegram-message-kind';

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

export function inferMessageTypeFromFile(name?: string, mime?: string): 'image' | 'video' | 'audio' | 'file' {
    return inferSendTypeFromFile(name, mime);
}

export function parseMessageDate(msg: { created_at?: unknown; createdAt?: unknown }): Date | null {
    const ms = parseCreatedToMs(msg?.created_at ?? msg?.createdAt);
    if (ms == null) return null;
    return new Date(ms);
}
