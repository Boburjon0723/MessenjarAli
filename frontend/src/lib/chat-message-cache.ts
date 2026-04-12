import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';
import { getMessageChatId } from '@/lib/message-alert';
import { chatDebug } from '@/lib/chat-debug';
import type { ChatMessage, ChatSender } from '@/types/chat-message';

export const CHAT_MESSAGE_CACHE_LIMIT = 100;

/** Eski importlar uchun alias */
export type CachedChatMessage = ChatMessage;

/** Backend ba'zan Unix soniyada yuboradi; JS Date ms kutadi — noto'g'ri parse sortni buzadi. */
export function parseCreatedToMs(raw: unknown): number | null {
    if (raw == null || raw === '') return null;
    if (typeof raw === 'number') {
        if (!Number.isFinite(raw)) return null;
        if (raw < 1e12) return raw * 1000;
        return raw;
    }
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (/^\d+(\.\d+)?$/.test(trimmed)) {
            const n = parseFloat(trimmed);
            if (!Number.isFinite(n)) return null;
            if (n < 1e12) return Math.round(n * 1000);
            return Math.round(n);
        }
        const d = new Date(trimmed);
        const t = d.getTime();
        return Number.isNaN(t) ? null : t;
    }
    if (raw instanceof Date) {
        const t = raw.getTime();
        return Number.isNaN(t) ? null : t;
    }
    return null;
}

export function normalizeCreatedAtIso(raw: unknown): string {
    const ms = parseCreatedToMs(raw);
    if (ms != null) return new Date(ms).toISOString();
    return '';
}

/** UI: soat:daqiqa:soniya — bir daqiqada bir nechta xabar ajralib turishi uchun */
export function formatChatTimeLabel(ms: number, locale = 'uz-UZ'): string {
    return new Date(ms).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

/** MessageBubble: vaqt — created_at asosida; eski HH:mm cache uchun soniyalar qo‘shiladi */
export function getDisplayTimeForMessage(
    m: Pick<ChatMessage, 'time' | 'created_at' | 'createdAt'>,
    locale = 'uz-UZ'
): string {
    const ms = parseCreatedToMs(m.created_at ?? m.createdAt);
    const rawTime = m.time?.trim() ?? '';
    /** Faqat soat:daqiqa (legacy) — bir xil daqiqada chalkashmasin, soniyani ISO dan olamiz */
    const legacyShort =
        rawTime &&
        rawTime !== '--:--' &&
        rawTime !== 'Invalid Date' &&
        /^\d{1,2}:\d{2}$/.test(rawTime);
    if (legacyShort && ms != null) return formatChatTimeLabel(ms, locale);
    if (rawTime && rawTime !== '--:--' && rawTime !== 'Invalid Date' && !legacyShort) return m.time;
    if (ms == null) return '--:--';
    return formatChatTimeLabel(ms, locale);
}

function deriveSenderFromRaw(raw: Record<string, unknown>): ChatSender {
    const user = getUser();
    const myId = user?.id != null ? String(user.id) : '';
    if (raw.sender === 'me' || raw.sender === 'them') return raw.sender;
    const sid = raw.sender_id ?? raw.senderId;
    const sidStr = sid != null && sid !== '' ? String(sid) : '';
    if (myId && sidStr && sidStr === myId) return 'me';
    return 'them';
}

/**
 * Barcha manbalardan (API, socket, cache, optimistic) kelgan obyektni yagona ChatMessage ga keltiradi.
 */
export function normalizeChatMessage(input: Record<string, unknown>): ChatMessage {
    const sender = deriveSenderFromRaw(input);
    const createdRaw = input.created_at ?? input.createdAt ?? input.timestamp ?? input.sent_at ?? input.sentAt;
    let createdIso = normalizeCreatedAtIso(createdRaw);
    if (!createdIso) {
        const ms = parseCreatedToMs(createdRaw);
        if (ms != null) createdIso = new Date(ms).toISOString();
        else createdIso = new Date().toISOString();
    }

    const time =
        typeof input.time === 'string' && input.time && input.time !== 'Invalid Date' && input.time !== '--:--'
            ? input.time
            : formatMessageClock(createdIso);

    const idRaw = input.id ?? input._id ?? input.messageId ?? input.clientSideId;
    const id =
        idRaw != null && String(idRaw) !== ''
            ? String(idRaw)
            : `fallback_${createdIso}_${Math.random().toString(36).slice(2, 11)}`;

    const senderIdRaw = input.sender_id ?? input.senderId;
    const sid = senderIdRaw != null && senderIdRaw !== '' ? String(senderIdRaw) : undefined;

    const pid = input.parent_id ?? input.parentId;

    return {
        id,
        text: readMessageText(input),
        sender,
        sender_id: sid,
        created_at: createdIso,
        time,
        type: readMessageType(input),
        metadata: input.metadata as ChatMessage['metadata'],
        is_read: Boolean(input.is_read),
        senderName: (input.senderName as string | undefined) ?? (input.sender_name as string | undefined),
        senderAvatar: (input.senderAvatar as string | undefined) ?? (input.sender_avatar as string | undefined),
        avatar: input.avatar as string | undefined,
        parentId: pid != null ? String(pid) : null,
        parent_id: pid != null ? String(pid) : null,
        parentMessage: (input.parentMessage as ChatMessage['parentMessage']) ?? null,
        isPending: Boolean(input.isPending),
        isUploading: Boolean(input.isUploading),
        error: input.error as string | undefined,
        clientSideId: input.clientSideId as string | undefined,
        reactions: input.reactions as ChatMessage['reactions'],
    };
}

export function maxCreatedAtMs(messages: Array<{ created_at?: unknown; createdAt?: unknown }>): number {
    let max = 0;
    for (const m of messages) {
        const ms = parseCreatedToMs(m?.created_at ?? m?.createdAt);
        if (ms != null && ms > max) max = ms;
    }
    return max;
}

export function readChatMessageCache(chatId: string | number | undefined): ChatMessage[] {
    if (chatId == null || typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(`chat_cache_${chatId}`);
        if (!raw) return [];
        const cached = JSON.parse(raw) as unknown;
        if (!Array.isArray(cached) || !cached.length) return [];
        return cached
            .filter((x): x is Record<string, unknown> => x !== null && typeof x === 'object')
            .map((x) => normalizeChatMessage(x));
    } catch {
        return [];
    }
}

export function writeChatMessageCache(chatId: string | number, messages: ChatMessage[]): void {
    if (typeof window === 'undefined' || chatId == null) return;
    try {
        const slice = messages.slice(-CHAT_MESSAGE_CACHE_LIMIT);
        localStorage.setItem(`chat_cache_${chatId}`, JSON.stringify(slice));
    } catch {
        /* ignore */
    }
}

function formatMessageClock(iso: unknown): string {
    const ms = parseCreatedToMs(iso);
    if (ms == null) return '--:--';
    return formatChatTimeLabel(ms, 'uz-UZ');
}

function readMessageText(m: Record<string, unknown>): string {
    const raw = m.content ?? m.text ?? m.message ?? '';
    return typeof raw === 'string' ? raw : String(raw ?? '');
}

function readMessageType(m: Record<string, unknown>): string {
    const raw = m.type;
    return typeof raw === 'string' && raw ? raw : 'text';
}

function readMessageSenderId(m: Record<string, unknown>): string {
    const senderRaw = m.sender_id ?? m.senderId ?? (m.sender as { id?: unknown } | undefined)?.id ?? m.sender;
    return senderRaw == null ? '' : String(senderRaw);
}

function readMessageCreatedRaw(m: Record<string, unknown>): unknown {
    return m.created_at ?? m.createdAt ?? m.timestamp ?? m.sent_at ?? m.sentAt ?? m.date;
}

function normalizeCompareText(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isOptimisticMessageId(id: string): boolean {
    return /^temp_\d+/.test(id) || /^voice_\d+/.test(id);
}

function areLikelySameMessage(localMsg: CachedChatMessage, remoteMsg: CachedChatMessage): boolean {
    const local = localMsg as unknown as Record<string, unknown>;
    const remote = remoteMsg as unknown as Record<string, unknown>;
    const localSender = readMessageSenderId(local);
    const remoteSender = readMessageSenderId(remote);
    if (localSender && remoteSender && localSender !== remoteSender) return false;

    if (readMessageType(local) !== readMessageType(remote)) return false;

    const localText = normalizeCompareText(readMessageText(local));
    const remoteText = normalizeCompareText(readMessageText(remote));
    if (localText !== remoteText) return false;

    const localMs = parseCreatedToMs(readMessageCreatedRaw(local));
    const remoteMs = parseCreatedToMs(readMessageCreatedRaw(remote));
    if (localMs == null || remoteMs == null) return true;
    return Math.abs(localMs - remoteMs) <= 2 * 60 * 1000;
}

/** Ro‘yxatdagi xabarlar uchun umumiy sort (API, cache, state — barchasi mos) */
type SortableChatRow = {
    id?: unknown;
    created_at?: unknown;
    createdAt?: unknown;
};

/**
 * Tartib: faqat `created_at` (yoki legacy `createdAt`) parse qilingan millisoniyalar.
 * Bir xil vaqt — barqarorlik uchun `id` qatorida (UUID) lexik taqqoslash.
 */
export function sortChatMessagesLocal<T extends SortableChatRow>(arr: T[]): T[] {
    return [...arr].sort((a, b) => {
        const ma = parseCreatedToMs(a.created_at ?? a.createdAt);
        const mb = parseCreatedToMs(b.created_at ?? b.createdAt);
        const ta = ma ?? Number.MAX_SAFE_INTEGER;
        const tb = mb ?? Number.MAX_SAFE_INTEGER;
        if (ta !== tb) return ta - tb;
        return String((a as { id?: unknown }).id ?? '').localeCompare(String((b as { id?: unknown }).id ?? ''));
    });
}

export function mapApiMessagesToLocal(history: unknown[]): ChatMessage[] {
    const user = (getUser() || {}) as { id?: string };
    const mapped = history.map((raw, index) => {
        const m = raw as Record<string, unknown>;
        const senderIdRaw = m.sender_id ?? m.senderId ?? (m.sender as { id?: unknown } | undefined)?.id;
        const createdRaw = readMessageCreatedRaw(m);
        const created = normalizeCreatedAtIso(createdRaw);
        const fallbackId = `fallback_${String(senderIdRaw ?? '')}_${String(parseCreatedToMs(createdRaw) ?? 'na')}_${index}`;
        const resolvedId = m.id ?? m._id ?? m.messageId ?? m.clientSideId ?? fallbackId;
        const text = readMessageText(m);
        const isOwnMessage =
            senderIdRaw != null &&
            senderIdRaw !== '' &&
            user.id != null &&
            String(senderIdRaw) === String(user.id);
        const rawParent = m.parentMessage;
        let parentMessage: unknown = rawParent;
        if (rawParent && typeof rawParent === 'object' && rawParent !== null) {
            const p = rawParent as Record<string, unknown>;
            const pid = p.id ?? m.parent_id ?? m.parentId;
            const pSenderId = p.sender_id ?? p.senderId;
            const side =
                user.id != null && pSenderId != null && String(pSenderId) === String(user.id) ? 'me' : 'them';
            parentMessage = {
                ...p,
                id: pid,
                text: p.text ?? p.content ?? '',
                type: typeof p.type === 'string' ? p.type : 'text',
                sender: typeof p.sender === 'string' ? p.sender : side,
                senderName: p.senderName ?? p.sender_name,
            };
        }
        return normalizeChatMessage({
            id: resolvedId,
            text,
            sender: isOwnMessage ? 'me' : 'them',
            created_at: created || createdRaw,
            sender_id: senderIdRaw,
            sender_name: (m.sender_name as string | undefined) ?? (m.senderName as string | undefined),
            senderName: (m.sender_name as string | undefined) ?? (m.senderName as string | undefined),
            sender_avatar: (m.sender_avatar as string | undefined) ?? (m.senderAvatar as string | undefined),
            time: formatMessageClock(created || createdRaw),
            type: readMessageType(m),
            metadata: m.metadata,
            is_read: m.is_read,
            parent_id: m.parent_id ?? m.parentId,
            parentId: m.parent_id ?? m.parentId,
            parentMessage,
        });
    });
    return sortChatMessagesLocal(mapped);
}

/**
 * API javobi kechiksa yoki DB da hali ko‘rinmasa, clientdagi xabarlar (temp / yangi uuid) yo‘qolmasin.
 */
export function mergeFetchedChatMessages(prev: ChatMessage[], fetched: ChatMessage[]): ChatMessage[] {
    const fetchedIds = new Set(fetched.map((m) => String(m.id ?? '')));
    const extra = prev.filter((m) => {
        const id = String(m.id ?? '');
        if (!id) return false;
        if (fetchedIds.has(id)) return false;
        if (!isOptimisticMessageId(id)) return true;
        return !fetched.some((fetchedMsg) => areLikelySameMessage(m, fetchedMsg));
    });
    const merged = [...fetched, ...extra];
    return sortChatMessagesLocal(merged);
}

/** Socket payload qaysi chat uchun ekanini bir xil kalitlar bilan tekshirish */
export function socketMessageTargetsChat(incoming: Record<string, unknown>, chatId: string): boolean {
    return String(getMessageChatId(incoming)) === String(chatId);
}

function normalizeMatchText(value: unknown): string {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase();
}

/**
 * `receive_message`: server `created_at` saqlanadi; sun’iy vaqt siljitish yo‘q (history bilan mos).
 * Vaqt bo‘lmasa — `new Date().toISOString()`.
 * `id` uchun `clientSideId` ishlatilmaydi — aks holda temp id bilan `exists` chalkashadi va almashtirish o‘tmay qoladi.
 */
export function mergeIncomingSocketMessage(
    prev: ChatMessage[],
    incoming: Record<string, unknown>,
    myUserId: string | undefined
): ChatMessage[] {
    const senderId = incoming.sender_id ?? incoming.senderId;
    chatDebug("mergeIncomingSocketMessage start", {
        prevCount: prev.length,
        incomingId: incoming.id,
        incomingClientSideId: incoming.clientSideId,
        incomingCreatedAt: incoming.created_at ?? incoming.createdAt,
    });
    const incomingText = normalizeMatchText(incoming.content ?? incoming.text ?? incoming.message);
    const incomingType = String(incoming.type || 'text');

    const optimisticByClientSideId = incoming.clientSideId
        ? prev.findIndex((m) => String(m.id) === String(incoming.clientSideId))
        : -1;
    const optimisticByHeuristic =
        optimisticByClientSideId !== -1
            ? -1
            : prev.findIndex((m) => {
                  const id = String(m.id ?? '');
                  if (!/^temp_\d+/.test(id) && !/^voice_\d+/.test(id)) return false;
                  const mSender = String(m.sender_id ?? '');
                  if (String(senderId ?? '') && mSender && mSender !== String(senderId)) return false;
                  if (String(m.type || 'text') !== incomingType) return false;
                  const localText = normalizeMatchText(m.text);
                  if (!incomingText || !localText || incomingText !== localText) return false;
                  const localMs = parseCreatedToMs(m.created_at ?? m.createdAt);
                  const incomingMs = parseCreatedToMs(
                      incoming.created_at ?? incoming.createdAt ?? incoming.timestamp
                  );
                  if (localMs == null || incomingMs == null) return true;
                  return Math.abs(localMs - incomingMs) <= 2 * 60 * 1000;
              });
    const optimisticIndex =
        optimisticByClientSideId !== -1 ? optimisticByClientSideId : optimisticByHeuristic;
    const optimisticMessage = optimisticIndex !== -1 ? prev[optimisticIndex] : null;

    let createdIso = normalizeCreatedAtIso(
        incoming.created_at ?? incoming.createdAt ?? incoming.timestamp
    );
    if (!createdIso) {
        createdIso = new Date().toISOString();
    }
    const tMs = parseCreatedToMs(createdIso) ?? Date.now();
    const safeTime = formatChatTimeLabel(tMs, 'uz-UZ');
    const newMessage = normalizeChatMessage({
        id: incoming.id ?? incoming._id ?? incoming.messageId ?? `srv_${tMs}_${String(senderId ?? 'u')}`,
        text: incoming.content ?? incoming.text ?? '',
        sender: String(senderId) === String(myUserId) ? 'me' : 'them',
        sender_id: senderId,
        created_at: createdIso,
        time: safeTime,
        type: incoming.type || 'text',
        clientSideId: incoming.clientSideId,
        metadata: incoming.metadata ?? optimisticMessage?.metadata,
        is_read: Boolean(incoming.is_read),
        sender_name: incoming.sender_name ?? optimisticMessage?.senderName ?? 'User',
        senderName: incoming.sender_name ?? optimisticMessage?.senderName ?? 'User',
        sender_avatar: incoming.sender_avatar ?? incoming.avatar,
        senderAvatar: incoming.sender_avatar ?? incoming.avatar,
        parentId: incoming.parentId ?? incoming.parent_id ?? optimisticMessage?.parentId,
        parent_id: incoming.parentId ?? incoming.parent_id ?? optimisticMessage?.parent_id,
        parentMessage: incoming.parentMessage ?? optimisticMessage?.parentMessage,
        isPending: false,
    } as Record<string, unknown>);

    const exists = prev.some((m) => String(m.id) === String(newMessage.id));

    const logMergeOut = (action: string, out: ChatMessage[]) => {
        const orderSnap = out.slice(-20).map((m) => ({
            id: m.id,
            created_at: m.created_at,
            clientSideId: m.clientSideId,
        }));
        chatDebug("mergeIncomingSocketMessage", {
            prevCount: prev.length,
            matchIdxByClientSideId: optimisticByClientSideId,
            matchIdxHeuristic: optimisticByHeuristic,
            finalOptimisticIdx: optimisticIndex,
            existsByServerId: exists,
            action,
            normalizedId: newMessage.id,
            normalizedCreatedAt: newMessage.created_at,
            resultLen: out.length,
            orderSnap,
        });
    };

    if (exists) {
        const out = sortChatMessagesLocal(prev);
        logMergeOut("skip-duplicate-same-server-id", out);
        return out;
    }
    if (optimisticIndex !== -1) {
        const newMsgs = [...prev];
        newMsgs[optimisticIndex] = newMessage;
        const out = sortChatMessagesLocal(newMsgs);
        logMergeOut("replace-optimistic", out);
        return out;
    }
    const out = sortChatMessagesLocal([...prev, newMessage]);
    logMergeOut("append-new", out);
    return out;
}

/**
 * Optimistik xabar (faqat server javobigacha UI).
 * `created_at` uchun `max(now, oxirgi xabar+1ms)` — tartibda pastda turishi uchun; server `receive_message`
 * kelganda real `created_at` bilan almashtiriladi (timestamp bump yo‘q).
 */
export function createOptimisticChatMessage(params: {
    id: string;
    text: string;
    senderId: string | undefined;
    prevMessages: ChatMessage[];
    type?: string;
    parentId?: string | null;
    parentMessage?: ChatMessage | null;
    isPending?: boolean;
    isUploading?: boolean;
    error?: string;
    locale?: string;
}): ChatMessage {
    const optimisticCreated = new Date(Math.max(Date.now(), maxCreatedAtMs(params.prevMessages) + 1)).toISOString();
    const loc = params.locale ?? 'uz-UZ';
    const msg = normalizeChatMessage({
        id: params.id,
        text: params.text,
        sender: 'me',
        sender_id: params.senderId,
        created_at: optimisticCreated,
        time: formatChatTimeLabel(new Date(optimisticCreated).getTime(), loc),
        type: params.type ?? 'text',
        parentId: params.parentId,
        parent_id: params.parentId,
        parentMessage: params.parentMessage ?? undefined,
        isPending: params.isPending,
        isUploading: params.isUploading,
        error: params.error,
    } as Record<string, unknown>);
    chatDebug("createOptimisticChatMessage", {
        tempId: params.id,
        clientSideId: params.id,
        text: params.text.length > 80 ? `${params.text.slice(0, 80)}…` : params.text,
        created_at: msg.created_at,
        sender: msg.sender,
        type: msg.type,
    });
    return msg;
}

/** Ro'yxatdan chat tanlashda — animatsiya boshlanishidan oldin cache issiq bo'lishi uchun */
export async function prefetchChatMessagesCache(chatId: string | number): Promise<void> {
    try {
        const res = await apiFetch(`/api/chats/${chatId}/messages`);
        if (!res.ok) return;
        const history = await res.json();
        if (!Array.isArray(history)) return;
        const mapped = mapApiMessagesToLocal(history as unknown[]);
        writeChatMessageCache(chatId, mapped);
    } catch {
        /* tarmoq xatosi — ChatWindow o'zi keyin yuklaydi */
    }
}
