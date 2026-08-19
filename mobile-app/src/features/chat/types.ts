export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  /** API: private | group | channel */
  type?: string;
  avatarUrl?: string | null;
  otherUserId?: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  /** API: text | image | file | voice | ... */
  messageType?: string;
  /** To‘liq URL — fayl/rasmni yuklab ochish uchun */
  remoteFileUrl?: string | null;
  metadata?: any;
  e2e?: boolean;
}

