'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { ChatRoom } from '@/types/chat-room';

import { canShowChatCalls } from '@/lib/chat-calls';

export type ChatWindowHeaderProps = {
    chat: ChatRoom;
    displayName: string;
    isTrade: boolean;
    isOnlineHeader: boolean;
    isSomeoneTyping?: boolean;
    lastSeenLabel?: string;
    chatMuted?: boolean;
    inputFocused: boolean;
    debugError: string | null;
    isSelecting: boolean;
    selectedCount: number;
    headerImageError: boolean;
    onHeaderImageError: () => void;
    showSearch: boolean;
    searchQuery: string;
    searchType: 'all' | 'text' | 'media' | 'files';
    searchDateFrom: string;
    searchDateTo: string;
    showMoreMenu: boolean;
    isSummarizing: boolean;
    onBack?: () => void;
    onToggleInfo?: () => void;
    onCancelSelecting: () => void;
    onDeleteSelected: () => void;
    onCopySelected?: () => void;
    onForwardSelected?: () => void;
    onSearchQueryChange: (v: string) => void;
    onSearchTypeChange: (v: 'all' | 'text' | 'media' | 'files') => void;
    onSearchDateFromChange: (v: string) => void;
    onSearchDateToChange: (v: string) => void;
    onToggleSearch: () => void;
    onStartAudioCall: () => void;
    onStartVideoCall: () => void;
    onToggleMoreMenu: () => void;
    onCloseMoreMenu: () => void;
    onStartSelecting: () => void;
    onSummarize: () => void;
    onExportHistory: () => void;
    onClearHistory: () => void;
    onDeleteChat: () => void;
    onToggleMute?: () => void;
};

const iconBtn =
    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#aaaaaa] transition-colors hover:bg-white/[0.08] hover:text-white';

export function ChatWindowHeader({
    chat,
    displayName,
    isTrade,
    isOnlineHeader,
    isSomeoneTyping = false,
    lastSeenLabel,
    chatMuted = false,
    debugError,
    isSelecting,
    selectedCount,
    headerImageError,
    onHeaderImageError,
    showSearch,
    searchQuery,
    searchType,
    searchDateFrom,
    searchDateTo,
    showMoreMenu,
    isSummarizing,
    onBack,
    onToggleInfo,
    onCancelSelecting,
    onDeleteSelected,
    onCopySelected,
    onForwardSelected,
    onSearchQueryChange,
    onSearchTypeChange,
    onSearchDateFromChange,
    onSearchDateToChange,
    onToggleSearch,
    onStartAudioCall,
    onStartVideoCall,
    onToggleMoreMenu,
    onCloseMoreMenu,
    onStartSelecting,
    onSummarize,
    onExportHistory,
    onClearHistory,
    onDeleteChat,
    onToggleMute,
}: ChatWindowHeaderProps) {
    const { t } = useLanguage();

    const statusSubtitle = (() => {
        if ((chat as any).is_saved_messages) return '';
        if (isTrade) return t('trade_dialog');
        if (chat.type === 'group') {
            return `${(chat as any).participantsCount ?? (chat as any).participants?.length ?? ''} ${t('members') || "a'zo"}`;
        }
        if (chat.type === 'channel') {
            return `${(chat as any).participantsCount ?? (chat as any).participants?.length ?? ''} ${t('subscribers') || 'obunachi'}`;
        }
        if (isSomeoneTyping) return `${t('typing')}...`;
        if (isOnlineHeader) return t('online');
        return lastSeenLabel || t('last_seen_recent');
    })();

    const statusColor =
        !isTrade && (isSomeoneTyping || isOnlineHeader) ? 'var(--tg-accent)' : 'var(--tg-secondary)';

    return (
        <header className="relative z-20 flex h-12 w-full shrink-0 items-center rounded-[24px] bg-[#212121] px-1.5 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
            {debugError && (
                <div className="absolute left-0 right-0 top-full bg-red-500/80 p-1 text-center text-[10px] text-white">
                    {debugError}
                </div>
            )}
            {isSelecting ? (
                <div className="flex w-full items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onCancelSelecting} className={iconBtn} aria-label="Close">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <span className="text-[16px] font-medium text-white">{selectedCount}</span>
                    </div>
                    {selectedCount > 0 && (
                        <div className="flex items-center">
                            {onCopySelected && (
                                <button type="button" onClick={onCopySelected} className={iconBtn} title={t('copy_text') as string}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                            )}
                            {onForwardSelected && (
                                <button type="button" onClick={onForwardSelected} className={iconBtn} title={t('forward') as string}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7-7 7M21 12H3" /></svg>
                                </button>
                            )}
                            <button type="button" onClick={onDeleteSelected} className={`${iconBtn} text-red-400 hover:text-red-300`} title={t('delete') as string}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            ) : showSearch ? (
                <div className="flex w-full min-w-0 items-center gap-1 px-0.5">
                    <button type="button" onClick={onToggleSearch} className={iconBtn} aria-label="Close search">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <input
                        autoFocus
                        className="h-9 min-w-0 flex-1 rounded-full bg-[#181818] px-3 text-[14px] text-white outline-none"
                        placeholder={t('search_messages') as string}
                        value={searchQuery}
                        onChange={(e) => onSearchQueryChange(e.target.value)}
                    />
                    <select
                        className="hidden h-9 max-w-[7.5rem] shrink-0 rounded-full bg-[#181818] px-2 text-[12px] text-white outline-none sm:block"
                        value={searchType}
                        onChange={(e) =>
                            onSearchTypeChange(e.target.value as 'all' | 'text' | 'media' | 'files')
                        }
                    >
                        <option value="all">{t('all')}</option>
                        <option value="text">Text</option>
                        <option value="media">{t('image')}/{t('video')}</option>
                        <option value="files">{t('file')}</option>
                    </select>
                    <input
                        type="date"
                        className="hidden h-9 max-w-[7.5rem] shrink-0 rounded-full bg-[#181818] px-1 text-[11px] text-white outline-none md:block"
                        value={searchDateFrom}
                        onChange={(e) => onSearchDateFromChange(e.target.value)}
                        title={t('start_date') as string}
                    />
                    <input
                        type="date"
                        className="hidden h-9 max-w-[7.5rem] shrink-0 rounded-full bg-[#181818] px-1 text-[11px] text-white outline-none md:block"
                        value={searchDateTo}
                        onChange={(e) => onSearchDateToChange(e.target.value)}
                        title={t('end_date') as string}
                    />
                </div>
            ) : (
                <>
                    {onBack && (
                        <button type="button" onClick={onBack} className={`${iconBtn} lg:hidden`} aria-label="Back">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2.5 px-1 text-left"
                        onClick={onToggleInfo}
                    >
                        <div className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-full text-[15px] font-medium text-white ${
                            (chat as any).is_saved_messages ? 'bg-[#2AABEE]' : isTrade ? 'bg-[#5cc85e]' : 'bg-[#8774e1]'
                        }`}>
                            {(() => {
                                if ((chat as any).is_saved_messages || chat.avatar === 'saved_messages') {
                                    return (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden>
                                            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                                        </svg>
                                    );
                                }
                                const avatar = chat.avatar || chat.avatar_url || chat.otherUser?.avatar || chat.otherUser?.avatar_url;
                                if (avatar && avatar !== 'null' && avatar !== '' && avatar !== 'use_initials' && !headerImageError) {
                                    const src = avatar.startsWith('http') || avatar.startsWith('data:')
                                        ? avatar
                                        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
                                    return <img src={src} className="h-full w-full object-cover" onError={() => onHeaderImageError()} alt="" />;
                                }
                                return displayName ? displayName[0].toUpperCase() : '?';
                            })()}
                        </div>
                        <div className="min-w-0">
                            <h3 className="truncate text-[16px] font-medium leading-6 text-white">
                                {(chat as any).is_saved_messages ? t('saved_messages') : displayName}
                            </h3>
                            {statusSubtitle ? (
                            <p className="truncate text-[14px] leading-5" style={{ color: statusColor }}>
                                {statusSubtitle}
                            </p>
                            ) : null}
                        </div>
                    </button>

                    <div className="flex shrink-0 items-center">
                        <button type="button" onClick={() => onToggleSearch()} className={iconBtn} title="Qidiruv">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </button>
                        {canShowChatCalls(chat) && (
                            <>
                                <button type="button" onClick={onStartAudioCall} className={iconBtn} title="Ovozli chaqiruv">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                </button>
                                <button type="button" onClick={onStartVideoCall} className={iconBtn} title="Videochaqiruv">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                </button>
                            </>
                        )}
                        <div className="relative">
                            <button type="button" onClick={() => onToggleMoreMenu()} className={iconBtn}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                            </button>
                            {showMoreMenu && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => onCloseMoreMenu()} />
                                    <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl bg-[#212121] py-1 shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
                                        <button type="button" onClick={() => { onStartSelecting(); onCloseMoreMenu(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-white hover:bg-white/[0.08]">
                                            <span>{t('select_messages')}</span>
                                        </button>
                                        {onToggleMute && (
                                            <button type="button" onClick={() => { onToggleMute(); onCloseMoreMenu(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-white hover:bg-white/[0.08]">
                                                <span>{chatMuted ? t('unmute_chat') : t('mute_chat')}</span>
                                            </button>
                                        )}
                                        <button type="button" onClick={() => { onSummarize(); onCloseMoreMenu(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-white hover:bg-white/[0.08]">
                                            <span>{isSummarizing ? t('translating') : t('ai_summary')}</span>
                                        </button>
                                        <button type="button" onClick={() => { onToggleInfo?.(); onCloseMoreMenu(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-white hover:bg-white/[0.08]">
                                            <span>{t('show_profile')}</span>
                                        </button>
                                        <button type="button" onClick={() => { onExportHistory(); onCloseMoreMenu(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-white hover:bg-white/[0.08]">
                                            <span>{t('export_history')}</span>
                                        </button>
                                        <button type="button" onClick={() => { onClearHistory(); onCloseMoreMenu(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-white hover:bg-white/[0.08]">
                                            <span>{t('clear_history')}</span>
                                        </button>
                                        <button type="button" onClick={() => { onDeleteChat(); onCloseMoreMenu(); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-[15px] text-red-400 hover:bg-white/[0.08]">
                                            <span>{t('delete_chat')}</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </header>
    );
}

export default ChatWindowHeader;
