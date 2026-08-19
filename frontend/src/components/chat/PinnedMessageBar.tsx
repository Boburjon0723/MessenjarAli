'use client';

import React from 'react';
import { Pin, X } from 'lucide-react';
import type { ChatMessage } from '@/types/chat-message';

interface PinnedMessageBarProps {
    message: ChatMessage | null;
    onClickMessage: () => void;
    onUnpin: () => void;
    canUnpin?: boolean;
}

function previewText(msg: ChatMessage): string {
    if (msg.type === 'image' || msg.type === 'photo') return '🖼 Rasm';
    if (msg.type === 'video') return '🎬 Video';
    if (msg.type === 'voice') return '🎤 Ovozli xabar';
    if (msg.type === 'file' || msg.type === 'document') return '📎 Fayl';
    if (msg.type === 'sticker') return '🎨 Sticker';
    const text = msg.text || '';
    if (text.length > 80) return text.slice(0, 80) + '…';
    return text || 'Xabar';
}

export default function PinnedMessageBar({ message, onClickMessage, onUnpin, canUnpin = true }: PinnedMessageBarProps) {
    if (!message) return null;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e1e2e]/80 backdrop-blur-lg border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors min-h-[40px]">
            <div className="w-0.5 h-7 rounded-full bg-[#8774e1] shrink-0" />
            <Pin className="w-4 h-4 text-[#8774e1] shrink-0" />
            <div className="flex-1 min-w-0 overflow-hidden" onClick={onClickMessage}>
                <p className="text-[11px] font-semibold text-[#8774e1] leading-tight">Qadalan xabar</p>
                <p className="text-[12px] text-white/60 truncate leading-tight">{previewText(message)}</p>
            </div>
            {canUnpin && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUnpin(); }}
                    className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
