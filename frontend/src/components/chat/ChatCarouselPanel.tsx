"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import ChatWindow from "./ChatWindow";

/** Qisqaroq — ikki bosqichli «avval to‘liq, keyin siljish» effektini kamaytiradi */
const DURATION_MS = 420;

/** Ro'yxat / API dan keladigan chat obyekti (ChatWindow bilan bir xil shakl) */
export type CarouselChat = Record<string, unknown> & { id: string | number };

export interface ChatCarouselPanelProps {
    chat: CarouselChat;
    chats: CarouselChat[];
    onToggleInfo: () => void;
    onBack: () => void;
    onMarkAsRead?: (chatId: string) => void;
}

/**
 * Ro'yxatdan boshqa suhbat tanlanganda o'rta ChatWindow karusel kabi yoniga siljiydi
 * (eski chapga chiqadi, yangisi o'ngdan kiradi) — shaxsiy, guruh, kanal va boshqalar bir xil.
 */
export default function ChatCarouselPanel({
    chat,
    chats,
    onToggleInfo,
    onBack,
    onMarkAsRead,
}: ChatCarouselPanelProps) {
    const prevChatRef = useRef<CarouselChat | null>(null);
    const [leaving, setLeaving] = useState<CarouselChat | null>(null);
    const [initialEnter, setInitialEnter] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * useEffect + startTransition birinchi kadrda yangi chatni animatsiyasiz ko‘rsatardi
     * (keyin «o‘ngdan kirish» qo‘shilardi). useLayoutEffect va oddiy setState — bitta silliq o‘tish.
     */
    useLayoutEffect(() => {
        if (!chat) {
            prevChatRef.current = null;
            return;
        }

        const prev = prevChatRef.current;

        if (prev && String(prev.id) === String(chat.id)) {
            prevChatRef.current = chat;
            return;
        }

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (prev && String(prev.id) !== String(chat.id)) {
            setInitialEnter(false);
            setLeaving(prev);
            timeoutRef.current = setTimeout(() => {
                setLeaving(null);
                timeoutRef.current = null;
            }, DURATION_MS);
        } else if (!prev) {
            setInitialEnter(true);
            timeoutRef.current = setTimeout(() => {
                setInitialEnter(false);
                timeoutRef.current = null;
            }, DURATION_MS);
        }

        prevChatRef.current = chat;

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [chat]);

    const noop = () => {};

    const showIncomingEnter = !!leaving || initialEnter;

    return (
        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden h-full">
            {leaving ? (
                <div
                    className="absolute inset-0 z-10 flex flex-col min-h-0 pointer-events-none chat-carousel-panel-exit"
                    aria-hidden
                >
                    <ChatWindow
                        key={`carousel-out-${String(leaving.id)}`}
                        chat={leaving}
                        chats={chats}
                        onToggleInfo={noop}
                        onBack={noop}
                        onMarkAsRead={onMarkAsRead}
                        suppressRootFade
                        subscribeSocket={false}
                    />
                </div>
            ) : null}
            <div
                className={`relative z-20 flex-1 min-h-0 flex flex-col h-full ${
                    showIncomingEnter ? "chat-carousel-panel-enter" : ""
                }`}
            >
                <ChatWindow
                    key={`carousel-in-${String(chat.id)}`}
                    chat={chat}
                    chats={chats}
                    onToggleInfo={onToggleInfo}
                    onBack={onBack}
                    onMarkAsRead={onMarkAsRead}
                    suppressRootFade
                />
            </div>
        </div>
    );
}
