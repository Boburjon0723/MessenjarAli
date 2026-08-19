import { randomUUID } from 'crypto';
import { Server } from 'socket.io';
import { pool } from '../config/database';
import { ChatModel } from '../models/postgres/Chat';
import { MessageModel } from '../models/postgres/Message';
import { safeDelCache } from '../config/redis';

export type PhoneCallStatus = 'completed' | 'missed' | 'cancelled';

export interface ActivePhoneCall {
    callId: string;
    chatId: string;
    callerId: string;
    calleeId: string;
    callType: 'audio' | 'video';
    acceptedAt: number | null;
    logged: boolean;
}

const activeCallsById = new Map<string, ActivePhoneCall>();
const activeCallIdByPair = new Map<string, string>();

function pairKey(userA: string, userB: string): string {
    return [String(userA), String(userB)].sort().join(':');
}

function formatDuration(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function phoneCallContent(
    status: PhoneCallStatus,
    callType: 'audio' | 'video',
    durationSeconds?: number
): string {
    const kind = callType === 'video' ? 'Video qo\'ng\'iroq' : 'Qo\'ng\'iroq';
    if (status === 'completed' && durationSeconds != null && durationSeconds > 0) {
        return `${kind} (${formatDuration(durationSeconds)})`;
    }
    if (status === 'missed') return `O'tkazib yuborilgan ${kind.toLowerCase()}`;
    return `Bekor qilingan ${kind.toLowerCase()}`;
}

async function resolveChatId(
    chatId: string | undefined,
    userA: string,
    userB: string
): Promise<string | null> {
    const trimmed = String(chatId || '').trim();
    if (trimmed) {
        const chat = await ChatModel.findById(trimmed);
        if (chat?.type === 'private') return trimmed;
    }
    const chat = await ChatModel.findPrivateChat(userA, userB);
    return chat?.id ?? null;
}

async function assertParticipant(chatId: string, userId: string): Promise<boolean> {
    const r = await pool.query(
        'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2 LIMIT 1',
        [chatId, userId]
    );
    return (r.rowCount ?? 0) > 0;
}

async function otherParticipantIds(chatId: string, exceptUserId: string): Promise<string[]> {
    const r = await pool.query(
        `SELECT user_id::text AS user_id FROM chat_participants
         WHERE chat_id = $1 AND user_id <> $2::uuid`,
        [chatId, exceptUserId]
    );
    return r.rows.map((row) => String(row.user_id));
}

function broadcastPhoneCallMessage(
    io: Server | undefined,
    chatId: string,
    payload: Record<string, unknown>,
    alsoUserIds: string[]
) {
    if (!io) return;
    io.to(chatId).emit('receive_message', payload);
    for (const uid of alsoUserIds) {
        io.to(uid).emit('receive_message', payload);
    }
}

async function invalidateChatCaches(chatId: string) {
    try {
        const participantsRes = await pool.query(
            'SELECT user_id FROM chat_participants WHERE chat_id = $1',
            [chatId]
        );
        for (const row of participantsRes.rows) {
            await safeDelCache(`user_chats:${row.user_id}`);
        }
    } catch (e) {
        console.warn('[CallLog] cache invalidation:', e);
    }
}

export async function registerOutgoingCall(params: {
    callerId: string;
    calleeId: string;
    chatId?: string;
    callType?: string;
}): Promise<{ callId: string; chatId: string | null }> {
    const callerId = String(params.callerId);
    const calleeId = String(params.calleeId);
    const chatId = await resolveChatId(params.chatId, callerId, calleeId);
    const callId = randomUUID();
    const callType: 'audio' | 'video' = params.callType === 'video' ? 'video' : 'audio';

    const prevPairKey = pairKey(callerId, calleeId);
    const prevCallId = activeCallIdByPair.get(prevPairKey);
    if (prevCallId) {
        activeCallsById.delete(prevCallId);
    }

    if (chatId) {
        const active: ActivePhoneCall = {
            callId,
            chatId,
            callerId,
            calleeId,
            callType,
            acceptedAt: null,
            logged: false,
        };
        activeCallsById.set(callId, active);
        activeCallIdByPair.set(prevPairKey, callId);
    }

    return { callId, chatId };
}

export function markCallAccepted(callerId: string, calleeId: string): void {
    const callId = activeCallIdByPair.get(pairKey(callerId, calleeId));
    if (!callId) return;
    const call = activeCallsById.get(callId);
    if (!call || call.logged) return;
    call.acceptedAt = Date.now();
}

function findActiveCall(callerId: string, calleeId: string): ActivePhoneCall | null {
    const callId = activeCallIdByPair.get(pairKey(callerId, calleeId));
    if (!callId) return null;
    return activeCallsById.get(callId) ?? null;
}

export async function finalizePhoneCallLog(params: {
    io?: Server;
    actorId: string;
    peerId: string;
    chatId?: string;
    reason: 'end' | 'reject';
    durationSeconds?: number;
}): Promise<void> {
    const actorId = String(params.actorId);
    const peerId = String(params.peerId);

    const call = findActiveCall(actorId, peerId) ?? findActiveCall(peerId, actorId);
    if (!call) return;

    if (call.logged) return;

    const callerId = call.callerId;
    const calleeId = call.calleeId;
    if (!(await assertParticipant(call.chatId, callerId)) || !(await assertParticipant(call.chatId, calleeId))) {
        return;
    }

    let status: PhoneCallStatus;
    let durationSeconds = 0;

    if (call.acceptedAt != null) {
        status = 'completed';
        durationSeconds =
            params.durationSeconds != null && params.durationSeconds > 0
                ? Math.floor(params.durationSeconds)
                : Math.floor((Date.now() - call.acceptedAt) / 1000);
    } else if (params.reason === 'reject') {
        status = 'missed';
    } else if (actorId === callerId) {
        status = 'cancelled';
    } else {
        status = 'missed';
    }

    call.logged = true;
    activeCallsById.delete(call.callId);
    activeCallIdByPair.delete(pairKey(callerId, calleeId));

    const meta = {
        callerId,
        calleeId,
        callType: call.callType,
        status,
        durationSeconds: status === 'completed' ? durationSeconds : 0,
    };
    const content = phoneCallContent(status, call.callType, durationSeconds);

    const saved = await MessageModel.create(call.chatId, callerId, content, 'phone_call', meta);
    const createdAtIso =
        saved.created_at instanceof Date
            ? saved.created_at.toISOString()
            : new Date(String(saved.created_at)).toISOString();

    const others = await otherParticipantIds(call.chatId, callerId);
    broadcastPhoneCallMessage(
        params.io,
        call.chatId,
        {
            id: saved.id,
            chat_id: call.chatId,
            roomId: call.chatId,
            sender_id: callerId,
            content,
            type: 'phone_call',
            metadata: meta,
            created_at: createdAtIso,
            is_read: saved.is_read,
        },
        others
    );

    await invalidateChatCaches(call.chatId);
}
