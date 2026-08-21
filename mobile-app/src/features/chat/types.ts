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
  /** Telegram Saved Messages */
  is_saved_messages?: boolean;
  muted?: boolean;
  pinned?: boolean;
  archived?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  /** ISO yoki millis — qidiruv sana filtri uchun */
  createdAt?: string | number | null;
  status: "sent" | "delivered" | "read";
  /** API: text | image | file | voice | ... */
  messageType?: string;
  /** To‘liq URL — fayl/rasmni yuklab ochish uchun */
  remoteFileUrl?: string | null;
  metadata?: any;
  e2e?: boolean;
  /** Reply: ota xabar ID */
  parentId?: string | null;
  parentPreview?: {
    text?: string;
    senderName?: string;
    type?: string;
  } | null;
}

