export type AppNotificationData = {
    chatId?: string;
    chat_id?: string;
    jobId?: string;
    url?: string;
    sessionId?: string;
};

export function parseNotificationData(raw: unknown): AppNotificationData {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as AppNotificationData;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as AppNotificationData;
        } catch {
            return {};
        }
    }
    return {};
}

export function getNotificationChatId(data: unknown): string | null {
    const parsed = parseNotificationData(data);
    const id = parsed.chatId ?? parsed.chat_id;
    return id != null && String(id).trim() !== '' ? String(id) : null;
}

const NOTIFICATION_TYPE_LABEL_KEYS: Record<string, string> = {
    new_murojaat: 'notif_type_new_murojaat',
    new_application: 'notif_type_new_application',
    application_accepted: 'notif_type_application_accepted',
    application_rejected: 'notif_type_application_rejected',
    listing_consent: 'notif_type_listing_consent',
    session_request: 'notif_type_session_request',
    payment_received: 'notif_type_payment_received',
    booking_accepted: 'notif_type_booking_accepted',
};

export function notificationTypeLabelKey(type: string): string {
    return NOTIFICATION_TYPE_LABEL_KEYS[type] ?? 'notif_type_default';
}
