/**
 * Chat list / ChatWindow — API dan keladigan suhbat obyekti (qisman maydonlar).
 */
export interface ChatRoomOtherUser {
    id?: string;
    user_id?: string;
    name?: string;
    surname?: string;
    avatar?: string;
    avatar_url?: string;
    online?: boolean;
    [key: string]: unknown;
}

export interface ChatRoom {
    /** API / ro‘yxat ba’zan raqam sifatida beradi */
    id: string | number;
    name?: string;
    type?: string;
    message?: string;
    userId?: string;
    participantId?: string;
    participants?: unknown;
    otherUser?: ChatRoomOtherUser;
    isTrade?: boolean;
    tradeId?: string;
    creator_id?: string;
    creatorId?: string;
    avatar?: string;
    avatar_url?: string;
    online?: boolean;
    [key: string]: unknown;
}

export interface ContactListItem {
    id?: string;
    userId?: string;
    [key: string]: unknown;
}

export interface ServiceSessionPayload {
    chat_id?: string;
    expert_id?: string;
    client_id?: string;
    status?: string;
    amount_mali?: number | string;
    [key: string]: unknown;
}

export interface CallSignalPayload {
    from?: string;
    fromName?: string;
    fromAvatar?: string;
    signal?: RTCSessionDescriptionInit | RTCIceCandidateInit | Record<string, unknown>;
    callType?: 'audio' | 'video' | string;
    [key: string]: unknown;
}

export interface TypingPayload {
    roomId: string;
    senderId?: string;
    [key: string]: unknown;
}

/** P2P trade API javobi */
export interface TradeDetails {
    id?: string;
    status?: string;
    amount_uzs?: number;
    buyer_id?: string;
    seller_id?: string;
    [key: string]: unknown;
}

