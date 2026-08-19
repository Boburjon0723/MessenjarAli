'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, User } from 'lucide-react';

export type MessagesMobileBottomNavProps = {
    activeCategory: string;
    selectedChat: unknown;
    onSelectCategory: (id: string) => void;
};

export function MessagesMobileBottomNav({
    activeCategory,
    selectedChat,
    onSelectCategory,
}: MessagesMobileBottomNavProps) {
    const router = useRouter();
    const tabs = [
        { id: 'all', label: 'Chatlar', icon: <MessageSquare className="h-6 w-6" /> },
        {
            id: 'wallet',
            label: 'Hamyon',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            ),
        },
        {
            id: 'services',
            label: 'Xizmatlar',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
            ),
        },
        { id: 'settings', label: 'Profil', icon: <User className="h-6 w-6" /> },
    ];

    return (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[50] bg-[#212121] border-t border-white/[0.06] flex items-center justify-around px-2 pt-1.5 min-h-[64px] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => tab.id === 'wallet' ? router.push('/wallet') : onSelectCategory(tab.id)}
                    className={`flex flex-col items-center gap-1 p-2 min-w-[64px] ${
                        activeCategory === tab.id && !selectedChat ? 'text-[#8774e1]' : 'text-[#aaaaaa]'
                    }`}
                >
                    {tab.icon}
                    <span className="text-[11px]">{tab.label}</span>
                </button>
            ))}
        </nav>
    );
}

export default MessagesMobileBottomNav;
