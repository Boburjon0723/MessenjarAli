'use client';

import React, { useEffect, useRef } from 'react';
import { useNotification } from '@/context/NotificationContext';
import type { ChatMessage, ChatMessageMetadata } from '@/types/chat-message';

function parseMessageMetadata(raw: ChatMessage['metadata']): ChatMessageMetadata {
    if (raw == null) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as ChatMessageMetadata;
        } catch {
            return {};
        }
    }
    return raw;
}

interface MediaContextMenuProps {
    x: number;
    y: number;
    message: ChatMessage;
    onClose: () => void;
    onReply?: () => void;
    onForward?: () => void;
    onDelete?: () => void;
}

export default function MediaContextMenu({
    x, y, message, onClose, onReply, onForward, onDelete
}: MediaContextMenuProps) {
    const { showError, showSuccess } = useNotification();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    // Adjust position so menu stays in viewport
    const adjustedY = typeof window !== 'undefined' && y + 320 > window.innerHeight ? y - 280 : y;
    const adjustedX = typeof window !== 'undefined' && x + 260 > window.innerWidth ? x - 240 : x;

    const mediaUrl = (message.text || "").startsWith('http') ? message.text : `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}${(message.text || "").startsWith('/') ? '' : '/'}${message.text}`;
    const isMedia = message.type === 'image' || message.type === 'video' || message.type === 'voice' || message.type === 'file';

    const handleSaveAs = async () => {
        if (!isMedia) return;
        try {
            const response = await fetch(mediaUrl);
            const contentType = response.headers.get('content-type');

            // If response is JSON, it's likely a 404/Error from the server
            if (contentType && contentType.includes('application/json')) {
                const errData = await response.json();
                console.error('Download failed: Server returned error', errData);
                showError("Xatolik: Fayl serverdan topilmadi (404).");
                onClose();
                return;
            }

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            // Use metadata file name if available, otherwise fallback to URL filename
            const meta = parseMessageMetadata(message.metadata);
            a.download =
                (typeof meta.file_name === 'string' && meta.file_name) ||
                (typeof meta.name === 'string' && meta.name) ||
                message.text.split('/').pop() ||
                'media';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed', error);
            // Fallback to simple direct link if fetch fails
            const a = document.createElement('a');
            a.href = mediaUrl;
            a.download = message.text.split('/').pop() || 'media';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        onClose();
    };

    const handleCopy = async () => {
        try {
            if (message.type === 'image') {
                const res = await fetch(mediaUrl);
                const blob = await res.blob();
                await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                ]);
            } else if (message.type === 'text') {
                await navigator.clipboard.writeText(message.text);
            } else {
                await navigator.clipboard.writeText(mediaUrl);
            }
        } catch {
            navigator.clipboard.writeText(message.type === 'text' ? message.text : mediaUrl);
        }
        onClose();
    };

    const handleOpenFull = () => {
        if (isMedia) {
            window.open(mediaUrl, '_blank');
        }
        onClose();
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'ExpertLine',
                    text: message.type === 'text' ? message.text : 'ExpertLine orqali fayl ulashildi',
                    url: isMedia ? mediaUrl : window.location.href,
                });
            } catch (err) {
                console.error('Sharing failed', err);
            }
        } else {
            // Fallback: Copy link
            handleCopy();
            showSuccess('Ulashish havolasi nusxalandi');
        }
        onClose();
    };

    const menuItems = [
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2v-8a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 10v4m4-4v4" />
                </svg>
            ),
            label: 'Javob berish',
            action: () => { onReply?.(); onClose(); },
        },
        ...(isMedia ? [
            {
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                ),
                label: 'Saqlash',
                action: handleSaveAs,
            },
        ] : []),
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 5l8 7-8 7V5z" />
                </svg>
            ),
            label: 'Yuborish (Forward)',
            action: () => { onForward?.(); onClose(); },
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
            ),
            label: 'Ulashish (Share)',
            action: handleShare,
        },
        {
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            ),
            label: 'O\'chirish',
            labelClass: 'text-red-400',
            action: () => { onDelete?.(); onClose(); },
        },
    ];

    return (
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div
                ref={menuRef}
                className="absolute pointer-events-auto"
                style={{ top: adjustedY, left: adjustedX }}
            >
                {/* Glass menu card */}
                <div
                    className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 min-w-[220px]"
                    style={{
                        background: 'rgba(28, 31, 44, 0.96)',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                    }}
                >
                    {menuItems.map((item, idx) => (
                        <React.Fragment key={idx}>
                            {idx === menuItems.length - 1 && (
                                <div className="h-px bg-white/10 mx-3" />
                            )}
                            <button
                                onClick={item.action}
                                className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-white/8 active:bg-white/12 transition-colors text-left group"
                                style={{ background: 'transparent' }}
                            >
                                <span className={`flex-shrink-0 ${item.labelClass ? 'text-red-400' : 'text-white/60'} group-hover:text-white transition-colors`}>
                                    {item.icon}
                                </span>
                                <span className={`text-[14px] font-medium ${item.labelClass || 'text-white/85'}`}>
                                    {item.label}
                                </span>
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
}
