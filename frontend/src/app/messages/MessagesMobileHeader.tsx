'use client';

import React from 'react';
import { Menu as MenuIcon, Search, X } from 'lucide-react';

export type MessagesMobileHeaderProps = {
    searchQuery: string;
    onOpenMenu: () => void;
    onSearch: (q: string) => void;
};

export function MessagesMobileHeader({
    searchQuery,
    onOpenMenu,
    onSearch,
}: MessagesMobileHeaderProps) {
    return (
        <div className="lg:hidden sticky top-0 z-50 bg-[#212121] border-b border-white/[0.06] pt-[max(0.5rem,env(safe-area-inset-top))]">
            <div className="px-2 pb-2 pt-1 flex items-center gap-1">
                <button
                    type="button"
                    onClick={onOpenMenu}
                    className="w-10 h-10 shrink-0 rounded-full hover:bg-white/10 flex items-center justify-center text-[#aaaaaa] hover:text-white"
                    aria-label="Menu"
                >
                    <MenuIcon className="h-5 w-5" />
                </button>
                <div className="relative flex-1 min-w-0">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-[#aaaaaa]" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => onSearch(e.target.value)}
                        className="w-full bg-[#181818] border-none outline-none text-[15px] text-white rounded-full py-[7px] pl-10 pr-9 placeholder-[#aaaaaa]"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => onSearch('')}
                            className="absolute inset-y-0 right-3 flex items-center text-[#aaaaaa] hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default MessagesMobileHeader;
