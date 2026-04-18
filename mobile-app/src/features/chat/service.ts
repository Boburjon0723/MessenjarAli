import { apiFetch } from "../../lib/api";
import { API_URL } from "../../lib/config";
import { Chat, Message } from "./types";

/** Rasm yo'lini to'liq URL'ga aylantiradi */
export function getFullUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function mapApiMessageToMessage(msg: any): Message {
  const raw = msg.created_at ?? msg.createdAt;
  const d = raw ? new Date(raw) : new Date(NaN);
  const timeOk = !Number.isNaN(d.getTime());
  return {
    id: String(msg.id ?? msg._id),
    chatId: String(msg.chat_id ?? msg.chatId ?? ""),
    text: String(msg.content ?? msg.text ?? ""),
    senderId: String(msg.sender_id ?? msg.senderId ?? ""),
    timestamp: timeOk ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    status: msg.is_read ? "read" : "sent",
  };
}

export async function getChatsRequest(): Promise<Chat[]> {
  const response = await apiFetch("/api/chats");
  if (!response.ok) {
    throw new Error("Chatlarni yuklab bo'lmadi");
  }
  const data = await response.json();

  return data.map((chat: any) => {
    const isGroup = chat.type === "group" || chat.type === "channel";
    const path = isGroup ? chat.avatar_url ?? chat.avatar : chat.otherUser?.avatar;

    return {
      id: String(chat.id || chat._id),
      type: chat.type,
      name: isGroup
          ? chat.name || "Chat"
          : chat.otherUser?.name
            ? `${chat.otherUser.name} ${chat.otherUser.surname || ""}`.trim()
            : "Foydalanuvchi",
      lastMessage: chat.lastMessage ?? "Xabarlar yo'q",
      timestamp: chat.lastMessageAt
        ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "",
      unreadCount: Number(chat.unread) || 0,
      avatarUrl: getFullUrl(path),
    };
  });
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
  return data.map(mapApiMessageToMessage);
}

export async function markChatReadRequest(chatId: string): Promise<void> {
  await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/read`, { method: "POST" });
}

export async function sendMessageRequest(chatId: string, text: string): Promise<Message> {
  const response = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: text, type: "text" }),
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
  return mapApiMessageToMessage(data);
}

