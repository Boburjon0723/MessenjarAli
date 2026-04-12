import { getUser } from '@/lib/auth-storage';
import { getChatMetadata } from '@/lib/listing-chat';

/**
 * Shaxsiy chatda sherikning user UUID si. chat.id (suhbat id si) qaytarilmaydi.
 * Avvalo `participants` ishonchli — ba'zi holatlarda `participantId` / `otherUser` noto'g'ri bo'lishi mumkin.
 */
export function getPrivateChatPeerUserId(chat: {
  id?: string | number;
  type?: string;
  otherUser?: { id?: string; user_id?: string };
  participants?: unknown;
  participantId?: string;
  userId?: string;
  metadata?: unknown;
} | null): string | null {
  if (!chat || chat.type !== 'private') return null;

  const chatId = chat.id != null ? String(chat.id) : null;
  const me = getUser() as { id?: string } | null;
  const myId = me?.id != null ? String(me.id) : null;

  const notConversationId = (id: string | null | undefined): string | null => {
    if (id == null || id === '') return null;
    const s = String(id).trim();
    if (chatId && s === chatId) return null;
    return s;
  };

  let participantList: string[] = [];
  if (Array.isArray(chat.participants)) {
    participantList = chat.participants.map((p) => String(p));
  } else if (typeof chat.participants === 'string') {
    try {
      const parsed = JSON.parse(chat.participants);
      if (Array.isArray(parsed)) participantList = parsed.map((p: unknown) => String(p));
    } catch {
      /* ignore */
    }
  }

  if (participantList.length > 0 && myId) {
    const other = participantList.find((p) => String(p) !== myId);
    const cand = notConversationId(other ?? null);
    if (cand) return cand;
  }

  const meta = getChatMetadata(chat);
  if (meta.expert_id && myId) {
    const eid = String(meta.expert_id);
    if (eid !== myId) {
      const cand = notConversationId(eid);
      if (cand) return cand;
    }
  }

  if (chat.otherUser?.id != null) {
    const cand = notConversationId(chat.otherUser.id);
    if (cand) return cand;
  }
  if (chat.otherUser?.user_id != null) {
    const cand = notConversationId(chat.otherUser.user_id);
    if (cand) return cand;
  }
  if (chat.participantId != null) {
    const cand = notConversationId(chat.participantId);
    if (cand) return cand;
  }
  if (chat.userId != null) {
    const cand = notConversationId(chat.userId);
    if (cand) return cand;
  }

  return null;
}
