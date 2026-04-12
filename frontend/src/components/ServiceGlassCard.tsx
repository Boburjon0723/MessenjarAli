'use client';

import React from 'react';
import { GlassCard } from './ui/GlassCard';

interface Service {
    id: string;
    title: string;
    provider: string;
    price: number;
    rating: number;
    icon: string;
    gradient: string;
    category: string;
    isEscrow: boolean;
    availability: 'available' | 'busy' | 'offline';
}

interface ServiceGlassCardProps {
    service: Service;
    onBook: () => void;
}

export const ServiceGlassCard: React.FC<ServiceGlassCardProps> = ({ service, onBook }) => {
    const availabilityColors = {
        available: 'bg-green-500',
        busy: 'bg-orange-500',
        offline: 'bg-gray-500',
    };

    return (
        <GlassCard hover className="p-6 cursor-pointer group" onClick={onBook}>
            <div className="space-y-4">
                {/* Header with Icon */}
                <div className="flex items-start justify-between">
                    <div className={`w-16 h-16 bg-gradient-to-br ${service.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                        <span className="text-3xl">{service.icon}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${availabilityColors[service.availability]} animate-pulse`}></div>
                        <span className="text-xs text-white/60 capitalize">{service.availability}</span>
                    </div>
                </div>

                {/* Service Info */}
                <div>
                    <h3 className="text-white font-bold text-lg mb-1">{service.title}</h3>
                    <p className="text-white/60 text-sm">{service.provider}</p>
                </div>

                {/* Category Badge */}
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-medium">
                        {service.category}
                    </span>
                    {service.isEscrow && (
                        <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-1">
                            🔒 Escrow
                        </span>
                    )}
                </div>

                {/* Price & Rating */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-white font-medium">{service.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-end gap-1">
                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            {service.price}
                        </span>
                        <span className="text-white/60 text-sm mb-1">MALI/hr</span>
                    </div>
                </div>

                {/* Hover CTA */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-sm hover:scale-105 transition-transform">
                        Book Now →
                    </button>
                </div>
            </div>
        </GlassCard>
    );
};
