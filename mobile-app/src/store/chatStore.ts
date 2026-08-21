import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Chat, Message } from '../features/chat/types';
import { getChatsRequest, getMessagesRequest } from '../features/chat/service';

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>;
  isLoadingChats: boolean;
  
  // Asosiy Telegram arxivitekturasi: Local -> Remote -> Update
  loadChats: () => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  
  // UI darajasida kelgan xabarlarni manual ulash uchun
  addMessageLocally: (chatId: string, message: Message) => void;
  updateMessageLocally: (chatId: string, messageId: string, updates: Partial<Message>) => void;
  removeMessagesLocally: (chatId: string, messageIds: string[]) => void;
  clearMessagesLocally: (chatId: string) => void;
  removeChatLocally: (chatId: string) => void;
  updateChatLocally: (chatId: string, updates: Partial<Chat>) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  isLoadingChats: true,

  loadChats: async () => {
    // 1. OFFLINE FIRST: Keshdan bir soniyaga qolmay ekranga chiqaramiz
    try {
      const cached = await AsyncStorage.getItem('@expertline_chats');
      if (cached) {
        set({ chats: JSON.parse(cached), isLoadingChats: false });
      }
    } catch { /* ignore */ }

    // 2. BACKGROUND SYNC: Orqa fonda API ga yangi ma'lumot so'raymiz
    try {
      if (!get().chats.length) set({ isLoadingChats: true });
      const serverChats = await getChatsRequest();
      set({ chats: serverChats, isLoadingChats: false });
      // Keshni yangilab qo'yamiz
      await AsyncStorage.setItem('@expertline_chats', JSON.stringify(serverChats));
    } catch (error) {
      console.warn("Chats sync failed (Offline mode active):", error);
      set({ isLoadingChats: false });
    }
  },

  loadMessages: async (chatId: string) => {
    // 1. OFFLINE FIRST: Lokal bazada bor bo'lsa darhol yuklaymiz
    try {
      const cached = await AsyncStorage.getItem(`@expertline_messages_${chatId}`);
      if (cached) {
        set((state) => ({
          messages: { ...state.messages, [chatId]: JSON.parse(cached) }
        }));
      }
    } catch { /* ignore */ }

    // 2. BACKGROUND INCREMENTAL SYNC: Orqa fonda API
    try {
      // API call
      const serverMessages = await getMessagesRequest(chatId);
      
      set((state) => ({
        messages: { ...state.messages, [chatId]: serverMessages }
      }));
      // Save offline
      await AsyncStorage.setItem(`@expertline_messages_${chatId}`, JSON.stringify(serverMessages));
    } catch (error) {
      console.warn(`Messages sync failed for ${chatId} (Offline mode active):`, error);
    }
  },

  addMessageLocally: (chatId, message) => {
    set((state) => {
      const current = state.messages[chatId] || [];
      // Tekshiramiz, ehtimol xabar allaqachon bormi (socket takrorlanishi)
      if (current.some(m => m.id === message.id)) return state;
      
      const newMessages = [...current, message];
      
      // Async keshni sekin yangilaymiz (orqa fonda)
      AsyncStorage.setItem(`@expertline_messages_${chatId}`, JSON.stringify(newMessages)).catch(() => {});
      
      return {
        messages: { ...state.messages, [chatId]: newMessages }
      };
    });
  },

  updateMessageLocally: (chatId, messageId, updates) => {
    set((state) => {
      const current = state.messages[chatId] || [];
      const newMessages = current.map(m => m.id === messageId ? { ...m, ...updates } : m);
      return { messages: { ...state.messages, [chatId]: newMessages } };
    });
  },

  removeMessagesLocally: (chatId, messageIds) => {
    const idSet = new Set(messageIds.map(String));
    set((state) => {
      const current = state.messages[chatId] || [];
      const newMessages = current.filter((m) => !idSet.has(String(m.id)));
      AsyncStorage.setItem(`@expertline_messages_${chatId}`, JSON.stringify(newMessages)).catch(() => {});
      return { messages: { ...state.messages, [chatId]: newMessages } };
    });
  },

  clearMessagesLocally: (chatId) => {
    set((state) => {
      AsyncStorage.setItem(`@expertline_messages_${chatId}`, JSON.stringify([])).catch(() => {});
      return { messages: { ...state.messages, [chatId]: [] } };
    });
  },

  removeChatLocally: (chatId) => {
    set((state) => {
      const nextMessages = { ...state.messages };
      delete nextMessages[chatId];
      AsyncStorage.removeItem(`@expertline_messages_${chatId}`).catch(() => {});
      const newChats = state.chats.filter((c) => String(c.id) !== String(chatId));
      AsyncStorage.setItem("@expertline_chats", JSON.stringify(newChats)).catch(() => {});
      return { chats: newChats, messages: nextMessages };
    });
  },
  
  updateChatLocally: (chatId, updates) => {
    set((state) => {
      const newChats = state.chats.map(c => c.id === chatId ? { ...c, ...updates } : c);
      return { chats: newChats };
    });
  }
}));
