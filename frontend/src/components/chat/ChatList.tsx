
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isExpertListingChat, getMurojaatSidebarSections, isListingMarketplacePrivateChat, isClientSideListingChat } from '@/lib/listing-chat';
import { useLanguage } from '@/context/LanguageContext';
import { useHorizontalNavWheel } from '@/hooks/useHorizontalNavWheel';
import { Search, Menu, X, Bookmark } from 'lucide-react';
import { getExpertPanelMode } from '@/lib/expert-roles';
import ComposeFabMenu from './ComposeFabMenu';
import ChatListContextMenu, { type ChatListContextAction } from './ChatListContextMenu';
import ChatPreviewPopover from './ChatPreviewPopover';
import { useChatListPrefs } from '@/hooks/useChatListPrefs';
import { apiFetch } from '@/lib/api';
import { syncChatPrefToServer } from '@/lib/chat-list-prefs';
import { formatDialogPreview, withDialogSenderPrefix } from '@/lib/dialog-preview';
import { MessageDeliveryTicks } from './MessageDeliveryTicks';
import { useChatDraftsMap } from '@/lib/chat-draft-store';
import { useChatTypingMap } from '@/lib/chat-typing-store';

/** Telegram folders: chat types only. Wallet/experts/finance live in the hamburger menu. */
export const CHAT_FOLDERS = [
    { id: 'all', label: 'all' },
    { id: 'user', label: 'personal' },
    { id: 'group', label: 'groups' },
    { id: 'channel', label: 'channels' },
] as const;

export const CHAT_FOLDER_IDS = new Set<string>([...CHAT_FOLDERS.map((f) => f.id), 'listings']);

/** @deprecated same as CHAT_FOLDERS */
export const CATEGORIES = CHAT_FOLDERS;

interface ChatListProps {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    onChatSelect?: (chat: any) => void;
    onExpertSelect?: (expert: any) => void;
    isMobile?: boolean;
    className?: string;
    hideHeader?: boolean;
    hideCategories?: boolean;
    showMenu: boolean;
    setShowMenu: (show: boolean) => void;
    showContactModal: boolean;
    setShowContactModal: (show: boolean) => void;
    showGroupModal: boolean;
    setShowGroupModal: (show: boolean) => void;
    showCreateChannelModal: boolean;
    setShowCreateChannelModal: (show: boolean) => void;
    showContactsModal: boolean;
    setShowContactsModal: (show: boolean) => void;
    currentUser: any;
    chats: any[];
    contacts: any[];
    loading: boolean;
    handleAddContact: (user: any) => void;
    handleSupport: () => void;
    handleDeleteContact: (id: string) => void;
    onDeleteChat?: (chat: any) => void;
    onMarkAsRead?: (chatId: string) => void;
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchResults: any[];
    isSearching: boolean;
    isExpertMode?: boolean;
    onToggleExpertMode?: () => void;
    showNotifications?: boolean;
    setShowNotifications?: (show: boolean) => void;
    unreadCount?: number;
    selectedChatId?: string | number | null;
}

export default function ChatList({
    activeCategory = 'all',
    onCategoryChange,
    onChatSelect,
    isMobile = false,
    className,
    hideHeader = false,
    hideCategories = false,
    showMenu,
    setShowMenu,
    setShowContactModal,
    setShowGroupModal,
    setShowCreateChannelModal,
    setShowContactsModal,
    currentUser,
    chats,
    contacts,
    loading,
    handleAddContact,
    onDeleteChat,
    onMarkAsRead,
    searchQuery,
    onSearchChange,
    searchResults,
    isSearching,
    selectedChatId = null,
}: ChatListProps) {
    const { language, t } = useLanguage();
    const { prefOf, togglePinned, toggleMuted, toggleArchived, setUnreadMarked } = useChatListPrefs();
    const drafts = useChatDraftsMap();
    const typingMap = useChatTypingMap();
    const [menu, setMenu] = useState<{ chat: any; x: number; y: number } | null>(null);
    const [preview, setPreview] = useState<{ chat: any; x: number; y: number } | null>(null);
    const [viewingArchive, setViewingArchive] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const longPressRef = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number }>({
        timer: null,
        x: 0,
        y: 0,
    });
    const youLabel = language === 'uz' ? 'Siz' : language === 'ru' ? 'Вы' : 'You';
    const searchActive = searchFocused || !!searchQuery.trim();

    const exitSearch = () => {
        onSearchChange('');
        setSearchFocused(false);
        searchInputRef.current?.blur();
    };

    useEffect(() => {
        if (!searchActive) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            if (searchQuery.trim()) {
                onSearchChange('');
                searchInputRef.current?.focus();
            } else {
                onSearchChange('');
                setSearchFocused(false);
                searchInputRef.current?.blur();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [searchActive, searchQuery, onSearchChange]);

    const clearLongPress = () => {
        if (longPressRef.current.timer) {
            clearTimeout(longPressRef.current.timer);
            longPressRef.current.timer = null;
        }
    };

    const compareChatRows = (a: any, b: any) => {
        const pa = prefOf(a.id ?? a._id);
        const pb = prefOf(b.id ?? b._id);
        const aPin = pa.pinned ? (pa.pinnedAt || 1) : 0;
        const bPin = pb.pinned ? (pb.pinnedAt || 1) : 0;
        if (bPin !== aPin) return bPin - aPin;
        const ta = new Date(a.lastMessageAt || 0).getTime();
        const tb = new Date(b.lastMessageAt || 0).getTime();
        return tb - ta;
    };

    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const categoryNavRef = useRef<HTMLDivElement | null>(null);
    useHorizontalNavWheel(categoryNavRef, true);

    const handleCategoryChange = (catId: string) => {
        setViewingArchive(false);
        if (onCategoryChange) onCategoryChange(catId);
    };

    const useCategoryPager = isMobile && !searchActive && CHAT_FOLDERS.some((f) => f.id === activeCategory);

    const prevCategoryIdRef = useRef(activeCategory);
    const prevIdx = CHAT_FOLDERS.findIndex((c) => c.id === prevCategoryIdRef.current);
    const currIdx = CHAT_FOLDERS.findIndex((c) => c.id === activeCategory);
    const categoryListTransitionClass =
        !useCategoryPager &&
        prevCategoryIdRef.current !== activeCategory &&
        prevIdx >= 0 &&
        currIdx >= 0
            ? currIdx > prevIdx
                ? 'chat-list-category-transition-next'
                : 'chat-list-category-transition-prev'
            : '';

    useLayoutEffect(() => {
        prevCategoryIdRef.current = activeCategory;
    }, [activeCategory]);

    const categoryPagerRef = useRef<HTMLDivElement | null>(null);
    const programmaticPagerScrollRef = useRef(false);
    const pagerScrollRaf = useRef<number | null>(null);
    const activeCategoryRef = useRef(activeCategory);
    useLayoutEffect(() => {
        activeCategoryRef.current = activeCategory;
    }, [activeCategory]);

    const handlePagerScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        const w = el.clientWidth;
        if (w <= 0) return;
        if (programmaticPagerScrollRef.current) return;
        if (pagerScrollRaf.current != null) cancelAnimationFrame(pagerScrollRaf.current);
        pagerScrollRaf.current = requestAnimationFrame(() => {
            pagerScrollRaf.current = null;
            const idx = Math.round(el.scrollLeft / w);
            const nextCat = CHAT_FOLDERS[idx]?.id;
            if (nextCat && nextCat !== activeCategoryRef.current) {
                activeCategoryRef.current = nextCat;
                handleCategoryChange(nextCat);
            }
        });
    };

    useLayoutEffect(() => {
        if (!useCategoryPager || !categoryPagerRef.current) return;
        const el = categoryPagerRef.current;
        const idx = CHAT_FOLDERS.findIndex((c) => c.id === activeCategory);
        if (idx < 0) return;
        const run = () => {
            const w = el.clientWidth;
            if (w <= 0) return;
            const target = idx * w;
            if (Math.abs(el.scrollLeft - target) < 6) return;
            programmaticPagerScrollRef.current = true;
            el.scrollTo({ left: target, behavior: 'auto' });
            requestAnimationFrame(() => {
                programmaticPagerScrollRef.current = false;
            });
        };
        requestAnimationFrame(run);
    }, [activeCategory, useCategoryPager]);

    useLayoutEffect(() => {
        if (!useCategoryPager) return;
        const el = categoryPagerRef.current;
        if (!el) return;

        const SNAP_EPS = 4;
        const DEBOUNCE_MS = 90;

        const snapToNearest = () => {
            if (programmaticPagerScrollRef.current) return;
            const w = el.clientWidth;
            if (w <= 0) return;
            const maxIdx = CHAT_FOLDERS.length - 1;
            let idx = Math.round(el.scrollLeft / w);
            idx = Math.max(0, Math.min(maxIdx, idx));
            const target = Math.round(idx * w);
            if (Math.abs(el.scrollLeft - target) <= SNAP_EPS) return;
            programmaticPagerScrollRef.current = true;
            el.scrollTo({ left: target, behavior: 'auto' });
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    programmaticPagerScrollRef.current = false;
                });
            });
        };

        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleSnapAfterIdle = () => {
            if (programmaticPagerScrollRef.current) return;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                debounceTimer = null;
                snapToNearest();
            }, DEBOUNCE_MS);
        };

        const onScrollEnd = () => snapToNearest();

        el.addEventListener('scrollend', onScrollEnd);
        el.addEventListener('scroll', scheduleSnapAfterIdle, { passive: true });

        return () => {
            el.removeEventListener('scrollend', onScrollEnd);
            el.removeEventListener('scroll', scheduleSnapAfterIdle);
            if (debounceTimer) clearTimeout(debounceTimer);
        };
    }, [useCategoryPager]);

    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (useCategoryPager) return;
        if (touchStartX.current === null || touchStartY.current === null) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX.current;
        const dy = touch.clientY - touchStartY.current;
        touchStartX.current = null;
        touchStartY.current = null;

        const minDx = 72;
        if (Math.abs(dx) < minDx || Math.abs(dx) < Math.abs(dy) * 1.75) return;

        const currentIndex = CHAT_FOLDERS.findIndex((c) => c.id === activeCategory);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (dx < 0) nextIndex = Math.min(CHAT_FOLDERS.length - 1, currentIndex + 1);
        else if (dx > 0) nextIndex = Math.max(0, currentIndex - 1);
        if (nextIndex !== currentIndex) {
            handleCategoryChange(CHAT_FOLDERS[nextIndex].id);
        }
    };

    const matchesFolder = (chat: any, catId: string) => {
        if (catId === 'all') return true;
        if (catId === 'listings') return isExpertListingChat(chat);
        if (catId === 'user') {
            // Oddiy private + mijozning o‘z murojaatlari (e'lon chatlari Userlar’da ham ko‘rinsin)
            if (!(chat.type === 'private' || !chat.type)) return false;
            if (!isListingMarketplacePrivateChat(chat)) return true;
            return isClientSideListingChat(chat, currentUser?.id);
        }
        return chat.type === catId;
    };

    const getFilteredChatsForCategory = (catId: string) => {
        if (searchQuery) return searchResults;
        if (catId === 'contacts') return contacts;
        let list = (chats || []).filter((chat: any) => matchesFolder(chat, catId));
        if (!searchQuery && catId === 'all') {
            // Barchasi: e'lon chatlari faqat yuqoridagi Murojaat bo‘limlarida
            list = list.filter((chat: any) => !isListingMarketplacePrivateChat(chat));
        }
        const visible = list.filter((chat: any) => {
            const archived = !!prefOf(chat.id ?? chat._id).archived;
            return viewingArchive ? archived : !archived;
        });
        return [...visible].sort(compareChatRows);
    };

    const archivedCount = (chats || []).filter((c: any) => prefOf(c.id ?? c._id).archived).length;
    const archivedUnread = (chats || [])
        .filter((c: any) => prefOf(c.id ?? c._id).archived)
        .reduce((acc: number, c: any) => acc + (c.unread || 0) + (prefOf(c.id ?? c._id).unreadMarked ? 1 : 0), 0);

    const getCategoryUnreadInfo = (catId: string) => {
        let unmuted = 0;
        let mutedOnly = 0;
        for (const chat of chats || []) {
            if (!matchesFolder(chat, catId)) continue;
            if (prefOf(chat.id ?? chat._id).archived) continue;
            if (catId === 'all' && isListingMarketplacePrivateChat(chat)) continue;
            const unread = chat.unread || 0;
            const marked = prefOf(chat.id ?? chat._id).unreadMarked && unread === 0 ? 1 : 0;
            const total = unread + marked;
            if (total <= 0) continue;
            if (prefOf(chat.id ?? chat._id).muted) mutedOnly += total;
            else unmuted += total;
        }
        return { unmuted, mutedOnly, total: unmuted + mutedOnly };
    };

    const sortSidebarList = (list: any[]) => [...list].sort(compareChatRows);

    const murojaatSections = useMemo(() => {
        if (searchQuery || viewingArchive) {
            return {
                expertInbox: [] as any[],
                applicantMurojaat: [] as any[],
                employerApplications: [] as any[],
                applicantJobs: [] as any[],
            };
        }
        const raw = getMurojaatSidebarSections(chats || [], currentUser?.id);
        const filterVisible = (list: any[]) =>
            sortSidebarList(
                list.filter((chat: any) => !prefOf(chat.id ?? chat._id).archived)
            );
        return {
            expertInbox: filterVisible(raw.expertInbox),
            applicantMurojaat: filterVisible(raw.applicantMurojaat),
            employerApplications: filterVisible(raw.employerApplications),
            applicantJobs: filterVisible(raw.applicantJobs),
        };
    }, [chats, currentUser?.id, searchQuery, viewingArchive, prefOf]);

    const renderCategoryFeed = (slideCatId: string): React.ReactNode => {
        const fc = getFilteredChatsForCategory(slideCatId);

        const renderChatItem = (chat: any, index: number) => {
            const myId = currentUser?.id;
            const isTrade = chat.isTrade;
            const rowId = String(chat.id ?? chat._id ?? `row-${slideCatId}-${index}`);
            const isActive = selectedChatId != null && String(selectedChatId) === String(chat.id ?? chat._id);
            const pref = prefOf(chat.id ?? chat._id);
            const showUnread = (chat.unread > 0) || pref.unreadMarked;
            const isUsernameSearchResult =
                searchQuery &&
                (chat.searchSource === 'global' || chat.isGlobal) &&
                (chat.username || chat.message === 'Foydalanuvchi nomi');
            let displayName = isUsernameSearchResult ? `@${chat.username}` : chat.name;
            if (chat.is_saved_messages) {
                displayName = t('saved_messages');
            }
            const isLiveSessionPreview =
                (chat.message?.includes('darsni boshladi') || chat.message?.includes('sessiyasini boshladi')) &&
                !chat.message?.startsWith('🚀');
            let subtitle = isTrade
                ? language === 'uz'
                    ? 'Savdo muloqoti'
                    : language === 'ru'
                      ? 'Торговый диалог'
                      : 'Trade dialog'
                : isLiveSessionPreview
                  ? chat.message
                  : formatDialogPreview({
                        type: chat.lastMessageType,
                        content: chat.message,
                        metadata: chat.lastMessageMeta || chat.metadata,
                        encrypted:
                            typeof chat.message === 'string' &&
                            (chat.message.includes('Shifrlangan') || chat.message.includes('🔒')),
                    }) ||
                    chat.message ||
                    t('no_messages');
            if (typeof subtitle === 'string') {
                subtitle = subtitle.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^\s+|\s+$/g, '');
            }
            if (!isTrade && !isLiveSessionPreview && !isUsernameSearchResult && typeof subtitle === 'string') {
                const fromMe =
                    chat.lastSenderId != null &&
                    currentUser?.id != null &&
                    String(chat.lastSenderId) === String(currentUser.id);
                subtitle = withDialogSenderPrefix(subtitle, {
                    fromMe,
                    senderName: chat.lastSenderName,
                    isGroupOrChannel: chat.type === 'group' || chat.type === 'channel',
                    youLabel,
                });
            }
            const draftText = !searchQuery ? (drafts[String(chat.id ?? chat._id)] || '').trim() : '';
            const isPeerTyping = !searchQuery && !!typingMap[String(chat.id ?? chat._id)];
            let subtitleNode: React.ReactNode = subtitle;
            if (isPeerTyping) {
                subtitleNode = (
                    <span className="text-[#8774e1]">{t('typing')}...</span>
                );
            } else if (draftText) {
                const draftLabel = language === 'uz' ? 'Qoralama' : language === 'ru' ? 'Черновик' : 'Draft';
                subtitleNode = (
                    <>
                        <span className="text-[#e53935]">{draftLabel}: </span>
                        <span>{draftText}</span>
                    </>
                );
            }
            if (isUsernameSearchResult) subtitle = t('username');
            if (isUsernameSearchResult) subtitleNode = t('username');
            if (isTrade) {
                displayName =
                    chat.participants?.indexOf(myId) === 0
                        ? language === 'uz'
                            ? 'Xaridor'
                            : language === 'ru'
                              ? 'Покупатель'
                              : 'Buyer'
                        : language === 'uz'
                          ? 'Sotuvchi'
                          : language === 'ru'
                            ? 'Продавец'
                            : 'Seller';
            }

            return (
                <button
                    type="button"
                    key={rowId}
                    onClick={() =>
                        chat.searchSource === 'global' ||
                        chat.searchSource === 'contact' ||
                        chat.isGlobal ||
                        chat.type === 'contact'
                            ? handleAddContact(chat)
                            : onChatSelect && onChatSelect(chat)
                    }
                    onContextMenu={(e) => {
                        if (
                            chat.searchSource === 'global' ||
                            chat.searchSource === 'contact' ||
                            chat.isGlobal ||
                            chat.type === 'contact'
                        ) {
                            return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        setPreview(null);
                        setMenu({ chat, x: e.clientX, y: e.clientY });
                    }}
                    onTouchStart={(e) => {
                        if (
                            chat.searchSource === 'global' ||
                            chat.searchSource === 'contact' ||
                            chat.isGlobal ||
                            chat.type === 'contact'
                        ) {
                            return;
                        }
                        const touch = e.touches[0];
                        if (!touch) return;
                        clearLongPress();
                        longPressRef.current.x = touch.clientX;
                        longPressRef.current.y = touch.clientY;
                        longPressRef.current.timer = setTimeout(() => {
                            longPressRef.current.timer = null;
                            setPreview(null);
                            setMenu({
                                chat,
                                x: longPressRef.current.x,
                                y: longPressRef.current.y,
                            });
                        }, 480);
                    }}
                    onTouchMove={clearLongPress}
                    onTouchEnd={clearLongPress}
                    onTouchCancel={clearLongPress}
                    className={`tg-chat-row w-full flex items-center gap-3 px-3 h-[72px] text-left border-0 ${
                        isActive || (menu && String(menu.chat.id ?? menu.chat._id) === String(chat.id ?? chat._id)) ? 'is-active' : ''
                    }`}
                >
                    <div className="relative shrink-0">
                        <div
                            className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-white font-medium text-[22px] overflow-hidden bg-[#8774e1]"
                        >
                            {(() => {
                                if (chat.is_saved_messages || chat.avatar === 'saved_messages') {
                                    return (
                                        <div className="w-full h-full flex items-center justify-center bg-[#2AABEE]">
                                            <Bookmark className="h-7 w-7 text-white" fill="currentColor" strokeWidth={0} />
                                        </div>
                                    );
                                }
                                const avatar =
                                    chat.avatar || chat.avatar_url || chat.otherUser?.avatar || chat.otherUser?.avatar_url;
                                if (avatar && avatar !== 'null' && avatar !== '' && avatar !== 'use_initials' && !isTrade) {
                                    const src =
                                        avatar.startsWith('http') || avatar.startsWith('data:')
                                            ? avatar
                                            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/${avatar}`;
                                    return (
                                        <img
                                            src={src}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).parentElement!.innerText = displayName
                                                    ? displayName.substring(0, 1).toUpperCase()
                                                    : '?';
                                            }}
                                        />
                                    );
                                }
                                return displayName ? displayName.replace(/^@/, '').substring(0, 1).toUpperCase() : '?';
                            })()}
                        </div>
                        {chat.status === 'online' && !isTrade && (
                            <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#0ac630] rounded-full border-[2px] border-[#212121]" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0 py-[8px] border-b border-white/[0.06] self-stretch flex flex-col justify-center">
                        <div className="flex justify-between items-baseline gap-2">
                            <h3 className="text-white font-medium truncate text-[15px] leading-[18px] min-w-0 flex items-center gap-1">
                                <span className="truncate">{displayName}</span>
                                {pref.muted && (
                                    <svg className="h-3.5 w-3.5 shrink-0 text-[#aaaaaa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path strokeLinecap="round" d="M4 4l16 16M10 5a4 4 0 014 4v.5M6 9v1a6 6 0 006 6" />
                                    </svg>
                                )}
                            </h3>
                            <span className="text-[12px] text-[#aaaaaa] shrink-0 tabular-nums inline-flex items-center gap-0.5">
                                {currentUser?.id != null &&
                                    chat.lastSenderId != null &&
                                    String(chat.lastSenderId) === String(currentUser.id) &&
                                    !searchQuery && (
                                        <MessageDeliveryTicks
                                            status={chat.lastMessageIsRead ? 'read' : 'sent'}
                                            tone="list"
                                        />
                                    )}
                                {chat.time}
                            </span>
                        </div>
                        <div className="flex justify-between items-center gap-2 mt-[3px]">
                            <p className="text-[14px] text-[#aaaaaa] truncate leading-[18px]">{subtitleNode}</p>
                            {showUnread ? (
                                <div className={`min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[13px] font-medium text-white px-1.5 shrink-0 ${pref.muted ? 'bg-[#3e546a]' : 'bg-[#8774e1]'}`}>
                                    {chat.unread > 0
                                        ? (chat.unread >= 1000
                                            ? `${(chat.unread / 1000).toFixed(chat.unread >= 10000 ? 0 : 1).replace(/\.0$/, '')}K`
                                            : chat.unread)
                                        : '·'}
                                </div>
                            ) : pref.pinned ? (
                                <svg className="h-4 w-4 shrink-0 text-[#aaaaaa]" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 9V4h1V2H7v2h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                                </svg>
                            ) : null}
                        </div>
                    </div>
                </button>
            );
        };

        const renderSidebarSection = (title: string, sectionChats: any[], keyPrefix: string) => {
            if (!sectionChats.length) return null;
            return (
                <div className="mb-1" key={keyPrefix}>
                    <h4 className="px-4 pt-2 pb-1 text-[13px] font-semibold text-[#8774e1] uppercase tracking-wide">
                        {title}
                    </h4>
                    {sectionChats.map((chat: any, index: number) => renderChatItem(chat, index))}
                </div>
            );
        };

        if (loading) {
            return (
                <div>
                    {Array.from({ length: 8 }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 h-[72px] animate-pulse">
                            <div className="h-[54px] w-[54px] rounded-full bg-white/10 shrink-0" />
                            <div className="flex-1 space-y-2 border-b border-white/[0.06] py-3">
                                <div className="h-3.5 w-1/2 rounded bg-white/10" />
                                <div className="h-3 w-3/4 rounded bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (fc.length > 0) {
            if (searchQuery) {
                const chatMatches = fc.filter((i: any) => i.searchSource === 'chat');
                const contactMatches = fc.filter((i: any) => i.searchSource === 'contact');
                const globalMatches = fc.filter((i: any) => i.searchSource === 'global');

                const renderSection = (title: string, items: any[]) => {
                    if (items.length === 0) return null;
                    return (
                        <div key={title} className="mb-2 first:mt-1">
                            <h4 className="px-4 py-2 text-[13px] font-medium text-[#aaaaaa]">{title}</h4>
                            <div>{items.map((chat, idx) => renderChatItem(chat, idx))}</div>
                        </div>
                    );
                };

                return (
                    <div className="pb-10">
                        {renderSection(
                            language === 'uz' ? 'Suhbatlar' : language === 'ru' ? 'Диалоги' : 'Chats',
                            chatMatches
                        )}
                        {renderSection(
                            language === 'uz' ? 'Kontaktlar' : language === 'ru' ? 'Контакты' : 'Contacts',
                            contactMatches
                        )}
                        {renderSection(
                            language === 'uz' ? 'Global qidiruv' : language === 'ru' ? 'Глобальный поиск' : 'Global Search',
                            globalMatches
                        )}
                    </div>
                );
            }

            return (
                <div>
                    {!searchQuery && !viewingArchive && archivedCount > 0 && slideCatId === 'all' && (
                        <button
                            type="button"
                            onClick={() => setViewingArchive(true)}
                            className="tg-chat-row w-full flex items-center gap-3 px-3 h-[72px] text-left"
                        >
                            <div className="w-[54px] h-[54px] rounded-full bg-[#8774e1] flex items-center justify-center shrink-0">
                                <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v3H4V7zM6 10v9h12v-9M9 14h6" />
                                </svg>
                            </div>
                            <div className="flex-1 min-w-0 py-[8px] border-b border-white/[0.06] self-stretch flex items-center justify-between">
                                <h3 className="text-white font-medium text-[15px]">{t('archived_chats')}</h3>
                                {archivedUnread > 0 && (
                                    <span className="min-w-[22px] h-[22px] rounded-full bg-[#3e546a] px-1.5 text-[13px] font-medium text-white flex items-center justify-center">
                                        {archivedUnread > 99 ? '99+' : archivedUnread}
                                    </span>
                                )}
                            </div>
                        </button>
                    )}
                    {!searchQuery &&
                        !viewingArchive &&
                        slideCatId === 'all' && (
                            <>
                                {renderSidebarSection(
                                    t('sidebar_murojaatlar' as any),
                                    murojaatSections.expertInbox,
                                    'expert-inbox'
                                )}
                                {renderSidebarSection(
                                    t('sidebar_murojaatlarim' as any),
                                    murojaatSections.applicantMurojaat,
                                    'applicant-murojaat'
                                )}
                                {renderSidebarSection(
                                    t('sidebar_arizalar' as any),
                                    murojaatSections.employerApplications,
                                    'employer-apps'
                                )}
                                {renderSidebarSection(
                                    t('sidebar_arizalarim' as any),
                                    murojaatSections.applicantJobs,
                                    'applicant-jobs'
                                )}
                            </>
                        )}
                    {fc.map((chat: any, index: number) => renderChatItem(chat, index))}
                </div>
            );
        }

        if (!searchQuery && !viewingArchive && archivedCount > 0 && slideCatId === 'all') {
            return (
                <div>
                    <button
                        type="button"
                        onClick={() => setViewingArchive(true)}
                        className="tg-chat-row w-full flex items-center gap-3 px-3 h-[72px] text-left"
                    >
                        <div className="w-[54px] h-[54px] rounded-full bg-[#8774e1] flex items-center justify-center shrink-0">
                            <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16v3H4V7zM6 10v9h12v-9M9 14h6" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0 py-[8px] border-b border-white/[0.06] self-stretch flex items-center justify-between">
                            <h3 className="text-white font-medium text-[15px]">{t('archived_chats')}</h3>
                            {archivedUnread > 0 && (
                                <span className="min-w-[22px] h-[22px] rounded-full bg-[#3e546a] px-1.5 text-[13px] font-medium text-white flex items-center justify-center">
                                    {archivedUnread > 99 ? '99+' : archivedUnread}
                                </span>
                            )}
                        </div>
                    </button>
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-40 text-[#aaaaaa] mt-16">
                <p className="text-sm">
                    {isSearching
                        ? t('loading')
                        : searchQuery
                          ? language === 'uz'
                            ? 'Hech narsa topilmadi'
                            : language === 'ru'
                              ? 'Ничего не найдено'
                              : 'Nothing found'
                          : t('no_messages')}
                </p>
            </div>
        );
    };

    const folderId = CHAT_FOLDER_IDS.has(activeCategory) ? activeCategory : 'all';

    const renderFolderTabs = () => (
        <div
            ref={categoryNavRef}
            className={`tg-folder-tabs nav-scroll-x flex flex-nowrap shrink-0 min-w-0 w-full px-1 bg-[#212121] border-b border-white/[0.06] ${
                hideCategories ? 'hidden lg:flex' : 'flex'
            }`}
        >
            {CHAT_FOLDERS.map((cat) => {
                const { unmuted, mutedOnly } = getCategoryUnreadInfo(cat.id);
                const count = unmuted > 0 ? unmuted : mutedOnly;
                const badgeMuted = unmuted === 0 && mutedOnly > 0;
                const isOn = folderId === cat.id;
                return (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(cat.id)}
                        className={`tg-folder-tab relative shrink-0 px-3.5 h-11 text-[15px] font-medium whitespace-nowrap transition-colors ${
                            isOn ? 'text-[#8774e1]' : 'text-[#aaaaaa] hover:text-white'
                        }`}
                    >
                        {t(cat.label as any)}
                        {count > 0 && (
                            <span
                                className={`ml-1.5 inline-flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full text-[11px] font-medium text-white align-middle ${
                                    badgeMuted ? 'bg-[#3e546a]' : 'bg-[#8774e1]'
                                }`}
                            >
                                {count > 99 ? '99+' : count}
                            </span>
                        )}
                        {isOn && (
                            <span className="absolute left-2 right-2 bottom-0 h-[3px] rounded-t-full bg-[#8774e1]" />
                        )}
                    </button>
                );
            })}
        </div>
    );

    const handleMenuAction = async (action: ChatListContextAction) => {
        if (!menu) return;
        const chat = menu.chat;
        const id = chat.id ?? chat._id;
        if (id == null) return;
        if (action === 'open_tab') {
            window.open(`/messages?openChat=${encodeURIComponent(String(id))}`, '_blank', 'noopener,noreferrer');
            return;
        }
        if (action === 'preview') {
            setPreview({ chat, x: menu.x, y: menu.y });
            return;
        }
        if (action === 'unread') {
            const isUnread = (chat.unread || 0) > 0 || !!prefOf(id).unreadMarked;
            if (isUnread) {
                setUnreadMarked(id, false);
                onMarkAsRead?.(String(id));
                void syncChatPrefToServer(id, { unreadMarked: false });
            } else {
                setUnreadMarked(id, true);
                void syncChatPrefToServer(id, { unreadMarked: true });
            }
            return;
        }
        if (action === 'pin') {
            const pinned = togglePinned(id);
            void syncChatPrefToServer(id, { pinned });
            return;
        }
        if (action === 'mute') {
            const muted = toggleMuted(id);
            void syncChatPrefToServer(id, { muted });
            return;
        }
        if (action === 'archive') {
            const archived = toggleArchived(id);
            void syncChatPrefToServer(id, { archived, pinned: archived ? false : undefined });
            return;
        }
        if (action === 'delete') {
            if (onDeleteChat) onDeleteChat(chat);
            else {
                try {
                    await apiFetch(`/api/chats/${id}`, { method: 'DELETE' });
                } catch {
                    /* ignore */
                }
            }
        }
    };

    return (
        <div className={`h-full min-h-0 min-w-0 flex flex-col relative overflow-hidden select-none bg-[#212121] ${className || ''}`}>
            <div
                className={`sticky top-0 z-20 min-w-0 w-full bg-[#212121] ${
                    hideHeader && hideCategories ? 'hidden lg:block' : 'block'
                }`}
            >
                <div className={`px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 gap-1 ${hideHeader ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                if (searchActive) {
                                    exitSearch();
                                    return;
                                }
                                if (viewingArchive) setViewingArchive(false);
                                else setShowMenu(!showMenu);
                            }}
                            className="w-10 h-10 shrink-0 rounded-full hover:bg-white/10 flex items-center justify-center text-[#aaaaaa] hover:text-white transition-colors"
                            aria-label={searchActive || viewingArchive ? 'Back' : 'Menu'}
                        >
                            {searchActive || viewingArchive ? (
                                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </button>
                        <div className="relative flex-1 min-w-0">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-[#aaaaaa]" />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t('search')}
                                value={searchQuery}
                                onChange={(e) => onSearchChange(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => {
                                    // keep search mode while query non-empty
                                    if (!searchQuery.trim()) setSearchFocused(false);
                                }}
                                className="w-full bg-[#181818] border-none outline-none text-[15px] text-white rounded-full py-[7px] pl-10 pr-9 placeholder-[#aaaaaa]"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSearchChange('');
                                        searchInputRef.current?.focus();
                                    }}
                                    className="absolute inset-y-0 right-3 flex items-center text-[#aaaaaa] hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    {!searchActive && renderFolderTabs()}
                </div>
            </div>

            {useCategoryPager ? (
                <div
                    ref={categoryPagerRef}
                    className="messages-category-pager [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    onScroll={handlePagerScroll}
                >
                    {CHAT_FOLDERS.map((cat) => (
                        <div
                            key={cat.id}
                            className="messages-category-pager-slide h-full min-h-0 flex flex-col overflow-hidden"
                        >
                            <div className="messages-category-feed-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-20 custom-scrollbar touch-pan-y">
                                {renderCategoryFeed(cat.id)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="messages-category-feed-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain pb-20 custom-scrollbar touch-pan-y"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div key={folderId} className={`min-h-0 ${categoryListTransitionClass}`}>
                        {renderCategoryFeed(folderId)}
                    </div>
                </div>
            )}

            {!searchActive && !viewingArchive && (
                <ComposeFabMenu
                    canCreateGroup={!currentUser?.is_expert || getExpertPanelMode(currentUser) === 'mentor'}
                    onNewChannel={() => setShowCreateChannelModal(true)}
                    onNewGroup={() => setShowGroupModal(true)}
                    onNewPrivateChat={() => setShowContactsModal(true)}
                />
            )}

            {menu && (
                <ChatListContextMenu
                    x={menu.x}
                    y={menu.y}
                    pref={prefOf(menu.chat.id ?? menu.chat._id)}
                    unreadCount={Number(menu.chat.unread) || 0}
                    labels={{
                        open_tab: t('open_in_new_tab'),
                        preview: t('chat_preview'),
                        mark_unread: t('mark_as_unread'),
                        mark_read: t('mark_as_read'),
                        pin: t('pin_chat'),
                        unpin: t('unpin_chat'),
                        mute: t('mute_chat'),
                        unmute: t('unmute_chat'),
                        archive: t('archive_chat'),
                        unarchive: t('unarchive_chat'),
                        delete: t('delete_chat'),
                    }}
                    onAction={handleMenuAction}
                    onClose={() => setMenu(null)}
                />
            )}
            {preview && (
                <ChatPreviewPopover
                    chat={preview.chat}
                    anchor={{ x: preview.x, y: preview.y }}
                    onOpen={() => {
                        const chat = preview.chat;
                        setPreview(null);
                        onChatSelect?.(chat);
                    }}
                    onClose={() => setPreview(null)}
                />
            )}
        </div>
    );
}
