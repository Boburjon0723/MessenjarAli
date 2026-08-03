'use client';

import React from 'react';
import {
    Menu as MenuIcon,
    PenSquare,
    Search,
    X,
    Layout,
} from 'lucide-react';
import { CATEGORIES } from '@/components/chat/ChatList';
import { getExpertPanelMode } from '@/lib/expert-roles';

export type MessagesMobileHeaderProps = {
    currentUser: any;
    isExpertMode: boolean;
    searchQuery: string;
    activeCategory: string;
    mobileCategoryNavRef: React.RefObject<HTMLDivElement | null>;
    onOpenMenu: () => void;
    onToggleExpertPanel: () => void;
    onOpenContactModal: () => void;
    onSearch: (q: string) => void;
    onCategoryChange: (id: string) => void;
};

export function MessagesMobileHeader({
    currentUser,
    isExpertMode,
    searchQuery,
    activeCategory,
    mobileCategoryNavRef,
    onOpenMenu,
    onToggleExpertPanel,
    onOpenContactModal,
    onSearch,
    onCategoryChange,
}: MessagesMobileHeaderProps) {
    return (
        <div className="lg:hidden sticky top-0 z-50 glass-premium bg-[#0f1117]/80 shadow-lg !border-t-0 !border-x-0 !rounded-none pt-[max(2.5rem,env(safe-area-inset-top))]">
            <div className="p-4 pb-1 pt-0 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={onOpenMenu}
                        className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                    >
                        <MenuIcon className="h-6 w-6" />
                    </button>
                    <div className="text-center min-w-0 px-1">
                        <h2 className="text-white font-bold text-lg leading-tight">ExpertLine</h2>
                        <p className="text-[8px] font-semibold uppercase tracking-wider text-white/45 leading-tight px-1">
                            Ekspertlar va mijozlar
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {currentUser?.is_expert && (
                            <button
                                type="button"
                                onClick={onToggleExpertPanel}
                                title={
                                    isExpertMode
                                        ? "Mijoz ko'rinishi"
                                        : getExpertPanelMode(currentUser) === 'mentor'
                                          ? 'Ustoz paneli'
                                          : 'Xizmat paneli'
                                }
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                    isExpertMode
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                }`}
                            >
                                <Layout className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onOpenContactModal}
                            className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300"
                        >
                            <PenSquare className="h-5 w-5" />
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-white/30" />
                    </div>
                    <input
                        type="text"
                        placeholder="Foydalanuvchi nomi (@username)"
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full bg-white/5 border-none outline-none text-white rounded-full py-2.5 pl-11 pr-4 placeholder-white/30 text-sm"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearch('')}
                            className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <div
                ref={mobileCategoryNavRef}
                className="nav-scroll-x flex gap-4 px-4 py-3 mb-2 flex-nowrap border-b border-white/5 min-w-0 w-full lg:flex"
            >
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => onCategoryChange(cat.id)}
                        className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full transition-colors duration-150 ${
                            activeCategory === cat.id ? 'bg-[#3b82f6] text-white' : 'bg-white/5 text-white/40'
                        }`}
                    >
                        <div className="w-6 h-6">{cat.icon}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default MessagesMobileHeader;
