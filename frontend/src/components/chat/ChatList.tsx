
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import {
  formatExpertPublicPrice,
  getExpertPanelMode,
  getExpertSpecialtyLine,
  getExpertListingPitch,
} from '@/lib/expert-roles';
import { isExpertListingChat } from '@/lib/listing-chat';
import { GlassCard } from '../ui/GlassCard';
import JobsPanel from '../jobs/JobsPanel';
import { useSocket } from '@/context/SocketContext';
import { useLanguage } from '@/context/LanguageContext';
import { useHorizontalNavWheel } from '@/hooks/useHorizontalNavWheel';
import WalletPanel from './WalletPanel';
import { apiFetch } from '@/lib/api';
import {
    Globe,
    User,
    Wallet,
    Users,
    Radio,
    Bot,
    LayoutGrid,
    Briefcase,
    ShieldCheck,
    LineChart,
    CircleUser,
    Megaphone,
    Phone,
    Settings,
    Moon,
    Search,
    Menu,
    Plus,
    LogOut,
    UserPlus,
    MessageCircle,
    Hash,
    Contact,
    X,
    UserCircle,
    PhoneCall,
    Bookmark,
    HelpCircle,
    Layout,
    PenSquare,
    Bell
} from 'lucide-react';

export const CATEGORIES = [
    {
        id: 'all', label: 'all', icon: <Globe className="h-6 w-6" />
    },
    {
        id: 'user', label: 'personal', icon: <User className="h-6 w-6" />
    },
    {
        id: 'wallet', label: 'wallet', icon: <Wallet className="h-6 w-6" />
    },
    {
        id: 'group', label: 'groups', icon: <Users className="h-6 w-6" />
    },
    {
        id: 'channel', label: 'channels', icon: <Radio className="h-6 w-6" />
    },
    {
        id: 'services', label: 'experts', icon: <Briefcase className="h-6 w-6" />
    },
    {
        id: 'finance', label: 'finance', icon: <LineChart className="h-6 w-6" />
    }
];

interface ChatListProps {
    activeCategory: string;
    onCategoryChange: (category: string) => void;
    onChatSelect?: (chat: any) => void;
    onExpertSelect?: (expert: any) => void;
  isMobile?: boolean;
    className?: string;
    hideHeader?: boolean;
    hideCategories?: boolean;
    // Lifted State
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
    searchQuery: string;
    onSearchChange: (q: string) => void;
    searchResults: any[];
    isSearching: boolean;
    isExpertMode?: boolean;
    onToggleExpertMode?: () => void;
    showNotifications?: boolean;
    setShowNotifications?: (show: boolean) => void;
    unreadCount?: number;
}

export default function ChatList({
    activeCategory = 'all',
    onCategoryChange,
    onChatSelect,
    onExpertSelect,
  isMobile = false,
    className,
    hideHeader = false,
    hideCategories = false,
    showMenu,
    setShowMenu,
    showContactModal,
    setShowContactModal,
    showGroupModal,
    setShowGroupModal,
    showCreateChannelModal,
    setShowCreateChannelModal,
    showContactsModal,
    setShowContactsModal,
    currentUser,
    chats,
    contacts,
    loading,
    handleAddContact,
    handleSupport,
    handleDeleteContact,
    searchQuery,
    onSearchChange,
    searchResults,
    isSearching,
    isExpertMode,
    onToggleExpertMode,
    showNotifications,
    setShowNotifications,
    unreadCount = 0,
}: ChatListProps) {
    const { language, t } = useLanguage();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Swipe navigation (mobile) between categories
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const categoryNavRef = useRef<HTMLDivElement | null>(null);
    useHorizontalNavWheel(categoryNavRef, true);

    const handleCategoryChange = (catId: string) => {
        if (onCategoryChange) onCategoryChange(catId);
    };

    /** Telegram uslubi: mobil + qidiruv yo‘q bo‘lsa gorizontal scroll-snap pager */
    const useCategoryPager = isMobile && !searchQuery.trim();

    /** Oldingi kategoriya — faqat klassik (pager emas) rejimda CSS kirish animatsiyasi */
    const prevCategoryIdRef = useRef(activeCategory);
    const prevIdx = CATEGORIES.findIndex((c) => c.id === prevCategoryIdRef.current);
    const currIdx = CATEGORIES.findIndex((c) => c.id === activeCategory);
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
            const nextCat = CATEGORIES[idx]?.id;
            if (nextCat && nextCat !== activeCategoryRef.current) {
                activeCategoryRef.current = nextCat;
                handleCategoryChange(nextCat);
            }
        });
    };

    useLayoutEffect(() => {
        if (!useCategoryPager || !categoryPagerRef.current) return;
        const el = categoryPagerRef.current;
        const idx = CATEGORIES.findIndex((c) => c.id === activeCategory);
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

    /** Snap buzilsa (iOS / nested scroll): scroll to‘xtagach eng yaqin sahifaga qotiramiz */
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
            const maxIdx = CATEGORIES.length - 1;
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

        // Only react to gorizontal, yetarli uzun swipe
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;

        const currentIndex = CATEGORIES.findIndex(c => c.id === activeCategory);
        if (currentIndex === -1) return;

        let nextIndex = currentIndex;
        if (dx < 0) {
            // Chapga swipe → keyingi kategoriya
            nextIndex = Math.min(CATEGORIES.length - 1, currentIndex + 1);
        } else if (dx > 0) {
            // O'ngga swipe → oldingi kategoriya
            nextIndex = Math.max(0, currentIndex - 1);
        }
        if (nextIndex !== currentIndex) {
            handleCategoryChange(CATEGORIES[nextIndex].id);
        }
    };

    const getFilteredChatsForCategory = (catId: string) =>
        searchQuery
            ? searchResults
            : catId === 'jobs' || catId === 'all'
              ? chats
              : catId === 'contacts'
                ? contacts
                : (chats || []).filter((chat: any) => {
                      if (catId === 'user') return chat.type === 'private' || !chat.type;
                      return chat.type === catId;
                  });

    const [expertCards, setExpertCards] = useState<any[]>([]);
    const [expertLoading, setExpertLoading] = useState(false);

    const fetchExperts = useCallback(async () => {
        try {
            setExpertLoading(true);
            const res = await apiFetch("/api/users/search?expert=true");
            if (!res.ok) return;
            const data = await res.json();
            if (Array.isArray(data)) {
                // Backend already filters by approved/pending, but we keep a loose check for safety
                setExpertCards(data);
            }
        } catch (e) {
            console.error('Failed to load experts for sidebar:', e);
        } finally {
            setExpertLoading(false);
        }
    }, []);

    /** Mobil pager: barcha slaydlar uchun bir marta */
    useEffect(() => {
        if (!isMobile) return;
        void fetchExperts();
    }, [isMobile, fetchExperts]);

    /** Desktop: faqat Xizmatlar tanlanganda */
    useEffect(() => {
        if (isMobile) return;
        if (activeCategory !== 'services') return;
        void fetchExperts();
    }, [activeCategory, isMobile, fetchExperts]);

    const getCategoryUnreadCount = (catId: string) => {
        if (catId === 'all') {
            return (chats || []).reduce((acc: number, chat: any) => acc + (chat.unread || 0), 0);
        }
        if (catId === 'jobs' || catId === 'finance' || catId === 'services' || catId === 'communities') return 0;

        return (chats || [])
            .filter((chat: any) => {
                if (catId === 'user') return chat.type === 'private' || !chat.type;
                return chat.type === catId;
            })
            .reduce((acc: number, chat: any) => acc + (chat.unread || 0), 0);
    };

    const renderCategoryFeed = (slideCatId: string): React.ReactNode => {
        const fc = getFilteredChatsForCategory(slideCatId);
        
        if (slideCatId === 'services') {
            if (expertLoading) {
                return (
                    <div className="pt-3 space-y-3">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="animate-pulse rounded-2xl border border-white/10 bg-white/5 px-3 py-3 flex items-center gap-3"
                            >
                                <div className="h-10 w-10 rounded-full bg-white/10" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/2 rounded-full bg-white/10" />
                                    <div className="h-2 w-3/4 rounded-full bg-white/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            }
            if (expertCards.length > 0) {
                return (
                    <div className="space-y-3">
                        {expertCards.map((exp, index) => {
                            const { line: priceLine } = formatExpertPublicPrice(exp, t);
                            const cardBlurb = getExpertListingPitch(exp) || getExpertSpecialtyLine(exp);
                            return (
                                <div key={exp.id || index} className="px-1">
                                    <GlassCard
                                        onClick={() => onExpertSelect && onExpertSelect(exp)}
                                        hoverEffect={true}
                                        className="flex items-center gap-3 !p-4 !bg-white/[0.06] hover:!bg-white/10 !rounded-[1.5rem] border border-emerald-500/20 transition-all active:scale-[0.98]"
                                        style={{ animationDelay: `${index * 40}ms` }}
                                    >
                                        <div className="relative">
                                            <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center text-white font-bold text-lg">
                                                {exp.avatar_url ? (
                                                    <img src={exp.avatar_url} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    (exp.name || '?').substring(0, 1).toUpperCase()
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5 gap-2">
                                                <h3 className="text-white font-medium truncate text-sm">
                                                    {exp.name} {exp.surname}
                                                </h3>
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 font-bold uppercase tracking-widest shrink-0">
                                                    {language === 'uz' ? 'Tasdiqlangan' : (language === 'ru' ? 'Подтвержден' : 'Verified')}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#00A884] font-semibold truncate">{exp.profession}</p>
                                            {cardBlurb && (
                                                <p className="text-[10px] text-white/45 line-clamp-2 mt-0.5 leading-snug whitespace-pre-wrap">
                                                    {cardBlurb}
                                                </p>
                                            )}
                                            <div className="flex justify-between items-start gap-2 mt-1.5">
                                                <span className="text-[10px] text-white/40 shrink-0">{(exp.experience_years || 0)} yil</span>
                                                <span className="text-[10px] text-emerald-300 font-bold text-right leading-tight max-w-[55%]">
                                                    {priceLine}
                                                </span>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </div>
                            );
                        })}
                    </div>
                );
            }
            return (
                <div className="flex flex-col items-center justify-center h-40 text-white/40 mt-10">
                    <p className="text-sm">{t('no_messages')}</p>
                </div>
            );
        }

        if (slideCatId === 'wallet' && isMobile) {
            return <WalletPanel onChatSelect={onChatSelect} />;
        }

        const renderChatItem = (chat: any, index: number) => {
            const myId = currentUser?.id;
            const isTrade = chat.isTrade;
            const isUsernameSearchResult =
                searchQuery &&
                (chat.searchSource === 'global' || chat.isGlobal) &&
                (chat.username || chat.message === 'Foydalanuvchi nomi');
            let displayName = isUsernameSearchResult ? `@${chat.username}` : chat.name;
            const isLiveSessionPreview =
                (chat.message?.includes('darsni boshladi') || chat.message?.includes('sessiyasini boshladi')) &&
                !chat.message?.startsWith('🚀');
            let subtitle = isTrade
                ? (language === 'uz' ? 'Savdo muloqoti' : (language === 'ru' ? 'Торговый диалог' : 'Trade dialog'))
                : isLiveSessionPreview
                  ? `🚀 ${chat.message}`
                  : (chat.message || t('no_messages'));
            if (isUsernameSearchResult) subtitle = t('username');
            if (isTrade) {
                displayName = chat.participants?.indexOf(myId) === 0 ? (language === 'uz' ? 'Xaridor' : (language === 'ru' ? 'Покупатель' : 'Buyer')) : (language === 'uz' ? 'Sotuvchi' : (language === 'ru' ? 'Продавец' : 'Seller'));
            }
            const listingBadge = !isTrade && chat.type === 'private' && isExpertListingChat(chat);

            return (
                <div key={String(chat.id ?? chat._id ?? `row-${slideCatId}-${index}`)} className="px-1">
                    <GlassCard
                        onClick={() =>
                            chat.searchSource === 'global' || chat.isGlobal
                                ? handleAddContact(chat)
                                : onChatSelect && onChatSelect(chat)
                        }
                        hoverEffect={true}
                        className={`flex items-center gap-3 !p-4 !bg-white/[0.05] hover:!bg-white/10 !rounded-[1.5rem] border-transparent transition-all active:scale-[0.98] animate-slide-up${listingBadge ? ' ring-1 ring-amber-400/35' : ''}`}
                        style={{ animationDelay: `${index * 40}ms` }}
                    >
                        <div className="relative">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden ${isTrade ? 'bg-gradient-to-br from-emerald-400 to-teal-600' : 'bg-white/10'}`}
                            >
                                {(() => {
                                    const avatar =
                                        chat.avatar || chat.avatar_url || chat.otherUser?.avatar || chat.otherUser?.avatar_url;
                                    if (avatar && avatar !== 'null' && avatar !== '' && avatar !== 'use_initials' && !isTrade) {
                                        const src = avatar.startsWith('http') || avatar.startsWith('data:')
                                            ? avatar
                                            : `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}/${avatar}`;
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
                                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-[3px] border-[#1a1c2e]" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5 gap-2">
                                <h3 className="text-white font-medium truncate text-sm flex items-center gap-2 min-w-0">
                                    {displayName}
                                    {listingBadge && (
                                        <span className="shrink-0 text-[8px] px-1.5 py-0.5 rounded-md bg-amber-500/25 text-amber-200 font-bold uppercase tracking-wide">
                                            {language === 'uz' ? 'E\'lon' : (language === 'ru' ? 'Объявление' : 'Ad')}
                                        </span>
                                    )}
                                </h3>
                                <span className="text-[10px] text-white/30 uppercase tracking-tighter shrink-0">{chat.time}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-white/50 truncate group-hover:text-white/70 transition-colors">{subtitle}</p>
                                {chat.unread > 0 && (
                                    <div className="min-w-[1.25rem] h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white px-1 shadow-lg shadow-blue-500/20">
                                        {chat.unread}
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                </div>
            );
        };

        if (loading) {
            return (
                <div className="pt-3 space-y-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <div
                            key={idx}
                            className="animate-pulse rounded-2xl border border-white/10 bg-white/5 px-3 py-3 flex items-center gap-3"
                        >
                            <div className="h-10 w-10 rounded-full bg-white/10" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/2 rounded-full bg-white/10" />
                                <div className="h-2 w-3/4 rounded-full bg-white/5" />
                            </div>
                            <div className="h-3 w-8 rounded-full bg-white/10" />
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
                        <div key={title} className="space-y-3 mb-8 first:mt-2">
                            <h4 className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 mb-2">
                                {title}
                            </h4>
                            <div className="space-y-3">
                                {items.map((chat, idx) => renderChatItem(chat, idx))}
                            </div>
                        </div>
                    );
                };

                return (
                    <div className="pb-10">
                        {renderSection(language === 'uz' ? "Suhbatlar" : (language === 'ru' ? "Диалоги" : "Chats"), chatMatches)}
                        {renderSection(language === 'uz' ? "Kontaktlar" : (language === 'ru' ? "Контакты" : "Contacts"), contactMatches)}
                        {renderSection(language === 'uz' ? "Global qidiruv" : (language === 'ru' ? "Глобальный поиск" : "Global Search"), globalMatches)}
                    </div>
                );
            }

            return (
                <div className="space-y-3">
                    {fc.map((chat: any, index: number) => renderChatItem(chat, index))}
                </div>
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-40 text-white/40 mt-10">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    {isSearching ? (
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                    ) : (
                        <Plus className="h-8 w-8 text-white/20" />
                    )}
                </div>
                <p className="text-sm">
                    {isSearching ? t('loading') : searchQuery ? (language === 'uz' ? 'Hech narsa topilmadi' : (language === 'ru' ? 'Ничего не найдено' : 'Nothing found')) : t('no_messages')}
                </p>
                {searchQuery && !isSearching && (
                    <p className="text-[10px] text-white/20 mt-1 uppercase tracking-widest leading-loose">
                        Boshqa so&apos;z bilan qidirib ko&apos;ring
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className={`h-full min-h-0 min-w-0 flex flex-col relative overflow-hidden select-none animate-fade-in rounded-3xl ${className || ''}`}>
            {/* iOS Style Sidebar Drawer */}

            {/* Sticky Header / Search / Categories Container */}
            <div className={`sticky top-0 z-20 min-w-0 w-full backdrop-blur-xl border-b border-white/5 bg-white/15 ${(hideHeader && hideCategories) ? 'hidden lg:block' : 'block'}`}>
                {/* Header / Search部 */}
                <div className={`p-4 flex-col gap-4 ${hideHeader ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                        >
                            <Menu className="h-6 w-6" />
                        </button>

                        <button
                            onClick={() => setShowContactModal(true)}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95"
                        >
                            <PenSquare className="h-5 w-5" />
                        </button>

                        {mounted && currentUser?.is_expert ? (
                            <button
                                onClick={onToggleExpertMode}
                                title={
                                    isExpertMode
                                        ? t('client_view')
                                        : getExpertPanelMode(currentUser) === 'mentor'
                                          ? t('mentor_panel')
                                          : t('service_panel')
                                }
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isExpertMode ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                            >
                                <Layout className="h-5 w-5" />
                            </button>
                        ) : null}
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-white/30" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('search')}
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 border-none outline-none text-white rounded-full py-2.5 pl-11 pr-4 placeholder-white/30 text-sm transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => onSearchChange("")}
                                className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories - Horizontally scrollable on all devices */}
                <div
                    ref={categoryNavRef}
                    className={`nav-scroll-x flex gap-4 mb-2 flex-nowrap shrink-0 px-4 py-3 border-b border-white/5 min-w-0 w-full ${hideCategories ? 'hidden lg:flex' : 'flex'}`}
                >
                    {CATEGORIES.map(cat => {
                        const count = getCategoryUnreadCount(cat.id);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => handleCategoryChange(cat.id)}
                                title={t(cat.label as any)}
                                className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-transform transition-colors duration-300 relative
                                    ${activeCategory === cat.id
                                        ? 'bg-[#3b82f6] text-white shadow-lg shadow-blue-500/30 scale-105'
                                        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:scale-105 active:scale-95'
                                    }`}
                            >
                                <div className="w-5 h-5">{cat.icon}</div>
                                {count > 0 && (
                                    <div className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 rounded-full bg-red-500 border-2 border-[#1a1c2e] flex items-center justify-center text-[9px] font-bold text-white px-1 shadow-lg">
                                        {count > 99 ? '99+' : count}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {useCategoryPager ? (
                <div
                    ref={categoryPagerRef}
                    className="messages-category-pager [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    onScroll={handlePagerScroll}
                >
                    {CATEGORIES.map((cat) => (
                        <div
                            key={cat.id}
                            className="messages-category-pager-slide h-full min-h-0 flex flex-col overflow-hidden"
                        >
                            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 pt-2 pb-[calc(72px+env(safe-area-inset-bottom,0px)+2.75rem)] lg:pb-1 custom-scrollbar space-y-3">
                                {renderCategoryFeed(cat.id)}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 pt-2 pb-[calc(72px+env(safe-area-inset-bottom,0px)+2.75rem)] lg:pb-1 custom-scrollbar"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    <div
                        key={activeCategory}
                        className={`space-y-3 min-h-0 ${categoryListTransitionClass}`}
                    >
                        {renderCategoryFeed(activeCategory)}
                    </div>
                </div>
            )}

            {/* Plus: kichik ekranda o‘ngda, pastda, lekin pastdagi nav (72px) ustiga chiqmasin */}
            <button
                onClick={() => setShowContactModal(true)}
                className="lg:hidden fixed right-3 sm:right-4 bottom-[calc(72px+env(safe-area-inset-bottom,0px)+0.35rem)] w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_10px_30px_rgba(16,185,129,0.45)] flex items-center justify-center transition-transform active:scale-95 z-[80]"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div >
    );
}

