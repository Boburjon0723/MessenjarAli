import { io, Socket } from "socket.io-client";
import { API_URL } from "./config";
import { getToken } from "./auth-storage";
import { showLocalNotification } from "./notifications";

let socket: Socket | null = null;
export let currentChatId: string | null = null;
export const chatMetadataMap = new Map<string, { name: string; type: string }>();

// Foydalanuvchi qaysi chat ichida o'tirganini bilish uchun
export const setCurrentChatId = (id: string | null) => {
  currentChatId = id;
};

export const getSocket = () => socket;

export const connectSocket = async () => {
  if (socket?.connected) return socket;

  const token = await getToken();
  if (!token) return null; // Faqat tizimga kirgan bo'lsa ulanadi

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Global Connected');
  });

  socket.on('disconnect', () => {
    console.log('[Socket] Global Disconnected');
  });

  // Xabarlar (Chat, Guruh, Kanal)
  socket.on('receive_message', (data) => {
    const msg = data.message || data;
    const chatId = msg.chatId || msg.chat_id;
    
    if (!chatId) return;

    // Agar user aynan orqa fonda bo'lsa yoki shu chatning ichida bo'lmasa Notification chiqaramiz!
    if (currentChatId !== chatId.toString()) {
      const senderName = msg.sender?.name || msg.sender?.username || 'Yangi xabar';
      // Agar guruh yoki kanal bo'lsa chat nomini ham ko'rsatamiz
      const meta = chatMetadataMap.get(chatId.toString());
      let title = senderName;
      
      if (meta && (meta.type === 'group' || meta.type === 'channel')) {
         title = `${meta.name} - ${senderName.split(' ')[0]}`; // Telegram style: Frontend Guruh - Sardor
      } else if (meta && meta.name) {
         title = meta.name; // Shaxsiy sms bo'lsa uning ismi
      }

      const text = msg.text || '📎 Tasvir/Fayl keldi';
      showLocalNotification(title, text, 'chat', { chatId, type: meta?.type });
    }
  });

  // Hamyon bildirishnomalari (Tushumlar)
  socket.on('balance_updated', (data) => {
    showLocalNotification('Hamyon 💰', "Sizning hisobingizda o'zgarishlar mavjud", 'wallet', data);
  });

  // Oddiy tizim bildirishnomalari
  socket.on('new_notification', (data) => {
    const title = data.title || 'Bildirishnoma 🔔';
    const body = data.body || data.message || 'Sizga yangi xabar keldi';
    showLocalNotification(title, body, 'default', data);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
