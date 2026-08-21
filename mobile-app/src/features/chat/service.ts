import { apiFetch } from "../../lib/api";
import { writeChatsToCache, writeMessagesToCache } from "../../lib/app-cache";
import { API_URL } from "../../lib/config";
import { getToken, getUser } from "../../lib/auth-storage";
import { Chat, Message } from "./types";
import { decryptListPreview, decryptMessage, decryptMessages } from "../../lib/e2e-chat";
import { encryptTextForPeer } from "../../lib/e2e-crypto";
import { E2E_PLACEHOLDER, isE2eEnvelope } from "../../lib/e2e-envelope";

/** UUID / id solishtirish uchun bir xil format */
export function normalizeUserId(id: string | null | undefined): string {
  return String(id ?? "")
    .trim()
    .toLowerCase();
}

/** Rasm yo'lini to'liq URL'ga aylantiradi */
export function getFullUrl(path: string | null | undefined): string | null {
  if (path == null || path === "") return null;
  const s = String(path).trim();
  if (s === "" || s === "null" || s === "use_initials") return null;
  if (s.startsWith("http") || s.startsWith("data:")) return s;
  return `${API_URL}${s.startsWith("/") ? "" : "/"}${s}`;
}

/** Avatar / media URL — chat va profil rasmlari uchun */
export function resolveAvatarUrl(raw: string | null | undefined): string | null {
  return getFullUrl(raw);
}

function pickChatAvatarPath(chat: any): string | null | undefined {
  const t = chat?.type;
  if (t === "group" || t === "channel") {
    return chat.avatar_url ?? chat.avatar ?? null;
  }
  const ou = chat?.otherUser;
  if (!ou) return null;
  return ou.avatar_url ?? ou.avatar ?? null;
}

function parseMetadata(msg: any): Record<string, unknown> | null {
  const m = msg.metadata;
  if (m == null) return null;
  if (typeof m === "string") {
    try {
      return JSON.parse(m) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof m === "object") return m as Record<string, unknown>;
  return null;
}

function resolveRemoteFileUrl(msg: any, typ: string): string | null {
  const meta = parseMetadata(msg);
  if (meta) {
    const raw = meta.url ?? meta.fileUrl ?? meta.file_url ?? meta.path ?? meta.src ?? meta.file ?? meta.webp;
    if (typeof raw === "string" && raw.trim() !== "") {
      return getFullUrl(raw);
    }
  }
  const c = String(msg.content ?? "").trim();
  if (
    (typ === "image" ||
      typ === "sticker" ||
      typ === "file" ||
      typ === "document" ||
      typ === "voice" ||
      typ === "video" ||
      typ === "audio") &&
    c
  ) {
    if (c.startsWith("http") || c.startsWith("/") || c.includes("uploads") || c.endsWith(".webp")) {
      return getFullUrl(c);
    }
  }
  return null;
}

export function mapApiMessageToMessage(msg: any): Message {
  const raw = msg.created_at ?? msg.createdAt;
  const d = raw ? new Date(raw) : new Date(NaN);
  const timeOk = !Number.isNaN(d.getTime());
  const typ = String(msg.type ?? "text").toLowerCase();
  let text = String(msg.content ?? msg.text ?? "").trim();
  if (!text) {
    if (typ === "image") text = "📷 Rasm";
    else if (typ === "voice" || typ === "audio") text = "🎤 Ovozli xabar";
    else if (typ === "file" || typ === "document") text = "📎 Fayl";
    else if (typ === "group_join_invite") text = "Guruhga taklif";
    else if (typ === "sticker") text = "Stiker";
  }
  const parent = msg.parentMessage || msg.parent_message;
  const parentId = msg.parent_id ?? msg.parentId ?? parent?.id ?? null;
  let parentPreview: Message["parentPreview"] = null;
  if (parentId) {
    const pText = String(parent?.text ?? parent?.content ?? "").trim();
    parentPreview = {
      text: pText || (parent?.type === "image" ? "📷 Rasm" : "Xabar"),
      senderName: parent?.senderName || parent?.sender_name || undefined,
      type: parent?.type ? String(parent.type) : undefined,
    };
  }
  return {
    id: String(msg.id ?? msg._id),
    chatId: String(msg.chat_id ?? msg.chatId ?? ""),
    text,
    senderId: normalizeUserId(msg.sender_id ?? msg.senderId),
    timestamp: timeOk ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    createdAt: msg.created_at ?? msg.createdAt ?? (timeOk ? d.toISOString() : null),
    status: msg.is_read ? "read" : "sent",
    messageType: typ,
    remoteFileUrl: resolveRemoteFileUrl(msg, typ),
    metadata: parseMetadata(msg),
    parentId: parentId ? String(parentId) : null,
    parentPreview,
  };
}

/** Shaxsiy chat: mavjud bo‘lsa qaytaradi, yo‘q bo‘lsa yaratadi (`POST /api/chats`) */
export async function createOrOpenPrivateChat(participantId: string): Promise<{
  chatId: string;
  name: string;
  avatarUrl: string | null;
}> {
  const response = await apiFetch("/api/chats", {
    method: "POST",
    body: JSON.stringify({ participantId }),
  });
  if (!response.ok) {
    let message = "Chat ochilmadi";
    try {
      const j = (await response.json()) as { message?: string };
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const chat = (await response.json()) as {
    id?: string;
    otherUser?: { name?: string; surname?: string; avatar?: string | null };
  };
  const chatId = String(chat.id ?? "").trim();
  if (!chatId) {
    throw new Error("Server javobida chat ID yo‘q");
  }
  const ou = chat.otherUser;
  const name = ou
    ? `${ou.name || ""} ${ou.surname || ""}`.trim() || "Chat"
    : "Chat";
  const avatarUrl = getFullUrl(ou?.avatar ?? null);
  return {
    chatId,
    name,
    avatarUrl,
  };
}

/** Telegram Saved Messages — `POST /api/chats/saved-messages` */
export async function openSavedMessagesRequest(): Promise<{
  chatId: string;
  name: string;
  is_saved_messages: true;
}> {
  const response = await apiFetch("/api/chats/saved-messages", { method: "POST" });
  if (!response.ok) {
    let message = "Saqlangan xabarlar ochilmadi";
    try {
      const j = (await response.json()) as { message?: string };
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const chat = (await response.json()) as { id?: string; _id?: string };
  const chatId = String(chat.id || chat._id || "").trim();
  if (!chatId) throw new Error("Server javobida chat ID yo‘q");
  return {
    chatId,
    name: "Saqlangan xabarlar",
    is_saved_messages: true,
  };
}

export async function getChatsRequest(): Promise<Chat[]> {
  const response = await apiFetch("/api/chats");
  if (!response.ok) {
    throw new Error("Chatlarni yuklab bo'lmadi");
  }
  const data = await response.json();

  const list = await Promise.all(
    data.map(async (chat: any) => {
      const isGroup = chat.type === "group" || chat.type === "channel";
      let lastMessage = chat.lastMessage ?? "Xabarlar yo'q";
      if (isE2eEnvelope(chat.lastMessageMeta) && chat.lastMessageCipher) {
        lastMessage = await decryptListPreview(
          chat.lastMessageCipher,
          chat.lastMessageMeta,
          E2E_PLACEHOLDER
        );
      }
      return {
        id: String(chat.id || chat._id),
        type: chat.type,
        is_saved_messages: !!chat.is_saved_messages,
        name: chat.is_saved_messages
          ? "Saqlangan xabarlar"
          : isGroup
            ? chat.name || "Chat"
            : chat.otherUser?.name
              ? `${chat.otherUser.name} ${chat.otherUser.surname || ""}`.trim()
              : "Foydalanuvchi",
        lastMessage,
        timestamp: chat.lastMessageAt
          ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        unreadCount: Number(chat.unread) || 0,
        avatarUrl: chat.is_saved_messages ? null : getFullUrl(pickChatAvatarPath(chat)),
        otherUserId: chat.is_saved_messages
          ? null
          : chat.otherUser?.id
            ? String(chat.otherUser.id)
            : null,
        muted: chat.muted != null ? !!chat.muted : undefined,
        pinned: chat.pinned != null ? !!chat.pinned : undefined,
        archived: chat.archived != null ? !!chat.archived : undefined,
      };
    })
  );
  await writeChatsToCache(list);
  return list;
}

export async function getMessagesRequest(chatId: string): Promise<Message[]> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`);
  if (!response.ok) {
    throw new Error("Xabarlarni yuklab bo'lmadi");
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }
  const mapped = data.map(mapApiMessageToMessage);
  const decrypted = await decryptMessages(mapped);
  await writeMessagesToCache(chatId, decrypted);
  return decrypted;
}

export async function markChatReadRequest(chatId: string): Promise<void> {
  await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/read`, { method: "POST" });
}

export type OutgoingMessageType =
  | "text"
  | "image"
  | "file"
  | "audio"
  | "video"
  | "voice"
  | "sticker";

/** Galereya / fayl — serverga multipart, javobda URL */
export async function uploadChatFileRequest(
  localUri: string,
  filename: string,
  mimeType: string
): Promise<string> {
  const token = await getToken();
  const formData = new FormData();
  formData.append("files", {
    uri: localUri,
    name: filename || "file",
    type: mimeType || "application/octet-stream",
  } as unknown as Blob);

  const res = await fetch(`${API_URL}/api/media/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || "Fayl yuklanmadi");
  }
  const data = (await res.json()) as {
    files?: { url?: string }[];
    urls?: string[];
  };
  const url = data.files?.[0]?.url ?? data.urls?.[0];
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Server javobida fayl URL yo‘q");
  }
  return url.trim();
}

export function messageTypeFromMime(mime: string | undefined | null): OutgoingMessageType {
  const m = String(mime ?? "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (m) return "file";
  return "file";
}

export async function sendMessageRequest(
  chatId: string,
  text: string,
  messageType: OutgoingMessageType = "text",
  opts?: {
    peerUserId?: string | null;
    parentId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<Message> {
  let content = text;
  let metadata: Record<string, unknown> | undefined = opts?.metadata
    ? { ...opts.metadata }
    : undefined;
  if (messageType === "text" && opts?.peerUserId) {
    const { E2E_SEND_ENABLED } = await import("../../lib/e2e-envelope");
    if (E2E_SEND_ENABLED) {
      const me = await getUser();
      const myId = me?.id;
      if (myId) {
        const enc = await encryptTextForPeer(String(myId), String(opts.peerUserId), text);
        if (enc) {
          content = enc.content;
          metadata = { ...(metadata || {}), ...enc.metadata };
        }
      }
    }
  }
  const body: Record<string, unknown> = { content, type: messageType, metadata };
  if (opts?.parentId) body.parentId = opts.parentId;
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let message = "Xabar yuborilmadi";
    try {
      const j = JSON.parse(errText);
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const data = await response.json();
  return decryptMessage(mapApiMessageToMessage(data));
}

export const getLiveKitTokenRequest = async (chatId: string, username: string): Promise<{ token: string; wsUrl: string }> => {
  const res = await apiFetch(`/api/livekit/token?room=${chatId}&username=${encodeURIComponent(username)}`);
  if (!res.ok) throw new Error("Failed to get LiveKit token");
  return res.json();
};

export type ChatDetailsParticipant = {
  id: string;
  name?: string;
  surname?: string;
  avatar?: string | null;
  phone?: string | null;
  listing_privacy?: boolean;
  specialization?: string;
  profession?: string;
};

export type ChatDetailsResponse = {
  id?: string;
  type?: string;
  chat_type?: string;
  name?: string | null;
  avatar_url?: string | null;
  creator_id?: string | null;
  participants?: ChatDetailsParticipant[];
  messaging_unlocked?: boolean;
  metadata?: Record<string, any>;
  pinned_message_id?: string | null;
  pinnedMessage?: any;
};

/** Suhbatdosh / guruh haqida — `GET /api/chats/:chatId` */
export async function getChatDetailsRequest(chatId: string): Promise<ChatDetailsResponse> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}`);
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(errText || "Chat ma'lumotlari yuklanmadi");
  }
  return response.json() as Promise<ChatDetailsResponse>;
}

export async function initiateSessionRequest(expert_id: string, amount_mali: number, chat_id: string): Promise<any> {
  const response = await apiFetch('/api/service/initiate', {
    method: 'POST',
    body: JSON.stringify({ expert_id, amount_mali, chat_id }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let message = "To'lov amalga oshirilmadi";
    try {
      const j = JSON.parse(errText);
      if (j?.message) message = String(j.message);
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return response.json();
}

/** Bulk delete — `DELETE /api/chats/:chatId/messages/bulk` */
export async function deleteMessagesRequest(chatId: string, messageIds: string[]): Promise<void> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages/bulk`, {
    method: "DELETE",
    body: JSON.stringify({ messageIds }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(errText || "Xabar o'chirilmadi");
  }
}

/** Barcha xabarlarni tozalash — `DELETE /api/chats/:chatId/messages` */
export async function clearChatMessagesRequest(chatId: string): Promise<void> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(errText || "Tarix tozalanmadi");
  }
}

/** Ustoz → talaba shaxsiy chatiga guruh obuna taklifi */
export async function sendGroupJoinInviteRequest(params: {
  groupId: string;
  studentUserId: string;
  expertName: string;
}): Promise<void> {
  const response = await apiFetch("/api/specialists/mentor/group-join-invite", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    let message = "Taklif yuborilmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

export async function subscribeToMentorRequest(mentorId: string): Promise<void> {
  const response = await apiFetch("/api/wallet/subscribe-to-mentor", {
    method: "POST",
    body: JSON.stringify({ mentorId }),
  });
  if (!response.ok) {
    let message = "Obuna amalga oshmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

export async function getMentorSubscriptionStatus(
  mentorId: string
): Promise<{ active: boolean; monthlyAmount?: number }> {
  const response = await apiFetch(
    `/api/wallet/subscription-status?mentorId=${encodeURIComponent(mentorId)}`
  );
  if (!response.ok) return { active: false };
  const data = await response.json().catch(() => ({}));
  return {
    active: !!data?.active,
    monthlyAmount: Number(data?.monthlyAmount) || undefined,
  };
}

/** Obuna bilan guruhga qo‘shilish */
export async function joinGroupWithSubscriptionRequest(groupId: string): Promise<void> {
  const response = await apiFetch(
    `/api/chats/${encodeURIComponent(groupId)}/join-with-subscription`,
    { method: "POST" }
  );
  if (!response.ok) {
    let message = "Guruhga qo'shilish amalga oshmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Guruhdan chiqish */
export async function leaveGroupRequest(chatId: string): Promise<void> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/leave`, {
    method: "POST",
  });
  if (!response.ok) {
    let message = "Guruhdan chiqib bo'lmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Guruhni o‘chirish (yaratuvchi) */
export async function deleteChatRequest(chatId: string): Promise<void> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    let message = "Guruhni o'chirib bo'lmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Guruh nomi / avatar */
export async function updateGroupChatRequest(
  chatId: string,
  updates: { name?: string; avatar_url?: string }
): Promise<void> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    let message = "Yangilanmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

export async function updateChatPrefsRequest(
  chatId: string,
  prefs: {
    muted?: boolean;
    pinned?: boolean;
    archived?: boolean;
    unreadMarked?: boolean;
  }
): Promise<{
  muted: boolean;
  pinned: boolean;
  archived: boolean;
  unreadMarked: boolean;
}> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/prefs`, {
    method: "PATCH",
    body: JSON.stringify(prefs),
  });
  if (!response.ok) {
    throw new Error("Sozlama saqlanmadi");
  }
  const data = await response.json();
  return {
    muted: !!data?.muted,
    pinned: !!data?.pinned,
    archived: !!data?.archived,
    unreadMarked: !!data?.unreadMarked,
  };
}

/** Xabarni qadash / unpin — `POST /api/chats/:id/pin` (`messageId: null` = unpin) */
export async function pinMessageRequest(
  chatId: string,
  messageId: string | null
): Promise<void> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/pin`, {
    method: "POST",
    body: JSON.stringify({ messageId }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(errText || "Pin qilinmadi");
  }
}

/** Guruh yoki kanal yaratish — `POST /api/chats` */
export async function createGroupOrChannelRequest(params: {
  type: "group" | "channel";
  name: string;
  participants?: string[];
  avatarUrl?: string;
}): Promise<{ id: string; name: string }> {
  const response = await apiFetch("/api/chats", {
    method: "POST",
    body: JSON.stringify({
      type: params.type,
      name: params.name.trim(),
      participants: params.participants || [],
      avatarUrl: params.avatarUrl,
    }),
  });
  if (!response.ok) {
    let message = "Yaratilmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const chat = await response.json();
  const id = String(chat.id || chat._id || "").trim();
  if (!id) throw new Error("Chat ID yo'q");
  return { id, name: String(chat.name || params.name) };
}

/** Ekspert guruhlari — `GET /api/chats/expert/:id` */
export async function getExpertGroupsRequest(
  expertId: string
): Promise<{ id: string; name: string }[]> {
  const response = await apiFetch(`/api/chats/expert/${encodeURIComponent(expertId)}`);
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((g: any) => ({
      id: String(g.id || g.chatId || ""),
      name: String(g.name || "Guruh"),
    }))
    .filter((g: { id: string }) => !!g.id);
}

/** Mentor guruh taklifi eligibility */
export async function getMentorInviteEligibilityRequest(
  privateChatId: string
): Promise<{ showInviteBar: boolean; canReinviteViaListing?: boolean }> {
  const response = await apiFetch(
    `/api/specialists/mentor/group-invite-eligibility?chatId=${encodeURIComponent(privateChatId)}`
  );
  if (!response.ok) return { showInviteBar: true };
  const data = await response.json().catch(() => ({}));
  return {
    showInviteBar: data?.showInviteBar !== false,
    canReinviteViaListing: !!data?.canReinviteViaListing,
  };
}

/** Shaxsiy chatdan guruhga taklif — web MentorGroupInviteBar */
export async function sendMentorGroupInviteInPrivateChat(params: {
  chatId: string;
  groupId: string;
  expertName: string;
}): Promise<void> {
  const response = await apiFetch("/api/specialists/mentor/group-join-invite", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    let message = "Taklif yuborilmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

export type ContactRow = {
  id: string;
  name: string;
  phone?: string;
  avatar?: string | null;
};

export async function getContactsRequest(): Promise<ContactRow[]> {
  const response = await apiFetch("/api/users/contacts");
  if (!response.ok) return [];
  const users = await response.json();
  if (!Array.isArray(users)) return [];
  return users
    .map((u: any) => {
      const id = String(u.id ?? u.userId ?? "").trim();
      if (!id) return null;
      return {
        id,
        name: [u.name, u.surname].filter(Boolean).join(" ") || u.phone || "Kontakt",
        phone: u.phone || "",
        avatar: u.avatar || u.avatar_url || null,
      };
    })
    .filter(Boolean) as ContactRow[];
}

/** Web: POST `/api/users/contacts` `{ contactUserId, name?, surname? }` */
export async function addContactRequest(
  contactUserId: string,
  name?: string,
  surname?: string
): Promise<void> {
  const response = await apiFetch("/api/users/contacts", {
    method: "POST",
    body: JSON.stringify({
      contactUserId,
      name: name ?? undefined,
      surname: surname ?? undefined,
    }),
  });
  if (!response.ok) {
    let message = "Kontakt qo'shilmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Web: PUT `/api/users/contacts` */
export async function updateContactRequest(params: {
  contactUserId: string;
  name?: string;
  surname?: string;
}): Promise<void> {
  const response = await apiFetch("/api/users/contacts", {
    method: "PUT",
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    let message = "Kontakt yangilanmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Web: DELETE `/api/users/contacts/:id` */
export async function deleteContactRequest(contactUserId: string): Promise<void> {
  const response = await apiFetch(
    `/api/users/contacts/${encodeURIComponent(contactUserId)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    let message = "Kontakt o'chirilmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Web: POST `/api/users/block` `{ targetId }` */
export async function blockUserRequest(userId: string): Promise<void> {
  const response = await apiFetch("/api/users/block", {
    method: "POST",
    body: JSON.stringify({ targetId: userId }),
  });
  if (!response.ok) {
    let message = "Bloklash amalga oshmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

/** Web: POST `/api/users/unblock` `{ targetId }` */
export async function unblockUserRequest(userId: string): Promise<void> {
  const response = await apiFetch("/api/users/unblock", {
    method: "POST",
    body: JSON.stringify({ targetId: userId }),
  });
  if (!response.ok) {
    let message = "Blokdan chiqarish amalga oshmadi";
    try {
      const j = await response.json();
      if (j?.message) message = String(j.message);
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
}

export type PeerUserDetails = {
  id: string;
  name?: string;
  surname?: string;
  phone?: string | null;
  bio?: string | null;
  username?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  specialization?: string | null;
  profession?: string | null;
  isBlocked?: boolean;
  blockedByMe?: boolean;
  isOnline?: boolean;
  last_seen?: string | number | null;
  lastSeen?: string | number | null;
};

export async function getUserByIdRequest(userId: string): Promise<PeerUserDetails | null> {
  const response = await apiFetch(`/api/users/${encodeURIComponent(userId)}`);
  if (!response.ok) return null;
  const data = await response.json();
  if (!data || typeof data !== "object") return null;
  return {
    ...data,
    id: String((data as any).id ?? userId),
  } as PeerUserDetails;
}

export type ChatStatsResponse = {
  linksCount: number;
  voiceCount: number;
  commonGroupsCount: number;
};

export async function getChatStatsRequest(chatId: string): Promise<ChatStatsResponse> {
  const response = await apiFetch(`/api/users/chat-stats/${encodeURIComponent(chatId)}`);
  if (!response.ok) {
    return { linksCount: 0, voiceCount: 0, commonGroupsCount: 0 };
  }
  const data = await response.json();
  return {
    linksCount: Number(data?.linksCount) || 0,
    voiceCount: Number(data?.voiceCount) || 0,
    commonGroupsCount: Number(data?.commonGroupsCount) || 0,
  };
}

export type ChatSharedKind = "photos" | "videos" | "files" | "links" | "voice" | "groups";

export type ChatSharedItem = {
  id: string;
  content?: string;
  type?: string;
  created_at?: string;
  url?: string | null;
  name?: string;
  avatar?: string | null;
  metadata?: unknown;
  sender_id?: string | null;
};

/**
 * GET `/api/users/chat-shared/:chatId?kind=`
 * Backend hozircha `links|voice|groups` ni qo'llab-quvvatlaydi.
 * `photos|videos|files` uchun xabarlar ro'yxatidan filtr (web GroupInfoPanel ham stub).
 */
export async function getChatSharedRequest(
  chatId: string,
  kind: ChatSharedKind
): Promise<ChatSharedItem[]> {
  if (kind === "photos" || kind === "videos" || kind === "files") {
    const messages = await getMessagesRequest(chatId);
    const want =
      kind === "photos"
        ? new Set(["image", "photo", "sticker"])
        : kind === "videos"
          ? new Set(["video"])
          : new Set(["file", "document", "audio"]);
    return messages
      .filter((m) => want.has(String(m.messageType || "").toLowerCase()))
      .map((m) => ({
        id: String(m.id),
        content: m.text,
        type: m.messageType,
        created_at: m.timestamp,
        url: m.remoteFileUrl ?? null,
        metadata: m.metadata,
      }));
  }

  const response = await apiFetch(
    `/api/users/chat-shared/${encodeURIComponent(chatId)}?kind=${encodeURIComponent(kind)}`
  );
  if (!response.ok) return [];
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map((row: any) => ({
    id: String(row.id ?? ""),
    content: row.content != null ? String(row.content) : undefined,
    type: row.type != null ? String(row.type) : undefined,
    created_at: row.created_at,
    url:
      typeof row.url === "string"
        ? getFullUrl(row.url)
        : typeof row.content === "string" &&
            (row.content.startsWith("http") || row.content.startsWith("/"))
          ? getFullUrl(row.content)
          : null,
    name: row.name != null ? String(row.name) : undefined,
    avatar: row.avatar ?? null,
    metadata: row.metadata,
    sender_id: row.sender_id != null ? String(row.sender_id) : null,
  }));
}

/** Web bilan bir xil taklif havolasi (frontend :3000) */
export function buildGroupInviteLink(chatId: string): string {
  try {
    const u = new URL(API_URL);
    if (u.port === "4000") u.port = "3000";
    u.pathname = "/";
    u.search = `invite=${encodeURIComponent(chatId)}`;
    u.hash = "";
    return u.toString();
  } catch {
    return `/?invite=${encodeURIComponent(chatId)}`;
  }
}

