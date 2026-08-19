'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { prefetchChatMessagesCache, readChatMessageCache } from '@/lib/chat-message-cache';
import type { ChatMessage } from '@/types/chat-message';

export function ChatPreviewPopover({
    chat,
    anchor,
    onOpen,
    onClose,
}: {
    chat: any;
    anchor: { x: number; y: number };
    onOpen: () => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ left: anchor.x, top: anchor.y });
    const [messages, setMessages] = useState<ChatMessage[]>(() => readChatMessageCache(chat?.id).slice(-8));

    useEffect(() => {
        let cancelled = false;
        const cached = readChatMessageCache(chat?.id);
        if (cached.length) setMessages(cached.slice(-8));
        void prefetchChatMessagesCache(chat?.id).then(() => {
            if (cancelled) return;
            setMessages(readChatMessageCache(chat?.id).slice(-8));
        });
        return () => {
            cancelled = true;
        };
    }, [chat?.id]);

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const pad = 12;
        setPos({
            left: Math.min(Math.max(pad, anchor.x), window.innerWidth - w - pad),
            top: Math.min(Math.max(pad, anchor.y), window.innerHeight - h - pad),
        });
    }, [anchor.x, anchor.y, messages.length]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const title = useMemo(() => chat?.name || '', [chat?.name]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[82]" onMouseDown={onClose} />
            <div
                ref={ref}
                className="fixed z-[83] w-[320px] overflow-hidden rounded-2xl bg-[#212121] shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
                style={{ left: pos.left, top: pos.top }}
            >
                <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.06]"
                    onClick={onOpen}
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#8774e1] text-sm font-medium text-white">
                        {title ? String(title).charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-white">{title}</p>
                        <p className="truncate text-[13px] text-[#aaaaaa]">{chat?.time || ''}</p>
                    </div>
                </button>
                <div className="tg-chat-wallpaper max-h-[280px] space-y-1 overflow-y-auto px-3 py-2">
                    {messages.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-white/50">…</p>
                    ) : (
                        messages.map((m) => (
                            <div key={m.id} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[85%] rounded-[12px] px-2 py-1 text-[13px] leading-[17px] text-white ${
                                        m.sender === 'me' ? 'bg-[#8774e1]' : 'bg-[#181818]'
                                    }`}
                                >
                                    <span className="break-words">
                                        {m.type === 'text' ? (m.text || '') : (m.type || '')}
                                    </span>
                                    <span className="ml-1.5 text-[10px] text-white/60">{m.time}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}

export default ChatPreviewPopover;
