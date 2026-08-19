import { isExpertListingChat, isJobListingChat } from './listing-chat';
import { isMessagingUnlocked } from './chat-consent';

/** Shaxsiy chatdagi ovoz/video qo'ng'iroq tugmalari va socket call signallari */
export const CHAT_CALLS_ALLOWED =
    process.env.NEXT_PUBLIC_CHAT_CALLS_ALLOWED !== 'false';

export type ChatCallGateOptions = {
    /** Mijoz mutaxassisni kontaktga saqlagan */
    isContact?: boolean;
};

/** Faqat shaxsiy (1:1) chatda qo'ng'iroq — listing chatlar yopiq */
export function canShowChatCalls(
    chat: { type?: string; isTrade?: boolean } | null | undefined,
    _opts?: ChatCallGateOptions
): boolean {
    if (!CHAT_CALLS_ALLOWED || !chat) return false;
    if (chat.isTrade) return false;
    if (chat.type !== 'private' && chat.type !== undefined) return false;

    if (isExpertListingChat(chat) || isJobListingChat(chat)) return false;

    if (!isMessagingUnlocked(chat)) return false;

    return true;
}

/** Video qo'ng'iroq tugmasi — shaxsiy chat + rozilik */
export function canShowVideoCall(
    chat: Parameters<typeof canShowChatCalls>[0],
    opts?: ChatCallGateOptions
): boolean {
    return canShowChatCalls(chat, opts);
}
