/**
 * Telegram-style per-chat composer drafts (text + reply target).
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'el_chat_drafts_v2';
const LEGACY_KEY = 'el_chat_drafts_v1';

export type DraftReply = {
    id: string;
    text?: string;
    sender?: string;
    senderName?: string;
    type?: string;
};

type DraftEntry = {
    text: string;
    reply?: DraftReply | null;
};

type DraftMap = Record<string, DraftEntry>;

const listeners = new Set<() => void>();
/** useSyncExternalStore: getServerSnapshot / getSnapshot barqaror reference */
const EMPTY_TEXT_MAP: Record<string, string> = Object.freeze({});
let textSnapshot: Record<string, string> = EMPTY_TEXT_MAP;

function rebuildTextSnapshot() {
    const out: Record<string, string> = {};
    for (const [id, entry] of Object.entries(drafts)) {
        if (entry.text?.trim()) out[id] = entry.text;
    }
    textSnapshot = Object.keys(out).length ? out : EMPTY_TEXT_MAP;
}

function normalizeEntry(raw: unknown): DraftEntry | null {
    if (typeof raw === 'string') {
        const text = raw.trim() ? raw : '';
        if (!text) return null;
        return { text };
    }
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text : '';
    let reply: DraftReply | null = null;
    if (o.reply && typeof o.reply === 'object') {
        const r = o.reply as Record<string, unknown>;
        if (r.id != null) {
            reply = {
                id: String(r.id),
                text: typeof r.text === 'string' ? r.text : undefined,
                sender: typeof r.sender === 'string' ? r.sender : undefined,
                senderName: typeof r.senderName === 'string' ? r.senderName : undefined,
                type: typeof r.type === 'string' ? r.type : undefined,
            };
        }
    }
    if (!text.trim() && !reply) return null;
    return { text, reply };
}

function load(): DraftMap {
    if (typeof window === 'undefined') return {};
    try {
        let raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            raw = localStorage.getItem(LEGACY_KEY);
        }
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return {};
        const out: DraftMap = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            const entry = normalizeEntry(v);
            if (entry) out[String(k)] = entry;
        }
        return out;
    } catch {
        return {};
    }
}

let drafts: DraftMap = load();
rebuildTextSnapshot();

function emit() {
    listeners.forEach((l) => l());
}

function persist() {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {
        /* ignore quota */
    }
}

function writeEntry(chatId: string, entry: DraftEntry | null) {
    const id = String(chatId);
    if (!entry || (!entry.text.trim() && !entry.reply)) {
        if (!(id in drafts)) return;
        const { [id]: _r, ...rest } = drafts;
        drafts = rest;
    } else {
        drafts = { ...drafts, [id]: entry };
    }
    rebuildTextSnapshot();
    persist();
    emit();
}

export function getChatDraft(chatId: string | number | null | undefined): string {
    if (chatId == null) return '';
    return drafts[String(chatId)]?.text || '';
}

export function getChatDraftReply(chatId: string | number | null | undefined): DraftReply | null {
    if (chatId == null) return null;
    return drafts[String(chatId)]?.reply || null;
}

/** Chat list subtitle: chatId → draft text */
export function getChatDraftsSnapshot(): Record<string, string> {
    return textSnapshot;
}

export function getServerChatDraftsSnapshot(): Record<string, string> {
    return EMPTY_TEXT_MAP;
}

export function setChatDraft(chatId: string | number | null | undefined, text: string) {
    if (chatId == null) return;
    const id = String(chatId);
    const prev = drafts[id];
    const nextText = String(text ?? '');
    if (!nextText.trim() && !prev?.reply) {
        writeEntry(id, null);
        return;
    }
    if (prev?.text === nextText) return;
    writeEntry(id, { text: nextText, reply: prev?.reply || null });
}

export function setChatDraftReply(
    chatId: string | number | null | undefined,
    reply: DraftReply | null
) {
    if (chatId == null) return;
    const id = String(chatId);
    const prev = drafts[id];
    const text = prev?.text || '';
    const prevId = prev?.reply?.id || null;
    const nextId = reply?.id || null;
    if (prevId === nextId && !text.trim() && !reply) {
        writeEntry(id, null);
        return;
    }
    if (prevId === nextId && text === (prev?.text || '')) {
        // same reply id — still update fields if reply object changed
        if (!reply && !prev?.reply) return;
    }
    if (!text.trim() && !reply) {
        writeEntry(id, null);
        return;
    }
    writeEntry(id, { text, reply });
}

export function clearChatDraft(chatId: string | number | null | undefined) {
    if (chatId == null) return;
    writeEntry(String(chatId), null);
}

export function subscribeChatDrafts(listener: () => void) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function useChatDraftsMap(): Record<string, string> {
    return useSyncExternalStore(subscribeChatDrafts, getChatDraftsSnapshot, getServerChatDraftsSnapshot);
}
