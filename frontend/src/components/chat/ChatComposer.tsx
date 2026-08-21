'use client';

import React, { useState } from 'react';
import type { ChatMessage } from '@/types/chat-message';
import type { ChatRoom } from '@/types/chat-room';
import type { Socket } from 'socket.io-client';
import StickerPicker from './StickerPicker';
import type { Sticker } from '@/lib/sticker-packs';
import { filesFromPasteEvent } from '@/lib/telegram-message-kind';

export type ChatComposerProps = {
    t: (...args: any[]) => string;
    isSomeoneTyping: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    folderInputRef: React.RefObject<HTMLInputElement | null>;
    chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, isFolder?: boolean) => void;
    replyTo: ChatMessage | null;
    setReplyTo: (v: ChatMessage | null) => void;
    editingMessage?: ChatMessage | null;
    setEditingMessage?: (v: ChatMessage | null) => void;
    isRecording: boolean;
    recordingTime: number;
    formatCallTime: (sec: number) => string;
    setIsRecording: (v: boolean) => void;
    timerRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
    mediaRecorderRef: React.MutableRefObject<MediaRecorder | null>;
    inputValue: string;
    setInputValue: (v: string) => void;
    socket: Socket | null;
    chat: ChatRoom | null | undefined;
    typingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
    setInputFocused: (v: boolean) => void;
    messagesScrollRef: React.RefObject<HTMLDivElement | null>;
    nearBottomPx: number;
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    sendMessage: () => void | Promise<void>;
    stopRecording: () => void;
    startRecording: () => void;
    cancelRecording?: () => void;
    onSendSticker?: (sticker: Sticker) => void;
    /** Listing/murojaat: rozilik berilmaguncha */
    composerLocked?: boolean;
    composerLockedHint?: string;
    /** Telegram: clipboard rasm/fayl → preview modal */
    onPasteFiles?: (files: File[]) => void;
    onCancelEdit?: () => void;
};

const iconBtn =
    'flex h-12 w-10 shrink-0 items-center justify-center text-[#aaaaaa] hover:text-white';

export function ChatComposer({
    t,
    isSomeoneTyping: _isSomeoneTyping,
    fileInputRef,
    folderInputRef,
    chatInputRef,
    handleFileUpload,
    replyTo,
    setReplyTo,
    editingMessage,
    setEditingMessage,
    isRecording,
    recordingTime,
    formatCallTime,
    setIsRecording,
    timerRef,
    mediaRecorderRef,
    inputValue,
    setInputValue,
    socket,
    chat,
    typingTimeoutRef,
    setInputFocused,
    messagesScrollRef,
    nearBottomPx,
    scrollToBottom,
    sendMessage,
    stopRecording,
    startRecording,
    cancelRecording,
    onSendSticker,
    composerLocked = false,
    composerLockedHint,
    onPasteFiles,
    onCancelEdit,
}: ChatComposerProps) {
    const [showAttach, setShowAttach] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);

    return (
        <div className="relative">
            <div className="flex items-end gap-2">
                <div className="relative flex min-w-0 flex-1 flex-col rounded-[24px] bg-[#212121] shadow-[0_1px_8px_1px_rgba(0,0,0,0.12)]">
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="*" onChange={handleFileUpload} />
                    <input
                        type="file"
                        ref={folderInputRef}
                        className="hidden"
                        multiple
                        {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                        onChange={(e) => handleFileUpload(e, true)}
                    />

                    {editingMessage && (
                        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0 text-[#8774e1]">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                            </svg>
                            <div className="min-w-0 flex-1 border-l-2 border-[#8774e1] pl-2">
                                <p className="truncate text-[13px] font-medium text-[#8774e1]">{t('edit_msg')}</p>
                                <p className="truncate text-[13px] text-[#aaaaaa]">{editingMessage.text}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onCancelEdit) onCancelEdit();
                                    else {
                                        setEditingMessage?.(null);
                                        setInputValue?.('');
                                    }
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.08] hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}

                    {replyTo && !editingMessage && (
                        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
                            <div className="min-w-0 flex-1 border-l-2 border-[#8774e1] pl-2">
                                <p className="truncate text-[13px] font-medium text-[#8774e1]">
                                    {replyTo.sender === 'me' ? t('me') : (replyTo.senderName || t('interlocutor'))}
                                </p>
                                <p className="truncate text-[13px] text-[#aaaaaa]">
                                    {replyTo.type === 'text'
                                        ? replyTo.text
                                        : replyTo.type === 'sticker'
                                          ? `✨ ${t('sticker') || 'Sticker'}`
                                          : replyTo.type === 'image'
                                            ? t('image')
                                            : replyTo.type === 'video'
                                              ? t('video')
                                              : t('file')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReplyTo(null)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.08] hover:text-white"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}

                    <StickerPicker
                        open={showStickerPicker}
                        onClose={() => setShowStickerPicker(false)}
                        onSelect={(sticker) => { onSendSticker?.(sticker); setShowStickerPicker(false); }}
                    />
                    <div className="flex items-end">
                        <button type="button" className={iconBtn} title="Stickers" aria-label="Stickers" onClick={() => setShowStickerPicker(v => !v)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        <div className="flex min-h-12 min-w-0 flex-1 items-center py-1">
                            {isRecording ? (
                                <div className="flex w-full items-center gap-3 px-1 font-medium text-red-400">
                                    <div className="h-2 w-2 animate-ping rounded-full bg-red-500" />
                                    <span className="text-[16px]">{t('recording')} {formatCallTime(recordingTime)}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (cancelRecording) cancelRecording();
                                            else {
                                                setIsRecording(false);
                                                if (timerRef.current) clearInterval(timerRef.current);
                                                if (mediaRecorderRef.current) {
                                                    try {
                                                        mediaRecorderRef.current.ondataavailable = null;
                                                        mediaRecorderRef.current.stop();
                                                    } catch { /* ignore */ }
                                                }
                                            }
                                        }}
                                        className="ml-auto text-[13px] text-[#aaaaaa] hover:text-white"
                                    >
                                        {t('cancel')}
                                    </button>
                                </div>
                            ) : (
                                <textarea
                                    ref={chatInputRef}
                                    rows={1}
                                    disabled={composerLocked}
                                    className="max-h-40 w-full resize-none bg-transparent py-1.5 text-[16px] leading-[21px] text-white outline-none placeholder:text-[#707579] disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder={
                                        (composerLocked
                                            ? composerLockedHint || t('consent_waiting_message')
                                            : t('message_placeholder')) as string
                                    }
                                    value={inputValue}
                                    onChange={e => {
                                        setInputValue(e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                                        if (socket && chat) {
                                            socket.emit('typing', chat.id);
                                            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                            typingTimeoutRef.current = setTimeout(() => {
                                                socket.emit('stop_typing', chat.id);
                                            }, 2000);
                                        }
                                    }}
                                    onFocus={() => {
                                        setInputFocused(true);
                                        setTimeout(() => {
                                            const el = messagesScrollRef.current;
                                            if (!el) return;
                                            if (el.scrollHeight - el.scrollTop - el.clientHeight < nearBottomPx) {
                                                scrollToBottom('auto');
                                            }
                                        }, 100);
                                    }}
                                    onBlur={() => setInputFocused(false)}
                                    onPaste={(e) => {
                                        if (composerLocked || !onPasteFiles) return;
                                        const files = filesFromPasteEvent(e);
                                        if (!files.length) return;
                                        e.preventDefault();
                                        onPasteFiles(files);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        if (e.shiftKey) return;
                                        if (e.repeat) return;
                                        if ((e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) return;
                                        e.preventDefault();
                                        void sendMessage();
                                    }}
                                />
                            )}
                        </div>

                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowAttach((v) => !v)}
                                className={iconBtn}
                                title={t('send_file') as string}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            </button>
                            {showAttach && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowAttach(false)} />
                                    <div className="absolute bottom-full right-0 z-40 mb-2 w-44 overflow-hidden rounded-xl bg-[#212121] py-1 shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-[15px] text-white hover:bg-white/[0.08]"
                                            onClick={() => { setShowAttach(false); fileInputRef.current?.click(); }}
                                        >
                                            {t('send_file')}
                                        </button>
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-3 px-3 py-2.5 text-[15px] text-white hover:bg-white/[0.08]"
                                            onClick={() => { setShowAttach(false); folderInputRef.current?.click(); }}
                                        >
                                            {t('send_folder')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {inputValue.trim() || isRecording ? (
                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : () => sendMessage()}
                        className={`mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-[0_1px_8px_rgba(0,0,0,0.25)] ${isRecording ? 'bg-red-500' : 'bg-[#8774e1]'}`}
                    >
                        {isRecording ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1V7z" clipRule="evenodd" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a.993.993 0 00-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.07-.87.5-.87 1l.01 4.61c0 .71.73 1.2 1.39.91z" /></svg>
                        )}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={startRecording}
                        className="mb-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#212121] text-[#aaaaaa] shadow-[0_1px_8px_rgba(0,0,0,0.25)] hover:text-white"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                )}
            </div>
        </div>
    );
}

export default ChatComposer;
