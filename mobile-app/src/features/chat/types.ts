export interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  /** API: private | group | channel */
  type?: string;
  avatarUrl?: string | null;
}

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
}

