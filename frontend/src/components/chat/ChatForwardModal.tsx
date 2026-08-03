'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { ChatMessage } from '@/types/chat-message';
import type { ChatRoom } from '@/types/chat-room';

export type ChatForwardModalProps = {
    forwardMessage: ChatMessage;
    chats: ChatRoom[];
    currentChatId?: string | number;
    avatarErrors: Record<string, boolean>;
    onAvatarError: (chatId: string) => void;
    onClose: () => void;
    onForward: (chat: ChatRoom) => void;
};

export function ChatForwardModal({
    forwardMessage: _forwardMessage,
    chats,
    currentChatId,
    avatarErrors,
    onAvatarError,
    onClose,
    onForward,
}: ChatForwardModalProps) {
    const { t } = useLanguage();
    const targets = chats.filter((c) => c.id !== currentChatId);

    return (
        <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
            <div className="w-full max-w-md max-h-[70vh] overflow-hidden glass-premium border border-white/10 rounded-3xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold text-white">{t('forward_to')}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {targets.length === 0 ? (
                        <p className="text-white/50 text-sm py-6 text-center">{t('no_messages')}</p>
                    ) : (
                        targets.map((c) => {
                            const displayName = c.type === 'group' ? c.name : (c.otherUser ? `${c.otherUser.name || ''} ${c.otherUser.surname || ''}`.trim() || c.name : c.name) || 'Chat';
                            const avatar = c.avatar || c.otherUser?.avatar || c.otherUser?.avatar_url;
                            const avatarSrc = avatar && avatar !== 'null' && avatar !== '' && avatar !== 'use_initials'
                                ? (avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${avatar.startsWith('/') ? '' : '/'}${avatar}`)
                                : null;
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => onForward(c)}
                                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                                        {avatarSrc && !avatarErrors[String(c.id)] ? (
                                            <img
                                                src={avatarSrc}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                onError={() => onAvatarError(String(c.id))}
                                            />
                                        ) : (
                                            (displayName || '?')[0].toUpperCase()
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-white font-medium truncate">{displayName}</p>
                                        <p className="text-[11px] text-white/40 truncate">{c.message || ''}</p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChatForwardModal;
