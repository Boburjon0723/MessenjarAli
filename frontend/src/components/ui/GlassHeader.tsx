'use client';

import React from 'react';
import Link from 'next/link';

interface GlassHeaderProps {
    title?: string;
    balance?: number;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({
    title = 'Dashboard',
    balance = 0
}) => {
    return (
        <header className="fixed top-4 left-4 right-4 z-50">
            <div className="max-w-7xl mx-auto">
                <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-2xl px-6 py-4 shadow-xl">
                    <div className="flex items-center justify-between">
                        {/* Left: Logo */}
                        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <span className="text-white text-lg font-bold">M</span>
                            </div>
                            <span className="text-white text-xl font-bold tracking-tight hidden sm:block">ExpertLine</span>
                        </Link>

                        {/* Center: Title */}
                        <h1 className="text-white text-lg font-semibold absolute left-1/2 transform -translate-x-1/2 hidden md:block">
                            {title}
                        </h1>

                        {/* Right: User Avatar with Balance Badge */}
                        <div className="flex items-center gap-3">
                            {/* Balance Badge */}
                            <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 rounded-full px-4 py-2 hidden sm:flex items-center gap-2">
                                <span className="text-xs font-medium text-white/60">Balance</span>
                                <span className="text-sm font-bold text-white">{balance.toLocaleString()} MALI</span>
                            </div>

                            {/* Avatar */}
                            <button className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
                                <span className="text-white text-sm font-bold">U</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};
