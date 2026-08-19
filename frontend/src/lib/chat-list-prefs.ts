export type ChatListPref = {
    pinned?: boolean;
    pinnedAt?: number;
    muted?: boolean;
    archived?: boolean;
    unreadMarked?: boolean;
};

export type ChatListPrefsMap = Record<string, ChatListPref>;

const STORAGE_KEY = 'el-chat-list-prefs';
const listeners = new Set<() => void>();
/** useSyncExternalStore: getServerSnapshot / getSnapshot bir xil reference qaytarishi shart */
const EMPTY_PREFS: ChatListPrefsMap = Object.freeze({});
let cachedPrefs: ChatListPrefsMap = EMPTY_PREFS;
let cachedRaw: string | null = null;

function emit() {
    listeners.forEach((cb) => cb());
}

function readStore(): ChatListPrefsMap {
    if (typeof window === 'undefined') return EMPTY_PREFS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === cachedRaw) return cachedPrefs;
        cachedRaw = raw;
        if (!raw) {
            cachedPrefs = EMPTY_PREFS;
            return cachedPrefs;
        }
        const parsed = JSON.parse(raw);
        cachedPrefs = parsed && typeof parsed === 'object' ? parsed : EMPTY_PREFS;
        return cachedPrefs;
    } catch {
        cachedPrefs = EMPTY_PREFS;
        cachedRaw = null;
        return cachedPrefs;
    }
}

function writeStore(next: ChatListPrefsMap) {
    if (typeof window === 'undefined') return;
    try {
        const raw = JSON.stringify(next);
        localStorage.setItem(STORAGE_KEY, raw);
        cachedRaw = raw;
        cachedPrefs = next;
    } catch {
        /* ignore */
    }
    emit();
}

export function getChatListPrefs(): ChatListPrefsMap {
    return readStore();
}

export function getServerChatListPrefs(): ChatListPrefsMap {
    return EMPTY_PREFS;
}

export function getChatPref(chatId: string | number | null | undefined): ChatListPref {
    if (chatId == null) return {};
    return readStore()[String(chatId)] || {};
}

export function patchChatPref(chatId: string | number, patch: Partial<ChatListPref>) {
    const id = String(chatId);
    const store = { ...readStore() };
    const prev = store[id] || {};
    const next = { ...prev, ...patch };
    const empty = !next.pinned && !next.muted && !next.archived && !next.unreadMarked;
    if (empty) delete store[id];
    else store[id] = next;
    writeStore(store);
}

export function subscribeChatListPrefs(cb: () => void) {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}

export function toggleChatPinned(chatId: string | number) {
    const prev = getChatPref(chatId);
    const pinned = !prev.pinned;
    patchChatPref(chatId, { pinned, pinnedAt: pinned ? Date.now() : undefined });
    return pinned;
}

export function toggleChatMuted(chatId: string | number) {
    const muted = !getChatPref(chatId).muted;
    patchChatPref(chatId, { muted });
    return muted;
}

export function toggleChatArchived(chatId: string | number) {
    const prev = getChatPref(chatId);
    const archived = !prev.archived;
    patchChatPref(chatId, { archived, pinned: archived ? false : prev.pinned });
    return archived;
}

export function setChatUnreadMarked(chatId: string | number, unreadMarked: boolean) {
    patchChatPref(chatId, { unreadMarked });
}

export function hydratePrefsFromChats(
    chats: Array<{
        id?: string | number;
        _id?: string | number;
        pinned?: boolean;
        muted?: boolean;
        archived?: boolean;
        unreadMarked?: boolean;
        pinnedAt?: number | string | Date | null;
    }>
) {
    const store = { ...readStore() };
    for (const c of chats) {
        const id = c.id ?? c._id;
        if (id == null) continue;
        const pinnedAt =
            typeof c.pinnedAt === 'number'
                ? c.pinnedAt
                : c.pinnedAt
                  ? new Date(c.pinnedAt).getTime()
                  : undefined;
        const next: ChatListPref = {
            pinned: !!c.pinned,
            pinnedAt: Number.isFinite(pinnedAt) ? pinnedAt : undefined,
            muted: !!c.muted,
            archived: !!c.archived,
            unreadMarked: !!c.unreadMarked,
        };
        const empty = !next.pinned && !next.muted && !next.archived && !next.unreadMarked;
        if (empty) delete store[String(id)];
        else store[String(id)] = next;
    }
    writeStore(store);
}

export async function migrateLocalPrefsToServer() {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('el-chat-prefs-migrated') === '1') return;
    const store = readStore();
    const ids = Object.keys(store);
    let allOk = true;
    for (const id of ids) {
        const p = store[id];
        if (!p) continue;
        const ok = await syncChatPrefToServer(id, {
            pinned: !!p.pinned,
            muted: !!p.muted,
            archived: !!p.archived,
            unreadMarked: !!p.unreadMarked,
        });
        if (!ok) allOk = false;
    }
    if (!allOk) return;
    try {
        localStorage.setItem('el-chat-prefs-migrated', '1');
    } catch {
        /* ignore */
    }
}

export async function syncChatPrefToServer(chatId: string | number, patch: Partial<ChatListPref>): Promise<boolean> {
    const body: Record<string, boolean> = {};
    if (typeof patch.pinned === 'boolean') body.pinned = patch.pinned;
    if (typeof patch.muted === 'boolean') body.muted = patch.muted;
    if (typeof patch.archived === 'boolean') body.archived = patch.archived;
    if (typeof patch.unreadMarked === 'boolean') body.unreadMarked = patch.unreadMarked;
    if (Object.keys(body).length === 0) return true;
    try {
        const { apiFetch } = await import('@/lib/api');
        const res = await apiFetch(`/api/chats/${chatId}/prefs`, {
            method: 'PATCH',
            body: JSON.stringify(body),
        });
        return !!res?.ok;
    } catch {
        return false;
    }
}
