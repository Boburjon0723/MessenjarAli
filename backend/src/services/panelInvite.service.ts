import { randomUUID } from 'crypto';
import type { Server } from 'socket.io';
import { pool } from '../config/database';

const INVITE_TYPES = ['consult_panel_invite', 'lesson_start'];

export function newInviteToken(): string {
    return randomUUID();
}

function parseMeta(raw: unknown): Record<string, unknown> {
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, unknown>;
    try {
        return JSON.parse(String(raw)) as Record<string, unknown>;
    } catch {
        return {};
    }
}

async function emitInviteMetadataUpdates(
    io: Server | undefined,
    chatId: string,
    rows: { id: string; metadata: unknown }[]
) {
    if (!io || rows.length === 0) return;
    const updates = rows.map((r) => ({
        id: String(r.id),
        metadata: parseMeta(r.metadata),
    }));
    io.to(chatId).emit('message_metadata_updated', { chatId, updates });
}

/**
 * Talaba guruhga obuna bilan qo‘shilgach — shaxsiy chatdagi group_join_invite
 * xabarlarini «paid» qiladi (mentor + talaba UI).
 */
export async function markGroupJoinInvitesPaid(
    groupId: string,
    studentId: string,
    io?: Server
): Promise<number> {
    const gid = String(groupId || '').trim();
    const sid = String(studentId || '').trim();
    if (!gid || !sid) return 0;

    const res = await pool.query(
        `
        UPDATE messages m
        SET metadata = COALESCE(m.metadata, '{}'::jsonb) || jsonb_build_object(
            'invite_status', 'paid',
            'paid_by', $1::text,
            'paid_at', to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
        )
        WHERE m.type = 'group_join_invite'
          AND m.metadata->>'groupId' = $2
          AND COALESCE(m.metadata->>'invite_status', 'pending') IN ('active', 'pending')
          AND EXISTS (
            SELECT 1 FROM chat_participants cp
            WHERE cp.chat_id = m.chat_id AND cp.user_id = $1::uuid
          )
        RETURNING m.id, m.chat_id, m.metadata
        `,
        [sid, gid]
    );

    if (!io || (res.rowCount ?? 0) === 0) return res.rowCount ?? 0;

    const byChat = new Map<string, { id: string; metadata: unknown }[]>();
    for (const row of res.rows) {
        const cid = String(row.chat_id);
        const list = byChat.get(cid) || [];
        list.push({ id: row.id, metadata: row.metadata });
        byChat.set(cid, list);
    }
    for (const [cid, rows] of byChat) {
        await emitInviteMetadataUpdates(io, cid, rows);
        // Shaxsiy chat ishtirokchilari roomda bo‘lmasa ham yetkazish
        const parts = await pool.query(
            `SELECT user_id::text AS uid FROM chat_participants WHERE chat_id = $1`,
            [cid]
        );
        for (const p of parts.rows) {
            io.to(String(p.uid)).emit('message_metadata_updated', {
                chatId: cid,
                updates: rows.map((r) => ({ id: String(r.id), metadata: parseMeta(r.metadata) })),
            });
        }
    }
    return res.rowCount ?? 0;
}

/** Yangi taklif yuborishdan oldin eski ochiq takliflarni yopish */
export async function expirePreviousPanelInvites(
    chatId: string,
    exceptMessageId?: string,
    io?: Server
): Promise<number> {
    const res = await pool.query(
        `
        UPDATE messages
        SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"invite_status":"expired"}'::jsonb
        WHERE chat_id = $1
          AND type = ANY($2::text[])
          AND COALESCE(metadata->>'invite_status', 'active') = 'active'
          AND ($3::uuid IS NULL OR id <> $3::uuid)
        RETURNING id, metadata
        `,
        [chatId, INVITE_TYPES, exceptMessageId ?? null]
    );
    await emitInviteMetadataUpdates(io, chatId, res.rows);
    return res.rowCount ?? 0;
}

/** Sessiya yakunlanganda chatdagi barcha takliflarni yopish */
export async function expireAllPanelInvitesForChat(chatId: string, io?: Server): Promise<number> {
    const res = await pool.query(
        `
        UPDATE messages
        SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"invite_status":"expired"}'::jsonb
        WHERE chat_id = $1
          AND type = ANY($2::text[])
          AND COALESCE(metadata->>'invite_status', 'active') = 'active'
        RETURNING id, metadata
        `,
        [chatId, INVITE_TYPES]
    );
    await emitInviteMetadataUpdates(io, chatId, res.rows);
    return res.rowCount ?? 0;
}

export type PanelAccessResult = {
    allowed: boolean;
    reason?: 'closed' | 'expired' | 'not_participant' | 'not_found';
    sessionStatus?: string | null;
};

/** Shaxsiy konsult/dars xonasiga kirish — faol sessiya yoki ochiq taklif bo‘lsa */
export async function getConsultPanelAccess(
    chatId: string,
    userId: string
): Promise<PanelAccessResult> {
    const chatRes = await pool.query(`SELECT id, type FROM chats WHERE id = $1 LIMIT 1`, [chatId]);
    if (chatRes.rows.length === 0) return { allowed: false, reason: 'not_found' };

    const part = await pool.query(
        `SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2::uuid LIMIT 1`,
        [chatId, userId]
    );
    if ((part.rowCount ?? 0) === 0) return { allowed: false, reason: 'not_participant' };

    const sessRes = await pool.query(
        `SELECT status::text AS status FROM service_sessions
         WHERE chat_id = $1 ORDER BY id DESC LIMIT 1`,
        [chatId]
    );
    const sessionStatus = sessRes.rows[0]?.status ? String(sessRes.rows[0].status) : null;

    if (sessionStatus === 'completed' || sessionStatus === 'cancelled') {
        return { allowed: false, reason: 'closed', sessionStatus };
    }
    if (sessionStatus === 'ongoing' || sessionStatus === 'initiated') {
        return { allowed: true, sessionStatus };
    }

    const latestRes = await pool.query(
        `
        SELECT type, metadata
        FROM messages
        WHERE chat_id = $1
          AND type = ANY($2::text[])
        ORDER BY created_at DESC, id DESC
        LIMIT 1
        `,
        [chatId, [...INVITE_TYPES, 'lesson_end']]
    );
    const latest = latestRes.rows[0];
    if (!latest) {
        return { allowed: false, reason: 'expired', sessionStatus };
    }
    if (String(latest.type) === 'lesson_end') {
        return { allowed: false, reason: 'closed', sessionStatus };
    }
    const meta = parseMeta(latest.metadata);
    if (meta.invite_status === 'expired' || meta.status === 'expired') {
        return { allowed: false, reason: 'expired', sessionStatus };
    }

    return { allowed: true, sessionStatus };
}
