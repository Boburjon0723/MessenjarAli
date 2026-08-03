'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import type { ChatRoom } from '@/types/chat-room';

const CHAT_CALLS_ALLOWED = false;

export type ChatWindowHeaderProps = {
    chat: ChatRoom;
    displayName: string;
    isTrade: boolean;
    isOnlineHeader: boolean;
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
};

export function ChatWindowHeader({
    chat,
    displayName,
    isTrade,
    isOnlineHeader,
    inputFocused,
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
}: ChatWindowHeaderProps) {
    const { t } = useLanguage();

    return (
            <header className={`flex items-center justify-between border-b border-white/10 z-20 shrink-0 backdrop-blur-xl bg-white/5 transition-all duration-200 ${inputFocused ? 'py-2 px-3 lg:py-4 lg:px-4 lg:pt-4 pt-[max(1.25rem,env(safe-area-inset-top))]' : 'p-4 lg:pt-4 pt-[max(2rem,env(safe-area-inset-top))]'}`}>
                {debugError && (
                    <div className="absolute top-full left-0 right-0 bg-red-500/80 text-white text-[10px] p-1 text-center animate-shake">
                        {debugError}
                    </div>
                )}
                {isSelecting ? (
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { onCancelSelecting(); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <span className="text-white font-medium">{selectedCount} {t('delete_messages')}</span>
                        </div>
                        {selectedCount > 0 && (
                            <button onClick={onDeleteSelected} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors flex items-center gap-2 px-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span className="text-sm font-bold hidden sm:block">{t('delete_messages')}</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="lg:hidden p-2 -ml-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all active:scale-95"
                                    aria-label="Back"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <div className="flex items-center gap-2 cursor-pointer group min-w-0 flex-1" onClick={onToggleInfo}>
                                <div className="relative flex-shrink-0">
                                    <div className={`rounded-full border-2 border-white/10 flex items-center justify-center text-white font-bold overflow-hidden transition-transform group-hover:scale-105 ${inputFocused ? 'w-8 h-8 lg:w-10 lg:h-10' : 'w-10 h-10'} ${isTrade ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                                        {(() => {
                                            const avatar = chat.avatar || chat.avatar_url || chat.otherUser?.avatar || chat.otherUser?.avatar_url;
                                            if (avatar && avatar !== 'null' && avatar !== '' && !headerImageError) {
                                                const src = avatar.startsWith('http') || avatar.startsWith('data:')
                                                    ? avatar
                                                    : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
                                                return <img src={src} className="w-full h-full object-cover" onError={() => onHeaderImageError()} alt="" />;
                                            }
                                            return displayName ? displayName[0].toUpperCase() : '?';
                                        })()}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1c20] ${isOnlineHeader ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-500'}`}></div>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold leading-tight truncate max-w-[120px] sm:max-w-[300px] group-hover:text-blue-400 transition-colors">{displayName}</h3>
                                    <p className={`text-white/40 uppercase tracking-widest font-bold ${inputFocused ? 'hidden lg:block text-[10px]' : 'text-[10px]'}`}>
                                        {isTrade ? t('trade_dialog') : (isOnlineHeader ? t('online') : t('offline'))}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                            {showSearch && (
                                <div className="hidden md:flex items-center gap-2 animate-scale-in">
                                    <input
                                        autoFocus
                                        className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white outline-none w-40"
                                        placeholder={t('search_messages') as string}
                                        value={searchQuery}
                                        onChange={e => onSearchQueryChange(e.target.value)}
                                    />
                                    <select
                                        className="bg-white/5 border border-white/10 rounded-full px-2 py-1 text-[11px] text-white outline-none"
                                        value={searchType}
                                        onChange={(e) =>
                                            onSearchTypeChange(e.target.value as 'all' | 'text' | 'media' | 'files')
                                        }
                                    >
                                        <option value="all">{t('all')}</option>
                                        <option value="text">{t('file')}</option>
                                        <option value="media">{t('image')}/{t('video')}</option>
                                        <option value="files">{t('file')}</option>
                                    </select>
                                    <input
                                        type="date"
                                        className="bg-white/5 border border-white/10 rounded-full px-2 py-1 text-[11px] text-white outline-none"
                                        value={searchDateFrom}
                                        onChange={e => onSearchDateFromChange(e.target.value)}
                                        title={t('start_date') as string}
                                    />
                                    <input
                                        type="date"
                                        className="bg-white/5 border border-white/10 rounded-full px-2 py-1 text-[11px] text-white outline-none"
                                        value={searchDateTo}
                                        onChange={e => onSearchDateToChange(e.target.value)}
                                        title={t('end_date') as string}
                                    />
                                </div>
                            )}
                            <button
                                onClick={() => onToggleSearch()}
                                className={`p-2 rounded-full transition-all ${showSearch ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                title="Qidiruv"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </button>
                            {!isTrade && CHAT_CALLS_ALLOWED && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            onStartAudioCall();
                                        }}
                                        className="p-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                                        title="Ovozli chaqiruv"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            onStartVideoCall();
                                        }}
                                        className="p-2 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors"
                                        title="Videochaqiruv"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </button>
                                </div>
                            )}
                            {!isTrade && !CHAT_CALLS_ALLOWED && (
                                <div className="hidden sm:flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                                    {t('service_session')}
                                </div>
                            )}
                            <div className="relative">
                                <button onClick={() => onToggleMoreMenu()} className={`p-2 rounded-full transition-all ${showMoreMenu ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                </button>

                                {showMoreMenu && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => onCloseMoreMenu()} />
                                        <div className="absolute top-full right-0 mt-2 w-64 glass-premium border border-white/10 rounded-2xl shadow-2xl py-2 z-40 animate-scale-in">
                                            <button onClick={() => { onStartSelecting(); onCloseMoreMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span>{t('select_messages')}</span>
                                            </button>
                                            <button onClick={() => { onSummarize(); onCloseMoreMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                {isSummarizing ? (
                                                    <svg className="h-5 w-5 animate-spin opacity-60" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                ) : (
                                                    <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                )}
                                                <span>{isSummarizing ? t('translating') : t('ai_summary')}</span>
                                            </button>
                                            <div className="h-px bg-white/5 my-1" />
                                            <button onClick={() => { onToggleInfo?.(); onCloseMoreMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                <span>{t('show_profile')}</span>
                                            </button>
                                            <button onClick={() => { onExportHistory(); onCloseMoreMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                                <span>{t('export_history')}</span>
                                            </button>
                                            <button onClick={() => { onClearHistory(); onCloseMoreMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                <span>{t('clear_history')}</span>
                                            </button>
                                            <button onClick={() => { onDeleteChat(); onCloseMoreMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
