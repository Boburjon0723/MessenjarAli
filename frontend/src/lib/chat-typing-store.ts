/**
 * Peer typing indicators for chat list (and open chat).
 */

import { useSyncExternalStore } from 'react';

type TypingMap = Record<string, true>;

const listeners = new Set<() => void>();
const EMPTY_TYPING: TypingMap = Object.freeze({}) as TypingMap;
let typing: TypingMap = EMPTY_TYPING;
const clearTimers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
    listeners.forEach((l) => l());
}

export function getChatTypingSnapshot(): TypingMap {
    return typing;
}

export function getServerChatTypingSnapshot(): TypingMap {
    return EMPTY_TYPING;
}

export function isChatTyping(chatId: string | number | null | undefined): boolean {
    if (chatId == null) return false;
    return !!typing[String(chatId)];
}

export function setChatTyping(chatId: string | number | null | undefined, on: boolean) {
    if (chatId == null) return;
    const id = String(chatId);
    const prev = clearTimers.get(id);
    if (prev) {
        clearTimeout(prev);
        clearTimers.delete(id);
    }
    if (on) {
        if (!typing[id]) {
            typing = { ...typing, [id]: true };
            emit();
        }
        clearTimers.set(
            id,
            setTimeout(() => {
                clearTimers.delete(id);
                if (!typing[id]) return;
                const { [id]: _r, ...rest } = typing;
                typing = Object.keys(rest).length ? (rest as TypingMap) : EMPTY_TYPING;
                emit();
            }, 3200)
        );
    } else if (typing[id]) {
        const { [id]: _r, ...rest } = typing;
        typing = Object.keys(rest).length ? (rest as TypingMap) : EMPTY_TYPING;
        emit();
    }
}

export function subscribeChatTyping(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useChatTypingMap(): TypingMap {
    return useSyncExternalStore(subscribeChatTyping, getChatTypingSnapshot, getServerChatTypingSnapshot);
}
