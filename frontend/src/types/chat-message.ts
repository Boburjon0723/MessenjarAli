/**
 * ChatWindow ↔ MessageBubble uchun yagona xabar modeli.
 * isOwn / timestamp alohida saqlanmaydi — UI sender va time dan derive qilinadi.
 */
export type ChatSender = 'me' | 'them';

export interface ChatParentPreview {
    id?: string;
    text?: string;
    type?: string;
    sender?: ChatSender;
    senderName?: string;
    content?: string;
}

/** Media / fayl / lesson — backend turli kalitlar yuborishi mumkin */
export interface ChatMessageMetadata {
    mimetype?: string;
    caption?: string;
    name?: string;
    file_name?: string;
    size?: number;
    sessionId?: string;
    chatId?: string;
    sessionStyle?: string;
    [key: string]: unknown;
}

export interface ChatMessage {
    id: string;
    text: string;
    sender: ChatSender;
    sender_id?: string;
    /** ISO yoki parse qilinadigan qiymat */
    created_at: string;
    createdAt: string;
    /** UI vaqti (odatda soat:daqiqa:soniya — legacy HH:mm ham bo‘lishi mumkin) */
    time: string;
    type: string;
    metadata?: ChatMessageMetadata | string;
    is_read?: boolean;
    senderName?: string;
    senderAvatar?: string;
    sender_avatar?: string;
    avatar?: string;
    parentId?: string | null;
    parent_id?: string | null;
    parentMessage?: ChatParentPreview | null;
    isPending?: boolean;
    isUploading?: boolean;
    error?: string;
    clientSideId?: string;
    reactions?: Record<string, { emoji: string; users: string[] }>;
    /**
     * API dan kelgan tarix tartibi (0..n). Bir xil created_at da UUID lexik tartib o‘rniga ishlatiladi —
     * refreshdan keyin ham xabarlar joylashuvi barqaror bo‘ladi.
     */
    sortOrder?: number;
}
