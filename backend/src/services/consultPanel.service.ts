import { Server } from 'socket.io';
import { pool } from '../config/database';
import { MessageModel } from '../models/postgres/Message';
import { UserModel } from '../models/postgres/User';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConsultInviteStyle = 'mentor' | 'consult' | 'legal' | 'psychology';

function consultPanelInviteChatContent(
    expertName: string,
    sessionStyle: ConsultInviteStyle
): string {
    if (sessionStyle === 'mentor') {
        return `👋 **${expertName}** ustoz panelida. Agar darsni boshlagan bo'lsa, quyidagi tugma orqali qo'shilishingiz mumkin.`;
    }
    if (sessionStyle === 'legal') {
        return `⚖️ **${expertName}** huquqiy maslahat uchun tayyor. Maslahat xonasiga kirish uchun quyidagi tugmani bosing.`;
    }
    if (sessionStyle === 'psychology') {
        return `🌿 **${expertName}** psixologik maslahat o‘tkazishga tayyor. Xavfsiz uchrashuv uchun quyidagi tugmani bosing.`;
    }
    return `📞 **${expertName}** onlayn konsultatsiya uchun tayyor. Uchrashuvni boshlash uchun quyidagi tugmani bosing.`;
}

function lessonNotifyChatContent(
    mentorName: string,
    phase: 'start' | 'end',
    sessionStyle?: 'mentor' | 'consult'
) {
    const isClassroom = sessionStyle !== 'consult';
    if (phase === 'start') {
        return isClassroom
            ? `🎓 **${mentorName}** darsni boshladi. Quyidagi tugma orqali dars xonasiga ulaning.`
            : `📞 **${mentorName}** uchrashuvni boshladi. Quyidagi tugma orqali ulaning.`;
    }
    return isClassroom
        ? `✅ **${mentorName}** darsni yakunladi.`
        : `✅ **${mentorName}** uchrashuvni yakunladi.`;
}

async function assertChatParticipant(chatId: string, userId: string): Promise<boolean> {
    const part = await pool.query(
        'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2 LIMIT 1',
        [chatId, userId]
    );
    return (part.rowCount ?? 0) > 0;
}

async function otherParticipantIds(chatId: string, exceptUserId: string): Promise<string[]> {
    const r = await pool.query(
        `SELECT user_id::text AS user_id FROM chat_participants
         WHERE chat_id = $1 AND user_id <> $2::uuid`,
        [chatId, exceptUserId]
    );
    return r.rows.map((row) => String(row.user_id));
}

function broadcastChatMessage(
    io: Server | undefined,
    chatId: string,
    payload: Record<string, unknown>,
    alsoUserIds: string[]
) {
    if (!io) return;
    io.to(chatId).emit('receive_message', payload);
    for (const uid of alsoUserIds) {
        io.to(uid).emit('receive_message', payload);
        io.to(uid).emit('new_notification', {
            type: payload.type,
            chatId,
            message: payload,
        });
    }
}

export async function sendConsultPanelInvite(params: {
    expertId: string;
    chatId: string;
    expertName: string;
    sessionStyle?: ConsultInviteStyle;
    isPaymentRequest?: boolean;
    io?: Server;
}): Promise<{ messageId: string; chatId: string }> {
    const chatId = String(params.chatId || '').trim();
    const expertId = String(params.expertId || '').trim();
    const expertName = String(params.expertName || '').trim();
    if (!chatId || !expertId || !expertName) {
        const err: any = new Error('chatId, expertName kerak');
        err.statusCode = 400;
        throw err;
    }
    if (!UUID_RE.test(chatId)) {
        const err: any = new Error('chatId UUID bo‘lishi kerak');
        err.statusCode = 400;
        throw err;
    }
    if (!(await assertChatParticipant(chatId, expertId))) {
        const err: any = new Error('Bu chat ishtirokchisi emassiz');
        err.statusCode = 403;
        throw err;
    }

    const style: ConsultInviteStyle =
        params.sessionStyle === 'mentor'
            ? 'mentor'
            : params.sessionStyle === 'legal'
              ? 'legal'
              : params.sessionStyle === 'psychology'
                ? 'psychology'
                : 'consult';

    const { expirePreviousPanelInvites, newInviteToken } = await import('./panelInvite.service');
    await expirePreviousPanelInvites(chatId, undefined, params.io);

    let content = consultPanelInviteChatContent(expertName, style);
    let kind: string = 'panel_open';
    if (params.isPaymentRequest) {
        content = `💳 **${expertName}** bilan sessiyani boshlash uchun xizmat haqqini to'lashingiz lozim. To'lovdan so'ng sessiyaga ulanish tugmasi faollashadi.`;
        kind = 'payment_request';
    }

    let serviceAmountMali: number | null = null;
    if (style !== 'mentor') {
        const sr = await pool.query(
            `SELECT amount_mali, status::text AS status FROM service_sessions
             WHERE chat_id = $1 AND expert_id = $2::uuid
             ORDER BY id DESC LIMIT 1`,
            [chatId, expertId]
        );
        if (sr.rows.length > 0) {
            const amt = parseFloat(String(sr.rows[0].amount_mali ?? '0'));
            const st = String(sr.rows[0].status || '');
            if (Number.isFinite(amt) && amt > 0) {
                const amtStr = amt.toLocaleString('uz-UZ', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                });
                if (st === 'initiated') {
                    content += `\n\n💰 **${amtStr} MALI** xizmat uchun hisobingizdan kafillik (escrow) qilib olingan. Ulanish orqali xizmatdan foydalanishni davom ettirasiz.`;
                    serviceAmountMali = amt;
                } else if (st === 'ongoing') {
                    content += `\n\n💰 Faol xizmat: **${amtStr} MALI** (kafillikda).`;
                    serviceAmountMali = amt;
                }
            }
        }
    }

    const meta = {
        sessionId: chatId,
        sessionStyle: style,
        kind,
        invite_token: newInviteToken(),
        invite_status: 'active',
        ...(serviceAmountMali != null ? { serviceAmountMali } : {}),
    };
    const mentor = await UserModel.findById(expertId);
    const mentorAvatar = mentor?.avatar_url || null;

    const newMessage = await MessageModel.create(
        chatId,
        expertId,
        content,
        'consult_panel_invite',
        meta
    );

    const others = await otherParticipantIds(chatId, expertId);
    broadcastChatMessage(
        params.io,
        chatId,
        {
            id: newMessage.id,
            chat_id: chatId,
            roomId: chatId,
            sender_id: expertId,
            sender_name: expertName,
            sender_avatar: mentorAvatar,
            content,
            type: 'consult_panel_invite',
            metadata: meta,
            created_at: new Date().toISOString(),
        },
        others
    );

    if (!params.isPaymentRequest) {
        const { markExpertListingAcceptedByExpert } = await import('./chatConsent.service');
        await markExpertListingAcceptedByExpert({
            chatId,
            expertId,
            io: params.io,
        });
    }

    return { messageId: String(newMessage.id), chatId };
}

export async function sendLessonStartNotify(params: {
    expertId: string;
    sessionId: string;
    mentorName: string;
    sessionStyle?: 'mentor' | 'consult';
    io?: Server;
}): Promise<{ messageId: string; chatId: string } | null> {
    const sessionId = String(params.sessionId || '').trim();
    const expertId = String(params.expertId || '').trim();
    const mentorName = String(params.mentorName || '').trim() || 'Mutaxassis';
    if (!sessionId || !expertId) {
        const err: any = new Error('sessionId kerak');
        err.statusCode = 400;
        throw err;
    }

    let chatId: string | null = null;
    if (UUID_RE.test(sessionId)) {
        if (await assertChatParticipant(sessionId, expertId)) {
            chatId = sessionId;
        }
    }
    if (!chatId) {
        const checkByName = await pool.query(
            `
            SELECT c.id FROM chats c
            JOIN chat_participants cp ON c.id = cp.chat_id
            WHERE c.type = 'group' AND cp.user_id = $1 AND c.name = $2
            LIMIT 1
        `,
            [expertId, sessionId]
        );
        if ((checkByName.rowCount ?? 0) > 0) {
            chatId = String(checkByName.rows[0].id);
        }
    }
    if (!chatId) return null;

    const startContent = lessonNotifyChatContent(
        mentorName,
        'start',
        params.sessionStyle ?? 'mentor'
    );
    const { expirePreviousPanelInvites, newInviteToken } = await import('./panelInvite.service');
    await expirePreviousPanelInvites(chatId, undefined, params.io);

    const startMeta = {
        sessionId: chatId,
        chatId,
        sessionStyle: params.sessionStyle ?? 'mentor',
        invite_token: newInviteToken(),
        invite_status: 'active',
    };
    const mentor = await UserModel.findById(expertId);
    const mentorAvatar = mentor?.avatar_url || null;
    const newMessage = await MessageModel.create(
        chatId,
        expertId,
        startContent,
        'lesson_start',
        startMeta
    );
    const others = await otherParticipantIds(chatId, expertId);
    broadcastChatMessage(
        params.io,
        chatId,
        {
            id: newMessage.id,
            chat_id: chatId,
            roomId: chatId,
            sender_id: expertId,
            sender_name: mentorName,
            sender_avatar: mentorAvatar,
            content: startContent,
            type: 'lesson_start',
            metadata: startMeta,
            created_at: new Date().toISOString(),
        },
        others
    );
    return { messageId: String(newMessage.id), chatId };
}
