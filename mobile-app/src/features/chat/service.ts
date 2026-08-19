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
    const raw = meta.url ?? meta.fileUrl ?? meta.file_url ?? meta.path ?? meta.src ?? meta.file;
    if (typeof raw === "string" && raw.trim() !== "") {
      return getFullUrl(raw);
    }
  }
  const c = String(msg.content ?? "").trim();
  if (
    (typ === "image" ||
      typ === "file" ||
      typ === "document" ||
      typ === "voice" ||
      typ === "video" ||
      typ === "audio") &&
    c
  ) {
    if (c.startsWith("http") || c.startsWith("/") || c.includes("uploads")) {
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
  }
  return {
    id: String(msg.id ?? msg._id),
    chatId: String(msg.chat_id ?? msg.chatId ?? ""),
    text,
    senderId: normalizeUserId(msg.sender_id ?? msg.senderId),
    timestamp: timeOk ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    status: msg.is_read ? "read" : "sent",
    messageType: typ,
    remoteFileUrl: resolveRemoteFileUrl(msg, typ),
    metadata: parseMetadata(msg),
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
        name: isGroup
          ? chat.name || "Chat"
          : chat.otherUser?.name
            ? `${chat.otherUser.name} ${chat.otherUser.surname || ""}`.trim()
            : "Foydalanuvchi",
        lastMessage,
        timestamp: chat.lastMessageAt
          ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        unreadCount: Number(chat.unread) || 0,
        avatarUrl: getFullUrl(pickChatAvatarPath(chat)),
        otherUserId: chat.otherUser?.id ? String(chat.otherUser.id) : null,
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

export type OutgoingMessageType = "text" | "image" | "file" | "audio" | "video";

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
  opts?: { peerUserId?: string | null }
): Promise<Message> {
  let content = text;
  let metadata: Record<string, unknown> | undefined;
  if (messageType === "text" && opts?.peerUserId) {
    const me = await getUser();
    const myId = me?.id;
    if (myId) {
      const enc = await encryptTextForPeer(String(myId), String(opts.peerUserId), text);
      if (enc) {
        content = enc.content;
        metadata = enc.metadata;
      }
    }
  }
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, type: messageType, metadata }),
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
  participants?: ChatDetailsParticipant[];
  messaging_unlocked?: boolean;
  metadata?: Record<string, any>;
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

