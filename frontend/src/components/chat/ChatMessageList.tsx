'use client';

import React from 'react';
import { MessageBubble } from './MessageBubble';
import { computeMessageContinuation } from '@/lib/chat-continuation';
import { parseMessageDate } from './chatWindowHelpers';
import type { ChatMessage } from '@/types/chat-message';

export type ChatMessageListProps = {
    t: (...args: any[]) => string;
    language: string;
    messagesScrollRef: React.RefObject<HTMLDivElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    isDragging: boolean;
    handleMessagesScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent) => void;
    renderStartIndex: number;
    renderedMessages: ChatMessage[];
    filteredMessages: ChatMessage[];
    continuationOpts: Parameters<typeof computeMessageContinuation>[2];
    observeMessage: (node: HTMLDivElement | null, msg: ChatMessage) => void;
    chatId?: string;
    isNearBottomRef: React.MutableRefObject<boolean>;
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    setReplyTo: (msg: ChatMessage | null) => void;
    isSelecting: boolean;
    selectedMessageIds: string[];
    toggleSelection: (id: string) => void;
    uploadProgresses: Record<string, number>;
    setViewerMedia: (v: { url: string; type: 'image' | 'video' | 'file' } | null) => void;
    handleForwardMessage: (msg: ChatMessage) => void;
    handleDeleteMessage: (msg: ChatMessage) => void;
    handleReplyClick: (parentId: string) => void;
    activeAudioId: string | null;
    setActiveAudioId: (id: string | null) => void;
    isNearBottom: boolean;
    newMessagesWhileUp: number;
    jumpToLatestMessage: () => void;
};

export function ChatMessageList({
    t,
    language,
    messagesScrollRef,
    messagesEndRef,
    isDragging,
    handleMessagesScroll,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    renderStartIndex,
    renderedMessages,
    filteredMessages,
    continuationOpts,
    observeMessage,
    chatId,
    isNearBottomRef,
    scrollToBottom,
    setReplyTo,
    isSelecting,
    selectedMessageIds,
    toggleSelection,
    uploadProgresses,
    setViewerMedia,
    handleForwardMessage,
    handleDeleteMessage,
    handleReplyClick,
    activeAudioId,
    setActiveAudioId,
    isNearBottom,
    newMessagesWhileUp,
    jumpToLatestMessage,
}: ChatMessageListProps) {
    return (
            <div
                ref={messagesScrollRef}
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 sm:p-4 space-y-1 custom-scrollbar relative pb-4 ${isDragging ? 'bg-blue-500/10' : ''}`}
                onScroll={handleMessagesScroll}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm pointer-events-none">
                        <div className="bg-[#1e293b] border-2 border-dashed border-blue-500 p-8 rounded-3xl flex flex-col items-center gap-4 animate-scale-in">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <span className="text-white font-bold">{t('drop_files')}</span>
                        </div>
                    </div>
                )}
                {renderStartIndex > 0 && (
                    <div className="flex items-center justify-center my-2">
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                            Tepaga chiqing: yana {renderStartIndex} ta eski xabar yuklanadi
                        </div>
                    </div>
                )}
                {renderedMessages.map((msg, i) => {
                    /** To'liq ro'yxatdagi indeks — virtual oyna boshidagi xabar uchun ham oldingi xabar `filteredMessages` dan olinadi. */
                    const absoluteIdx = renderStartIndex + i;
                    const prevMsg = absoluteIdx > 0 ? filteredMessages[absoluteIdx - 1] : undefined;
                    const msgDate = parseMessageDate(msg);
                    const prevMsgDate = prevMsg ? parseMessageDate(prevMsg) : null;
                    const isContinuation = computeMessageContinuation(prevMsg, msg, continuationOpts);
                    const isNewDay = Boolean(
                        msgDate &&
                        (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString())
                    );

                    const formatDateLabel = (d: Date) => {
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(today.getDate() - 1);
                        if (d.toDateString() === today.toDateString()) return t('today');
                        if (d.toDateString() === yesterday.toDateString()) return t('yesterday');
                        return d.toLocaleDateString(language === 'uz' ? 'uz-UZ' : (language === 'ru' ? 'ru-RU' : 'en-US'), { day: '2-digit', month: 'short', year: 'numeric' });
                    };

                    return (
                        <React.Fragment key={msg.id || `msg-${absoluteIdx}`}>
                            {isNewDay && msgDate && (
                                <div className="flex items-center justify-center my-4">
                                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                                        {formatDateLabel(msgDate)}
                                    </div>
                                </div>
                            )}
                            <div ref={(node) => observeMessage(node, msg)}>
                                <MessageBubble
                                    message={msg}
                                    chatId={chatId}
                                    onImageLoad={() => {
                                        if (isNearBottomRef.current) {
                                            requestAnimationFrame(() => scrollToBottom('auto'));
                                        }
                                    }}
                                    onReply={setReplyTo}
                                    isSelecting={isSelecting}
                                    isSelected={selectedMessageIds.includes(msg.id)}
                                    onSelect={() => toggleSelection(msg.id)}
                                    uploadProgress={uploadProgresses[msg.id]}
                                    onMediaClick={(url, type) => setViewerMedia({ url, type })}
                                    onForward={handleForwardMessage}
                                    onDelete={handleDeleteMessage}
                                    isContinuation={isContinuation}
                                    onReplyClick={handleReplyClick}
                                    activeAudioId={activeAudioId}
                                    onAudioPlay={setActiveAudioId}
                                />
                            </div>
                        </React.Fragment>
                    );
                })}
                {!isNearBottom && newMessagesWhileUp > 0 && (
                    <div className="sticky bottom-3 z-30 flex justify-end pr-1 pointer-events-none">
                        <button
                            type="button"
                            onClick={jumpToLatestMessage}
                            className="pointer-events-auto rounded-full bg-blue-500/90 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 shadow-lg border border-white/20 backdrop-blur animate-pulse"
                        >
                            {t('new_messages')} ({newMessagesWhileUp}) ↓
                        </button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

    );
}

export default ChatMessageList;
