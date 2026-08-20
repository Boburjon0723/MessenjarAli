'use client';

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { computeMessageContinuation } from '@/lib/chat-continuation';
import { parseMessageDate } from './chatWindowHelpers';
import type { ChatMessage } from '@/types/chat-message';
import { computeExpiredPanelInviteIds } from '@/lib/panel-invite-ui';
import { classifyTelegramMessage, resolveChatMediaUrl } from '@/lib/telegram-message-kind';
import type { SongTrack } from '@/lib/song-player-store';
import { apiFetch } from '@/lib/api';

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
    setSelectedMessageIds?: (ids: string[]) => void;
    uploadProgresses: Record<string, number>;
    setViewerMedia: (v: { url: string; type: 'image' | 'video' | 'file' } | null) => void;
    handleForwardMessage: (msg: ChatMessage) => void;
    handleDeleteMessage: (msg: ChatMessage) => void;
    handleEditMessage?: (msg: ChatMessage) => void;
    handlePinMessage?: (msg: ChatMessage) => void;
    handleReplyClick: (parentId: string) => void;
    onStartSelecting?: () => void;
    activeAudioId: string | null;
    setActiveAudioId: (id: string | null) => void;
    isNearBottom: boolean;
    newMessagesWhileUp: number;
    jumpToLatestMessage: () => void;
    showPeerAvatar?: boolean;
    chatType?: string;
    groupCreatorId?: string | null;
    currentUserId?: string | null;
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
    setSelectedMessageIds,
    uploadProgresses,
    setViewerMedia,
    handleForwardMessage,
    handleDeleteMessage,
    handleEditMessage,
    handlePinMessage,
    handleReplyClick,
    onStartSelecting,
    activeAudioId,
    setActiveAudioId,
    isNearBottom,
    newMessagesWhileUp,
    jumpToLatestMessage,
    showPeerAvatar = false,
    chatType,
    groupCreatorId,
    currentUserId,
}: ChatMessageListProps) {
    const [mentorSubStatus, setMentorSubStatus] = useState<{
        active: boolean;
        expired: boolean;
        hadSubscription?: boolean;
    } | null>(null);

    useEffect(() => {
        if (chatType !== 'group' || !groupCreatorId || !currentUserId) {
            setMentorSubStatus(null);
            return;
        }
        if (String(groupCreatorId) === String(currentUserId)) {
            setMentorSubStatus({ active: true, expired: false, hadSubscription: true });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch(
                    `/api/wallet/subscription-status?mentorId=${encodeURIComponent(String(groupCreatorId))}`
                );
                if (!res.ok || cancelled) return;
                const data = await res.json();
                setMentorSubStatus({
                    active: !!data.active,
                    expired: !!data.expired,
                    hadSubscription: !!data.hadSubscription,
                });
            } catch {
                if (!cancelled) setMentorSubStatus(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [chatType, groupCreatorId, currentUserId]);

    const songPlaylist = useMemo<SongTrack[]>(() => {
        return filteredMessages.flatMap((m) => {
            const meta = m.metadata && typeof m.metadata === 'object' ? m.metadata : {};
            const kind = classifyTelegramMessage({
                type: m.type,
                mime: typeof (meta as any).mimetype === 'string' ? (meta as any).mimetype : '',
                filename: `${(meta as any).name || ''} ${(meta as any).file_name || ''} ${m.text || ''}`,
            });
            if (kind !== 'song') return [];
            const url = resolveChatMediaUrl(m.text || '');
            if (!url) return [];
            const rawName = String((meta as any).name || (meta as any).file_name || m.text.split('/').pop() || 'Audio');
            const title = rawName.replace(/\.[^.]+$/, '') || rawName;
            return [{ id: m.id, url, title }];
        });
    }, [filteredMessages]);

    const expiredPanelInviteIds = useMemo(
        () => computeExpiredPanelInviteIds(filteredMessages),
        [filteredMessages]
    );

    const dragRef = useRef<{
        active: boolean;
        anchorId: string | null;
        startY: number;
    }>({ active: false, anchorId: null, startY: 0 });

    const getMsgIdFromEl = useCallback((el: EventTarget | null): string | null => {
        let node = el as HTMLElement | null;
        while (node) {
            if (node.id?.startsWith('msg-')) return node.id.replace('msg-', '');
            node = node.parentElement;
        }
        return null;
    }, []);

    const getMsgIdFromPoint = useCallback((x: number, y: number): string | null => {
        for (const el of document.elementsFromPoint(x, y)) {
            let node: HTMLElement | null = el as HTMLElement;
            while (node) {
                if (node.id?.startsWith('msg-')) return node.id.replace('msg-', '');
                node = node.parentElement;
            }
        }
        return null;
    }, []);

    const computeRangeIds = useCallback((fromId: string, toId: string): string[] => {
        const allIds = renderedMessages.map(m => m.id);
        const a = allIds.indexOf(fromId);
        const b = allIds.indexOf(toId);
        if (a === -1 || b === -1) return [fromId];
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        return allIds.slice(lo, hi + 1);
    }, [renderedMessages]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        if (isSelecting) return;
        const msgId = getMsgIdFromEl(e.target);
        if (!msgId) return;
        dragRef.current = { active: false, anchorId: msgId, startY: e.clientY };
    }, [isSelecting, getMsgIdFromEl]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const dr = dragRef.current;
        if (!dr.anchorId) return;

        if (!dr.active) {
            if (Math.abs(e.clientY - dr.startY) > 10) {
                dr.active = true;
                onStartSelecting?.();
                setSelectedMessageIds?.([dr.anchorId]);
            }
            return;
        }

        const hoverId = getMsgIdFromPoint(e.clientX, e.clientY);
        if (!hoverId || !dr.anchorId) return;
        const rangeIds = computeRangeIds(dr.anchorId, hoverId);
        setSelectedMessageIds?.(rangeIds);
    }, [onStartSelecting, setSelectedMessageIds, getMsgIdFromPoint, computeRangeIds]);

    const handleMouseUp = useCallback(() => {
        dragRef.current = { active: false, anchorId: null, startY: 0 };
    }, []);

    useEffect(() => {
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseUp]);

    return (
            <div
                ref={messagesScrollRef}
                className={`relative z-10 tg-chat-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-2 lg:px-4 space-y-0 custom-scrollbar ${isDragging ? 'bg-blue-500/10' : ''}`}
                onScroll={handleMessagesScroll}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
            >
                <div className="tg-chat-column tg-chat-bubbles-inner">
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
                                <div className="flex items-center justify-center my-3">
                                    <div className="rounded-full bg-black/35 px-2.5 py-1 text-[13px] text-white">
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
                                            scrollToBottom('auto');
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
                                    onEdit={handleEditMessage}
                                    onPin={handlePinMessage}
                                    isContinuation={isContinuation}
                                    onReplyClick={handleReplyClick}
                                    activeAudioId={activeAudioId}
                                    onAudioPlay={setActiveAudioId}
                                    songPlaylist={songPlaylist}
                                    showPeerAvatar={showPeerAvatar}
                                    inviteJoinExpired={expiredPanelInviteIds.has(String(msg.id))}
                                    chatType={chatType}
                                    groupCreatorId={groupCreatorId}
                                    currentUserId={currentUserId}
                                    mentorSubStatus={mentorSubStatus}
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
                            className="pointer-events-auto relative flex h-10 w-10 items-center justify-center rounded-full bg-[#212121] text-white shadow-[0_1px_8px_rgba(0,0,0,0.35)]"
                            aria-label={t('new_messages')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#8774e1] text-[11px] font-semibold leading-[18px] text-center">
                                {newMessagesWhileUp > 99 ? '99+' : newMessagesWhileUp}
                            </span>
                        </button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            </div>

    );
}

export default ChatMessageList;
