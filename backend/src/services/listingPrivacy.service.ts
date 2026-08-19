import { pool } from '../config/database';

function parseMeta(raw: unknown): Record<string, unknown> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, unknown>;
    try {
        return JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
        return {};
    }
}

/** Listing/murojaat chat ishtirokchilari o‘rtasida telefon yashiriladi */
export async function shouldMaskPhoneBetweenUsers(
    viewerId: string,
    targetUserId: string
): Promise<boolean> {
    if (!viewerId || !targetUserId || String(viewerId) === String(targetUserId)) {
        return false;
    }
    const r = await pool.query(
        `
        SELECT c.metadata
        FROM chats c
        INNER JOIN chat_participants cp1 ON cp1.chat_id = c.id AND cp1.user_id = $1::uuid
        INNER JOIN chat_participants cp2 ON cp2.chat_id = c.id AND cp2.user_id = $2::uuid
        WHERE c.type = 'private'
        LIMIT 20
        `,
        [viewerId, targetUserId]
    );
    for (const row of r.rows) {
        const meta = parseMeta(row.metadata);
        if (meta.source === 'expert_listing' && meta.expert_id) return true;
        if (meta.source === 'job_listing' && meta.intent === 'apply') return true;
    }
    return false;
}

export type ChatPaymentStatusPayload = {
    phase: 'none' | 'pending' | 'escrow' | 'ongoing' | 'awaiting_confirm' | 'completed' | 'disputed' | 'cancelled';
    source: 'session' | 'deal' | null;
    rawStatus: string | null;
    amountMali: number | null;
};

function num(v: unknown): number | null {
    const n = typeof v === 'string' ? parseFloat(v) : Number(v);
    return Number.isFinite(n) ? n : null;
}

function mapSessionPhase(status: string): ChatPaymentStatusPayload['phase'] {
    if (status === 'initiated') return 'escrow';
    if (status === 'ongoing') return 'ongoing';
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

function mapDealPhase(status: string): ChatPaymentStatusPayload['phase'] {
    if (status === 'pending_payment') return 'pending';
    if (status === 'escrow_held') return 'escrow';
    if (status === 'pending_client_confirm') return 'awaiting_confirm';
    if (status === 'completed') return 'completed';
    if (status === 'disputed') return 'disputed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

/** Chat bo‘yicha birlashtirilgan to‘lov holati (service_sessions + listing_deals) */
export async function getChatPaymentStatusForUser(
    chatId: string,
    userId: string
): Promise<ChatPaymentStatusPayload | { error: string }> {
    const part = await pool.query(
        `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2::uuid LIMIT 1`,
        [chatId, userId]
    );
    if ((part.rowCount ?? 0) === 0) return { error: 'Not authorized' };

    const sessRes = await pool.query(
        `SELECT status::text AS status, amount_mali
         FROM service_sessions WHERE chat_id = $1 ORDER BY id DESC LIMIT 1`,
        [chatId]
    );
    const dealRes = await pool.query(
        `SELECT status::text AS status, amount
         FROM listing_service_deals WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [chatId]
    );

    const sess = sessRes.rows[0];
    const deal = dealRes.rows[0];

    if (sess) {
        const st = String(sess.status || '');
        const phase = mapSessionPhase(st);
        if (phase !== 'completed' && phase !== 'cancelled') {
            return {
                phase,
                source: 'session',
                rawStatus: st,
                amountMali: num(sess.amount_mali),
            };
        }
    }

    if (deal) {
        const st = String(deal.status || '');
        const phase = mapDealPhase(st);
        if (phase !== 'none') {
            return {
                phase,
                source: 'deal' as const,
                rawStatus: st,
                amountMali: num(deal.amount),
            };
        }
    }

    if (sess) {
        const st = String(sess.status || '');
        return {
            phase: mapSessionPhase(st),
            source: 'session',
            rawStatus: st,
            amountMali: num(sess.amount_mali),
        };
    }

    return { phase: 'none', source: null, rawStatus: null, amountMali: null };
}
