export function parseChatMetadata(raw: unknown): Record<string, unknown> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, unknown>;
    try {
        return JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export function isListingChatMetadata(meta: Record<string, unknown>): boolean {
    if (meta.source === 'expert_listing' && meta.expert_id) return true;
    if (meta.source === 'job_listing' && meta.job_id) return true;
    return false;
}

export type ListingConsentAction =
    | 'client_accept'
    | 'expert_accept'
    | 'employer_accept'
    | 'employer_reject';

export type ListingConsentResult =
    | { ok: true; next: Record<string, unknown> }
    | { ok: false; status: number; message: string };

/** Listing/murojaat chat metadata yangilash — HTTP controller va testlar uchun */
export function computeListingConsentUpdate(params: {
    meta: Record<string, unknown>;
    action: ListingConsentAction;
    currentUserId: string;
    now: string;
    rejectReason?: string;
}): ListingConsentResult {
    const { meta, action, currentUserId, now, rejectReason = '' } = params;
    const isExpertListing = meta.source === 'expert_listing' && meta.expert_id;
    const isJobApply =
        meta.source === 'job_listing' && meta.intent === 'apply' && meta.poster_id;

    if (!isExpertListing && !isJobApply) {
        return { ok: false, status: 400, message: 'Bu chat murojaat emas' };
    }

    const next = { ...meta };

    if (action === 'client_accept') {
        if (String(meta.expert_id) === String(currentUserId)) {
            return { ok: false, status: 403, message: 'Mutaxassis mijoz o‘rnida rozilik bera olmaydi' };
        }
        if (isJobApply && String(meta.poster_id) === String(currentUserId)) {
            return { ok: false, status: 403, message: 'Ish beruvchi ariza beruvchi o‘rnida emas' };
        }
        next.client_accepted_at = now;
    } else if (action === 'expert_accept') {
        if (String(meta.expert_id) !== String(currentUserId)) {
            return { ok: false, status: 403, message: 'Faqat mutaxassis qabul qiladi' };
        }
        next.expert_accepted_at = now;
    } else if (action === 'employer_accept') {
        if (!isJobApply || String(meta.poster_id) !== String(currentUserId)) {
            return { ok: false, status: 403, message: 'Faqat ish beruvchi arizani qabul qiladi' };
        }
        next.expert_accepted_at = now;
    } else if (action === 'employer_reject') {
        if (!isJobApply || String(meta.poster_id) !== String(currentUserId)) {
            return { ok: false, status: 403, message: 'Faqat ish beruvchi arizani rad etadi' };
        }
        next.application_status = 'rejected';
        next.rejected_at = now;
        if (rejectReason) next.reject_reason = rejectReason;
    }

    if (action !== 'employer_reject' && next.client_accepted_at && next.expert_accepted_at) {
        next.application_status = 'accepted';
    }

    return { ok: true, next };
}

export function isListingMessagingUnlocked(meta: Record<string, unknown>): boolean {
    if (!isListingChatMetadata(meta)) return true;
    if (meta.application_status === 'accepted') return true;
    if (meta.application_status === 'rejected') return false;
    if (meta.client_accepted_at && meta.expert_accepted_at) return true;
    return false;
}

/** Mutaxassis «Qabul xabari» yuborganida murojaat qabul qilinadi */
export async function markExpertListingAcceptedByExpert(params: {
    chatId: string;
    expertId: string;
    io?: import('socket.io').Server;
}): Promise<Record<string, unknown> | null> {
    const { chatId, expertId, io } = params;
    const { pool } = await import('../config/database');
    const { safeDelCache } = await import('../config/redis');

    const row = await pool.query(`SELECT type, metadata FROM chats WHERE id = $1 LIMIT 1`, [chatId]);
    const chat = row.rows[0];
    if (!chat || chat.type !== 'private') return null;

    const meta = parseChatMetadata(chat.metadata);
    if (meta.source !== 'expert_listing' || String(meta.expert_id) !== String(expertId)) {
        return null;
    }

    const now = new Date().toISOString();
    const next: Record<string, unknown> = {
        ...meta,
        expert_accepted_at: now,
        application_status: 'accepted',
    };

    await pool.query(`UPDATE chats SET metadata = $1::jsonb, updated_at = NOW() WHERE id = $2`, [
        JSON.stringify(next),
        chatId,
    ]);

    const participants = await pool.query(
        `SELECT user_id FROM chat_participants WHERE chat_id = $1`,
        [chatId]
    );
    for (const p of participants.rows) {
        await safeDelCache(`user_chats:${p.user_id}`);
    }

    if (io) {
        io.to(chatId).emit('listing_consent_updated', { chatId, metadata: next });
    }

    const clientIds = participants.rows
        .map((p: { user_id: string }) => String(p.user_id))
        .filter((id) => id !== String(expertId));
    if (clientIds.length > 0 && io) {
        const { NotificationService } = await import('./notification.service');
        const { UserModel } = await import('../models/postgres/User');
        const expert = await UserModel.findById(expertId);
        const expertName = expert?.name || 'Mutaxassis';
        for (const clientId of clientIds) {
            await NotificationService.createNotification(
                clientId,
                'application_accepted',
                'Murojaat qabul qilindi',
                `${expertName} murojaatingizni qabul qildi`,
                { chatId },
                io
            );
        }
    }

    return next;
}
