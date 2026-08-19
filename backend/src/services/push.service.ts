import { PushTokenModel } from '../models/postgres/PushToken';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
    title: string;
    body: string;
    data?: Record<string, any>;
    channelId?: string;
}

async function sendExpoPush(tokens: string[], payload: PushPayload) {
    if (!tokens.length) return;
    const messages = tokens.map((to) => ({
        to,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        channelId: payload.channelId || 'default',
    }));

    try {
        await fetch(EXPO_PUSH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messages),
        });
    } catch (e) {
        console.error('[Push] Expo push failed:', e);
    }
}

async function getTokenStrings(userId: string): Promise<string[]> {
    const rows = await PushTokenModel.getByUserId(userId);
    return rows.map((r) => r.token);
}

/** Yangi murojaat (ariza) kelganda — ish egasiga */
export async function pushNewApplication(employerId: string, applicantName: string, jobTitle: string, chatId: string) {
    const tokens = await getTokenStrings(employerId);
    await sendExpoPush(tokens, {
        title: 'Yangi murojaat',
        body: `${applicantName} "${jobTitle}" ga murojaat qildi`,
        data: { type: 'new_application', chatId },
        channelId: 'chat',
    });
}

/** Ariza qabul qilinganda — arizachiga */
export async function pushApplicationAccepted(applicantId: string, jobTitle: string, chatId: string) {
    const tokens = await getTokenStrings(applicantId);
    await sendExpoPush(tokens, {
        title: 'Ariza qabul qilindi!',
        body: `"${jobTitle}" arizangiz qabul qilindi`,
        data: { type: 'application_accepted', chatId },
        channelId: 'chat',
    });
}

/** Ariza rad etilganda — arizachiga */
export async function pushApplicationRejected(applicantId: string, jobTitle: string, reason?: string) {
    const tokens = await getTokenStrings(applicantId);
    await sendExpoPush(tokens, {
        title: 'Ariza rad etildi',
        body: reason ? `"${jobTitle}": ${reason}` : `"${jobTitle}" arizangiz rad etildi`,
        data: { type: 'application_rejected' },
        channelId: 'chat',
    });
}

/** To'lov qilinganda — mutaxassisga */
export async function pushPaymentReceived(expertId: string, amount: number, currency: string, chatId: string) {
    const tokens = await getTokenStrings(expertId);
    await sendExpoPush(tokens, {
        title: "To'lov qabul qilindi",
        body: `${amount} ${currency} to'lov oldiniz`,
        data: { type: 'payment_received', chatId },
        channelId: 'wallet',
    });
}

/** Yangi xabar (app yopiq bo'lganda) */
export async function pushNewMessage(userId: string, senderName: string, preview: string, chatId: string) {
    try {
        const tokens = await getTokenStrings(userId);
        await sendExpoPush(tokens, {
            title: senderName,
            body: preview.length > 100 ? preview.slice(0, 97) + '...' : preview,
            data: { type: 'new_message', chatId },
            channelId: 'chat',
        });
    } catch (e) {
        console.error('[Push] pushNewMessage failed:', e);
    }
}
