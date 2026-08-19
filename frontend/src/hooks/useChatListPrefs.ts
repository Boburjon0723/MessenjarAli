'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
    getChatListPrefs,
    getServerChatListPrefs,
    getChatPref,
    subscribeChatListPrefs,
    toggleChatArchived,
    toggleChatMuted,
    toggleChatPinned,
    setChatUnreadMarked,
    type ChatListPref,
} from '@/lib/chat-list-prefs';

export function useChatListPrefs() {
    const prefs = useSyncExternalStore(subscribeChatListPrefs, getChatListPrefs, getServerChatListPrefs);

    const prefOf = useCallback((chatId: string | number | null | undefined): ChatListPref => {
        if (chatId == null) return {};
        return prefs[String(chatId)] || {};
    }, [prefs]);

    return {
        prefs,
        prefOf,
        togglePinned: toggleChatPinned,
        toggleMuted: toggleChatMuted,
        toggleArchived: toggleChatArchived,
        setUnreadMarked: setChatUnreadMarked,
        getPref: getChatPref,
    };
}
