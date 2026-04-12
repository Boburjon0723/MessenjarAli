'use client';

import React from 'react';
import { GlassCard } from './GlassCard';

interface Token {
    symbol: string;
    name: string;
    balance: number;
    value: number;
    change: number;
    gradient: string;
}

interface GlassTokenCardProps {
    token: Token;
    onClick?: () => void;
}

export const GlassTokenCard: React.FC<GlassTokenCardProps> = ({ token, onClick }) => {
    const isPositive = token.change >= 0;

    return (
        <GlassCard
            hover
            className="p-6 cursor-pointer group"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${token.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                        <span className="text-white text-xl font-bold">{token.symbol[0]}</span>
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-lg">{token.symbol}</h3>
                        <p className="text-white/40 text-sm">{token.name}</p>
                    </div>
                </div>

                <div className={`
          px-3 py-1 rounded-full text-xs font-medium
          ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}
        `}>
                    {isPositive ? '↑' : '↓'} {Math.abs(token.change)}%
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold text-white">{token.balance.toLocaleString()}</span>
                    <span className="text-white/60 text-sm mb-1">{token.symbol}</span>
                </div>
                <p className="text-white/40 text-sm">
                    ≈ ${token.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Hover effect indicator */}
            <div className="mt-4 pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-blue-400 text-sm font-medium">Tap to send →</p>
            </div>
        </GlassCard>
    );
};
