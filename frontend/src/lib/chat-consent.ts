import { getChatMetadata, isExpertListingChat, isJobListingChat } from './listing-chat';

export type ChatConsentMeta = {
    client_accepted_at?: string | null;
    expert_accepted_at?: string | null;
    application_status?: string;
};

export function getChatConsent(chat: unknown): ChatConsentMeta {
    const meta = getChatMetadata(chat);
    const consent =
        meta.consent && typeof meta.consent === 'object'
            ? (meta.consent as Record<string, unknown>)
            : meta;
    return {
        client_accepted_at:
            (consent.client_accepted_at as string | null | undefined) ??
            (meta.client_accepted_at as string | null | undefined) ??
            null,
        expert_accepted_at:
            (consent.expert_accepted_at as string | null | undefined) ??
            (meta.expert_accepted_at as string | null | undefined) ??
            null,
        application_status: meta.application_status as string | undefined,
    };
}

/** Ikki tomon roziligi — listing/murojaat chatlar uchun */
export function isMessagingUnlocked(chat: unknown): boolean {
    if (!chat || typeof chat !== 'object') return true;
    const c = chat as { type?: string };
    if (c.type !== 'private') return true;
    if (!isExpertListingChat(chat) && !isJobListingChat(chat)) return true;

    const consent = getChatConsent(chat);
    if (consent.application_status === 'accepted') return true;
    if (consent.application_status === 'rejected') return false;
    if (consent.client_accepted_at && consent.expert_accepted_at) return true;
    return false;
}

export function isListingChat(chat: unknown): boolean {
    return isExpertListingChat(chat) || isJobListingChat(chat);
}
