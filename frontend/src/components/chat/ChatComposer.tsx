'use client';

import React from 'react';
import type { ChatMessage } from '@/types/chat-message';
import type { ChatRoom } from '@/types/chat-room';
import type { Socket } from 'socket.io-client';

export type ChatComposerProps = {
    t: (...args: any[]) => string;
    isSomeoneTyping: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    folderInputRef: React.RefObject<HTMLInputElement | null>;
    chatInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, isFolder?: boolean) => void;
    replyTo: ChatMessage | null;
    setReplyTo: (v: ChatMessage | null) => void;
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
};

export function ChatComposer({
    t,
    isSomeoneTyping,
    fileInputRef,
    folderInputRef,
    chatInputRef,
    handleFileUpload,
    replyTo,
    setReplyTo,
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
}: ChatComposerProps) {
    return (
        <>
                {isSomeoneTyping && (
                    <div className="flex items-center gap-2 px-1 pb-1 text-[11px] text-white/60">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce [animation-delay:120ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 animate-bounce [animation-delay:240ms]" />
                        </div>
                        <span>{t('typing')}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded-[25px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="*" onChange={handleFileUpload} />
                    <input
                        type="file"
                        ref={folderInputRef}
                        className="hidden"
                        multiple
                        {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                        onChange={(e) => handleFileUpload(e, true)}
                    />

                    {replyTo && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 animate-slide-up">
                            <div className="glass-premium border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl overflow-hidden min-h-[50px] bg-[#1a1c20]/80 backdrop-blur-3xl">
                                <div className="w-1 h-full bg-blue-500 rounded-full absolute left-0 top-0 bottom-0" />
                                <div className="flex-1 min-w-0 ml-1">
                                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                                        {replyTo.sender === 'me' ? t('me') : (replyTo.senderName || t('interlocutor'))} {t('reply_to')}
                                    </p>
                                    <p className="text-xs text-white/60 truncate italic font-medium">
                                        {replyTo.type === 'text' ? replyTo.text : (replyTo.type === 'image' ? `рџ–јпёЏ ${t('image')}` : (replyTo.type === 'video' ? `рџЋҐ ${t('video')}` : `рџ“„ ${t('file')}`))}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setReplyTo(null)}
                                    className="p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title={t('send_file') as string}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <button onClick={() => folderInputRef.current?.click()} className="p-2 text-white/50 hover:text-amber-400 transition-colors" title={t('send_folder') as string}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 flex items-center bg-transparent border-none outline-none text-white text-sm min-h-[40px]">
                        {isRecording ? (
                            <div className="flex items-center gap-3 w-full animate-pulse text-red-400 font-bold">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                <span>{t('recording')} {formatCallTime(recordingTime)}</span>
                                <button onClick={() => {
                                    setIsRecording(false);
                                    if (timerRef.current) clearInterval(timerRef.current);
                                    if (mediaRecorderRef.current) mediaRecorderRef.current.ondataavailable = null;
                                    mediaRecorderRef.current?.stop();
                                }} className="ml-auto text-[10px] uppercase tracking-widest text-white/40 hover:text-white">{t('cancel')}</button>
                            </div>
                        ) : (
                            <input
                                ref={chatInputRef}
                                className="w-full bg-transparent border-none outline-none text-white placeholder-white/40"
                                placeholder={t('message_placeholder') as string}
                                style={{ fontSize: '16px' }}
                                value={inputValue}
                                onChange={e => {
                                    setInputValue(e.target.value);
                                    if (socket && chat) {
                                        socket.emit('typing', { roomId: chat.id });
                                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                        typingTimeoutRef.current = setTimeout(() => {
                                            socket.emit('stop_typing', { roomId: chat.id });
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
                                onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return;
                                    if (e.repeat) return;
                                    if ((e.nativeEvent as KeyboardEvent & { isComposing?: boolean }).isComposing) return;
                                    e.preventDefault();
                                    void sendMessage();
                                }}
                            />
                        )}
                    </div>
                    {inputValue.trim() || isRecording ? (
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : () => sendMessage()}
                            className={`p-2 rounded-full text-white transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}
                        >
                            {isRecording ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1V7z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={startRecording}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                </div>
        </>
    );
}

export default ChatComposer;
