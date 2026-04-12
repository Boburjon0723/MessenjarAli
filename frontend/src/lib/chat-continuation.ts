/**
 * Ketma-ket xabarlarni bir guruh (avatar/ism bir marta) deb hisoblash — ChatWindow bilan bir xil qoidalar.
 */
import type { ChatMessage } from '@/types/chat-message';
import { normalizeMessageType, parseCreatedToMs } from '@/lib/chat-message-cache';

const CONTINUATION_MAX_MS = 5 * 60 * 1000;

export function isNonTextMessageType(raw: unknown): boolean {
    const t = normalizeMessageType(raw);
    return ['image', 'video', 'voice', 'file'].includes(t);
}

/** Matn ↔ media chegarasi — ketma-ketlikni uzadi */
export function isMediaTextBoundary(prevType: unknown, currType: unknown): boolean {
    return isNonTextMessageType(prevType) !== isNonTextMessageType(currType);
}

/**
 * Shaxsiy chatda `sender_id` ba'zan kesh/API da farq qiladi — "them" uchun sherik UUID ishonchli kalit.
 * Guruh chatda `sender_id` bo‘lmasa, ism bo‘yicha (guruhda noyob emas, lekin yaxshiroq) yoki `id` bilan ajratamiz.
 */
export function senderKeyForGrouping(
    m: ChatMessage,
    opts: { peerUserId: string | null; myUserId: string | null }
): string {
    const my = opts.myUserId != null && opts.myUserId !== '' ? String(opts.myUserId) : '';
    const sid = m.sender_id != null && m.sender_id !== '' ? String(m.sender_id) : '';

    if (my && sid && sid === my) return my;
    if (m.sender === 'me' && my) return my;
    if (sid) return sid;
    if (m.sender === 'them' && opts.peerUserId) return String(opts.peerUserId);
    if (m.sender === 'them') {
        const name = String(m.senderName ?? '').trim();
        if (name) return `them:${name}`;
        return `them:id:${m.id}`;
    }
    return m.sender === 'me' ? 'me' : 'them';
}

function timeGapAllowsContinuation(prev: ChatMessage, curr: ChatMessage): boolean {
    const a = parseCreatedToMs(prev.created_at ?? prev.createdAt);
    const b = parseCreatedToMs(curr.created_at ?? curr.createdAt);
    if (a != null && b != null) {
        const d = b - a;
        return d >= 0 && d < CONTINUATION_MAX_MS;
    }
    /** Bir yoki ikkala vaqt yo‘q — guruhlashni buzmaymiz (migratsiya/kesh) */
    return true;
}

export function computeMessageContinuation(
    prevMsg: ChatMessage | undefined,
    currMsg: ChatMessage,
    opts: { peerUserId: string | null; myUserId: string | null }
): boolean {
    if (!prevMsg) return false;
    if (isMediaTextBoundary(prevMsg.type, currMsg.type)) return false;
    if (senderKeyForGrouping(prevMsg, opts) !== senderKeyForGrouping(currMsg, opts)) return false;
    return timeGapAllowsContinuation(prevMsg, currMsg);
}
