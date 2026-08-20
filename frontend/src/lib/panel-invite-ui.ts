import type { ChatMessage } from '@/types/chat-message';
import { normalizeMessageType } from '@/lib/chat-message-cache';

const INVITE_TYPES = new Set(['lesson_start', 'consult_panel_invite']);

function parseInviteMeta(raw: ChatMessage['metadata']): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return raw;
}

/** Dars/taklif tugmasi: keyinroq yakun yoki yangi taklif bo‘lsa — muddati tugagan. */
export function computeExpiredPanelInviteIds(messages: ChatMessage[]): Set<string> {
    const expired = new Set<string>();
    const inviteIndexes: number[] = [];
    for (let i = 0; i < messages.length; i++) {
        const type = normalizeMessageType(messages[i]?.type);
        if (INVITE_TYPES.has(type)) inviteIndexes.push(i);
    }
    for (const i of inviteIndexes) {
        const msg = messages[i];
        const meta = parseInviteMeta(msg.metadata);
        if (meta.invite_status === 'expired' || meta.status === 'expired') {
            expired.add(String(msg.id));
            continue;
        }
        let superseded = false;
        for (let j = i + 1; j < messages.length; j++) {
            const later = normalizeMessageType(messages[j]?.type);
            if (later === 'lesson_end' || INVITE_TYPES.has(later)) {
                superseded = true;
                break;
            }
        }
        if (superseded) expired.add(String(msg.id));
    }
    return expired;
}
