'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface TabItem {
    name: string;
    href: string;
    icon: string;
}

const tabs: TabItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Chat', href: '/chat', icon: '💬' },
    { name: 'Wallet', href: '/wallet', icon: '💳' },
    { name: 'Services', href: '/services', icon: '🛠️' },
    { name: 'Profile', href: '/profile', icon: '👤' },
];

export const GlassTabBar: React.FC = () => {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-4 left-4 right-4 z-50">
            <div className="max-w-2xl mx-auto">
                <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-3xl px-2 py-3 shadow-2xl">
                    <div className="flex items-center justify-around">
                        {tabs.map((tab) => {
                            const isActive = pathname === tab.href;

                            return (
                                <Link
                                    key={tab.name}
                                    href={tab.href}
                                    className={`
                    flex flex-col items-center gap-1 px-4 py-2 rounded-2xl
                    transition-all duration-300 ease-out
                    hover:bg-white/10
                    ${isActive ? 'bg-white/20 scale-105' : ''}
                  `}
                                >
                                    <span className="text-2xl">{tab.icon}</span>
                                    <span
                                        className={`
                      text-xs font-medium transition-colors
                      ${isActive ? 'text-white' : 'text-white/60'}
                    `}
                                    >
                                        {tab.name}
                                    </span>

                                    {/* Active indicator dot */}
                                    {isActive && (
                                        <div className="w-1 h-1 bg-blue-400 rounded-full mt-1 animate-pulse"></div>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
};
