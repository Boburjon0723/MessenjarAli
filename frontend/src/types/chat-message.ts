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
    /**
     * Kanonik vaqt: ISO 8601. Sort va merge faqat shu maydonga (yoki parse qilinadigan bir xil qiymatga) tayanadi.
     * @deprecated createdAt — faqat eski localStorage cache bilan moslik; yangi kod yozmaydi.
     */
    created_at: string;
    createdAt?: string;
    /** UI vaqti; renderda asosan `created_at` dan derive qilinadi (getDisplayTimeForMessage) */
    time: string;
    type: string;
    metadata?: ChatMessageMetadata | string;
    is_read?: boolean;
    senderName?: string;
    senderAvatar?: string;
    /** Legacy / API snake_case — normalize qatlamida senderAvatar ga birlashtiriladi */
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
}


