'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ChatMessage, ChatMessageMetadata } from '@/types/chat-message';
import { getMessageCopyText, normalizeMessageType } from '@/lib/chat-message-cache';
import { downloadChatFile } from '@/lib/download-file';
import { classifyTelegramMessage } from '@/lib/telegram-message-kind';

function parseMessageMetadata(raw: ChatMessage['metadata']): ChatMessageMetadata {
    if (raw == null) return {};
    if (typeof raw === 'string') {
        try { return JSON.parse(raw) as ChatMessageMetadata; } catch { return {}; }
    }
    return raw;
}

interface MediaContextMenuProps {
    x: number;
    y: number;
    message: ChatMessage;
    isOwn?: boolean;
    onClose: () => void;
    onReply?: () => void;
    onEdit?: () => void;
    onForward?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    onPin?: () => void;
}

export default function MediaContextMenu({
    x, y, message, isOwn = false, onClose,
    onReply, onEdit, onForward, onDelete, onSelect, onPin
}: MediaContextMenuProps) {
    const { showSuccess, showError } = useNotification();
    const { t } = useLanguage();
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ left: x, top: y });

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
        };
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!el) return;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const pad = 8;
        setPos({
            left: Math.min(Math.max(pad, x), window.innerWidth - w - pad),
            top: Math.min(Math.max(pad, y), window.innerHeight - h - pad),
        });
    }, [x, y]);

    const type = normalizeMessageType(message.type);
    const meta = parseMessageMetadata(message.metadata);
    const kind = classifyTelegramMessage({
        type: message.type,
        mime: typeof meta.mimetype === 'string' ? meta.mimetype : '',
        filename: `${meta.name || ''} ${meta.file_name || ''} ${message.text || ''}`,
    });
    const isImage = kind === 'image';
    const isVideo = kind === 'video';
    const isVoice = kind === 'voice';
    const isFile = kind === 'file';
    const isText = kind === 'text';
    const canSave = kind === 'image' || kind === 'video' || kind === 'voice' || kind === 'file' || kind === 'song';
    const copyText = getMessageCopyText(message);
    const mediaUrl = (message.text || "").startsWith('http')
        ? message.text
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${(message.text || "").startsWith('/') ? '' : '/'}${message.text}`;

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(copyText);
            showSuccess(t('msg_copied'));
        } catch {
            showError('Copy failed');
        }
        onClose();
    };

    const handleCopyImage = async () => {
        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
            const fetchUrl = mediaUrl.includes('storage.googleapis.com') || mediaUrl.includes('firebasestorage')
                ? `${apiBase}/api/media-proxy?url=${encodeURIComponent(mediaUrl)}`
                : mediaUrl;
            const res = await fetch(fetchUrl);
            const srcBlob = await res.blob();
            // Convert any image format to PNG via canvas (ClipboardItem requires image/png)
            const bitmapUrl = URL.createObjectURL(srcBlob);
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Image load failed'));
                img.src = bitmapUrl;
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d')!.drawImage(img, 0, 0);
            URL.revokeObjectURL(bitmapUrl);
            const pngBlob = await new Promise<Blob>((resolve, reject) =>
                canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
            );
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
            showSuccess(t('msg_copied'));
        } catch (err) {
            console.warn('[CopyImage] Failed, trying writeText fallback:', err);
            try {
                await navigator.clipboard.writeText(mediaUrl);
                showSuccess(t('msg_copied'));
            } catch {
                showError('Copy failed');
            }
        }
        onClose();
    };

    const handleSaveAs = async () => {
        if (!canSave) return;
        const meta = parseMessageMetadata(message.metadata);
        let downloadName =
            (typeof meta.file_name === 'string' && meta.file_name) ||
            (typeof meta.name === 'string' && meta.name) ||
            decodeURIComponent(String(message.text || '').split('/').pop()?.split('?')[0] || 'media');
        if (!/\.[a-z0-9]{2,8}$/i.test(downloadName)) {
            if (isImage) downloadName += '.jpg';
            else if (isVideo) downloadName += '.mp4';
            else if (isVoice) downloadName += '.ogg';
            else if (isFile) downloadName += '.bin';
        }
        try {
            await downloadChatFile(mediaUrl, downloadName);
        } catch {
            showError(t('upload_error') || 'Download failed');
        }
        onClose();
    };

    const handlePin = () => {
        onPin?.();
        onClose();
    };

    const handleEdit = () => {
        onEdit?.();
        onClose();
    };

    type MenuItem = {
        id: string;
        icon: React.ReactNode;
        label: string;
        danger?: boolean;
        action: () => void;
    };

    const items: MenuItem[] = [];

    // Reply
    if (onReply) {
        items.push({
            id: 'reply',
            icon: <IconReply />,
            label: t('reply'),
            action: () => { onReply(); onClose(); },
        });
    }

    // Edit (only own text messages)
    if (isOwn && isText && onEdit) {
        items.push({
            id: 'edit',
            icon: <IconEdit />,
            label: t('edit_msg'),
            action: handleEdit,
        });
    }

    if (copyText) {
        items.push({
            id: 'copy',
            icon: <IconCopy />,
            label: t('copy_text'),
            action: handleCopyText,
        });
    }

    if (isImage) {
        items.push({
            id: 'copy-image',
            icon: <IconCopy />,
            label: t('copy_image') || t('copy_text'),
            action: handleCopyImage,
        });
    }

    if (canSave) {
        items.push({
            id: 'save',
            icon: <IconSave />,
            label: t('save_file'),
            action: handleSaveAs,
        });
    }

    // Pin
    items.push({
        id: 'pin',
        icon: <IconPin />,
        label: t('pin_msg'),
        action: handlePin,
    });

    // Forward
    if (onForward) {
        items.push({
            id: 'forward',
            icon: <IconForward />,
            label: t('forward'),
            action: () => { onForward(); onClose(); },
        });
    }

    // Select
    if (onSelect) {
        items.push({
            id: 'select',
            icon: <IconSelect />,
            label: t('select_messages'),
            action: () => { onSelect(); onClose(); },
        });
    }

    // Delete
    if (onDelete) {
        items.push({
            id: 'delete',
            icon: <IconDelete />,
            label: t('delete'),
            danger: true,
            action: () => { onDelete(); onClose(); },
        });
    }

    if (typeof document === 'undefined') return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[9998]"
                onMouseDown={onClose}
                onContextMenu={(e) => { e.preventDefault(); onClose(); }}
            />
            <div
                ref={menuRef}
                className="fixed z-[9999] min-w-[200px] overflow-hidden rounded-xl bg-[#212121] py-1 shadow-[0_2px_16px_rgba(0,0,0,0.45)]"
                style={{ top: pos.top, left: pos.left }}
                role="menu"
            >
                {items.map((item, idx) => (
                    <React.Fragment key={item.id}>
                        {item.danger && idx > 0 && (
                            <div className="h-px bg-white/[0.06] mx-3 my-0.5" />
                        )}
                        <button
                            type="button"
                            onClick={item.action}
                            className="w-full flex items-center gap-4 px-4 py-[10px] hover:bg-white/[0.06] active:bg-white/[0.1] transition-colors text-left"
                        >
                            <span className={`flex-shrink-0 w-5 h-5 ${item.danger ? 'text-[#e53935]' : 'text-[#aaaaaa]'}`}>
                                {item.icon}
                            </span>
                            <span className={`text-[15px] ${item.danger ? 'text-[#e53935]' : 'text-white'}`}>
                                {item.label}
                            </span>
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </>,
        document.body
    );
}

function IconReply() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" fill="currentColor" />
        </svg>
    );
}

function IconEdit() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor" />
        </svg>
    );
}

function IconCopy() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor" />
        </svg>
    );
}

function IconSave() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor" />
        </svg>
    );
}

function IconPin() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" fill="currentColor" />
        </svg>
    );
}

function IconForward() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M14 9V5l7 7-7 7v-4.1c-5 0-8.5 1.6-11 5.1 1-5 4-10 11-11z" fill="currentColor" />
        </svg>
    );
}

function IconSelect() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
        </svg>
    );
}

function IconDelete() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
        </svg>
    );
}
