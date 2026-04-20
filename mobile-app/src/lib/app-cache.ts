import AsyncStorage from "@react-native-async-storage/async-storage";
import { getUser } from "./auth-storage";
import type { Chat, Message } from "../features/chat/types";

const PREFIX = "expertline_cache";

async function userIdOrNull(): Promise<string | null> {
  const u = await getUser();
  if (!u) return null;
  const id = (u as { id?: string; _id?: string }).id ?? (u as { _id?: string })._id;
  return id != null && String(id).trim() !== "" ? String(id).trim() : null;
}

function chatsKey(uid: string): string {
  return `${PREFIX}:chats:${uid}`;
}

function messagesKey(uid: string, chatId: string): string {
  return `${PREFIX}:messages:${uid}:${chatId}`;
}

export async function readChatsFromCache(): Promise<Chat[] | null> {
  const uid = await userIdOrNull();
  if (!uid) return null;
  try {
    const raw = await AsyncStorage.getItem(chatsKey(uid));
    if (raw == null || raw === "") return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Chat[];
  } catch {
    return null;
  }
}

export async function writeChatsToCache(chats: Chat[]): Promise<void> {
  const uid = await userIdOrNull();
  if (!uid) return;
  try {
    await AsyncStorage.setItem(chatsKey(uid), JSON.stringify(chats));
  } catch {
    /* disk to‘lgan bo‘lsa — e’tiborsiz */
  }
}

export async function readMessagesFromCache(chatId: string): Promise<Message[] | null> {
  const uid = await userIdOrNull();
  if (!uid || !chatId) return null;
  try {
    const raw = await AsyncStorage.getItem(messagesKey(uid, chatId));
    if (raw == null || raw === "") return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Message[];
  } catch {
    return null;
  }
}

export async function writeMessagesToCache(chatId: string, messages: Message[]): Promise<void> {
  const uid = await userIdOrNull();
  if (!uid || !chatId) return;
  try {
    await AsyncStorage.setItem(messagesKey(uid, chatId), JSON.stringify(messages));
  } catch {
    /* ignore */
  }
}

/** Chiqishdan oldin yoki akkaunt almashganda */
export async function clearChatCacheForUser(userId: string): Promise<void> {
  const uid = String(userId).trim();
  if (!uid) return;
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter(
      (k) => k === chatsKey(uid) || k.startsWith(`${PREFIX}:messages:${uid}:`)
    );
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    /* ignore */
  }
}
