'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ChatListPref } from '@/lib/chat-list-prefs';

export type ChatListContextAction =
    | 'open_tab'
    | 'preview'
    | 'unread'
    | 'pin'
    | 'mute'
    | 'archive'
    | 'delete';

type MenuItem = {
    id: ChatListContextAction;
    label: string;
    danger?: boolean;
    hidden?: boolean;
    icon: React.ReactNode;
};

const iconCls = 'h-5 w-5 shrink-0';

function IconOpenTab() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path strokeLinecap="round" d="M12 8v8M8 12h8" />
        </svg>
    );
}
function IconEye() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}
function IconUnread() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0 4.4-4 8-9 8H6l-3 3V12c0-4.4 4-8 9-8s9 3.6 9 8z" />
        </svg>
    );
}
function IconRead() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12.5l4 4L14 9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 16.5l2 2 8-9" />
        </svg>
    );
}
function IconPin() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17v5M8 4l8 3-2 6H10L8 4zM7 13h10" />
        </svg>
    );
}
function IconMute() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4M10 5a4 4 0 014 4v.5M6 9v1a6 6 0 006 6M4 4l16 16" />
            <path strokeLinecap="round" d="M12 19v2" />
        </svg>
    );
}
function IconUnmute() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h2a2 2 0 002-2v-2M10 5a4 4 0 014 4v4a4 4 0 01-8 0V9a4 4 0 014-4z" />
            <path strokeLinecap="round" d="M12 19v2" />
        </svg>
    );
}
function IconArchive() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v3H4V7zM6 10v9h12v-9M9 14h6" />
        </svg>
    );
}
function IconTrash() {
    return (
        <svg className={iconCls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5h6v2m-8 0l1 12h8l1-12" />
        </svg>
    );
}

export function ChatListContextMenu({
    x,
    y,
    pref,
    unreadCount,
    labels,
    onAction,
    onClose,
}: {
    x: number;
    y: number;
    pref: ChatListPref;
    unreadCount: number;
    labels: {
        open_tab: string;
        preview: string;
        mark_unread: string;
        mark_read: string;
        pin: string;
        unpin: string;
        mute: string;
        unmute: string;
        archive: string;
        unarchive: string;
        delete: string;
    };
    onAction: (action: ChatListContextAction) => void;
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ left: x, top: y });

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const pad = 8;
        setPos({
            left: Math.min(Math.max(pad, x), window.innerWidth - w - pad),
            top: Math.min(Math.max(pad, y), window.innerHeight - h - pad),
        });
    }, [x, y]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const isUnread = unreadCount > 0 || !!pref.unreadMarked;
    const items: MenuItem[] = [
        { id: 'open_tab', label: labels.open_tab, icon: <IconOpenTab /> },
        { id: 'preview', label: labels.preview, icon: <IconEye /> },
        {
            id: 'unread',
            label: isUnread ? labels.mark_read : labels.mark_unread,
            icon: isUnread ? <IconRead /> : <IconUnread />,
        },
        {
            id: 'pin',
            label: pref.pinned ? labels.unpin : labels.pin,
            icon: <IconPin />,
            hidden: !!pref.archived,
        },
        {
            id: 'mute',
            label: pref.muted ? labels.unmute : labels.mute,
            icon: pref.muted ? <IconUnmute /> : <IconMute />,
        },
        {
            id: 'archive',
            label: pref.archived ? labels.unarchive : labels.archive,
            icon: <IconArchive />,
        },
        { id: 'delete', label: labels.delete, danger: true, icon: <IconTrash /> },
    ];

    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            <div className="fixed inset-0 z-[80]" onMouseDown={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
            <div
                ref={ref}
                className="fixed z-[81] min-w-[240px] overflow-hidden rounded-xl bg-[#212121] py-1 shadow-[0_2px_16px_rgba(0,0,0,0.45)]"
                style={{ left: pos.left, top: pos.top }}
                role="menu"
            >
                {items.filter((it) => !it.hidden).map((it) => (
                    <button
                        key={it.id}
                        type="button"
                        role="menuitem"
                        className={`flex w-full items-center gap-4 px-4 py-[9px] text-left text-[16px] leading-5 hover:bg-white/[0.08] ${
                            it.danger ? 'text-[#e53935]' : 'text-white'
                        }`}
                        onClick={() => {
                            onAction(it.id);
                            onClose();
                        }}
                    >
                        {it.icon}
                        <span className="truncate">{it.label}</span>
                    </button>
                ))}
            </div>
        </>,
        document.body
    );
}

export default ChatListContextMenu;
