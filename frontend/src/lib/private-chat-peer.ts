import { getUser } from '@/lib/auth-storage';
import { getChatMetadata } from '@/lib/listing-chat';

/**
 * Shaxsiy chatda sherikning user UUID si. chat.id (suhbat id si) qaytarilmaydi.
 * O'chirilgan akkaunt uchun UUID qaytarmaydi (kontakt/xabar xavfsizligi).
 */
export function getPrivateChatPeerUserId(chat: {
  id?: string | number;
  type?: string;
  otherUser?: { id?: string; user_id?: string };
  participants?: unknown;
  participantId?: string;
  userId?: string;
  metadata?: unknown;
  peerUnavailable?: boolean;
} | null): string | null {
  if (!chat || chat.type !== 'private') return null;
  if (chat.peerUnavailable) return null;

  const chatId = chat.id != null ? String(chat.id) : null;
  const me = getUser() as { id?: string } | null;
  const myId = me?.id != null ? String(me.id) : null;

  const notConversationId = (id: string | null | undefined): string | null => {
    if (id == null || id === '') return null;
    const s = String(id).trim();
    if (chatId && s === chatId) return null;
    return s;
  };

  // Faqat mavjud otherUser — o'chirilgan akkaunt UUID sini qaytarmaymiz
  if (chat.otherUser?.id != null) {
    const cand = notConversationId(chat.otherUser.id);
    if (cand) return cand;
  }
  if (chat.otherUser?.user_id != null) {
    const cand = notConversationId(chat.otherUser.user_id);
    if (cand) return cand;
  }

  // otherUser yo'q bo'lsa participants dan UUID olish — xavfsizlik uchun yo'q
  if (!chat.otherUser?.id && !chat.otherUser?.user_id) {
    return null;
  }

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

/** Shaxsiy chat sherigi o'chirilgan / Unknown User holati */
export function isPrivatePeerUnavailable(chat: {
  type?: string;
  peerUnavailable?: boolean;
  is_saved_messages?: boolean;
  otherUser?: { id?: string; name?: string } | null;
  name?: string;
} | null): boolean {
  if (!chat || chat.type !== 'private') return false;
  if (chat.is_saved_messages) return false;
  if (chat.peerUnavailable) return true;
  if (!chat.otherUser?.id) return true;
  const n = String(chat.name || chat.otherUser?.name || '')
    .trim()
    .toLowerCase();
  if (n === 'unknown user' || n === 'unknown') return true;
  return false;
}
