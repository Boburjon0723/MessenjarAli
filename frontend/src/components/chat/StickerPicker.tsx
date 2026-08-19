'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { STICKER_CATEGORIES, type Sticker } from '@/lib/sticker-packs';

interface StickerPickerProps {
    open: boolean;
    onClose: () => void;
    onSelect: (sticker: Sticker) => void;
}

export default function StickerPicker({ open, onClose, onSelect }: StickerPickerProps) {
    const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES[0].id);
    const [search, setSearch] = useState('');
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
        };
        const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('mousedown', handler);
        document.addEventListener('keydown', escHandler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('keydown', escHandler);
        };
    }, [open, onClose]);

    const handleSelect = useCallback((sticker: Sticker) => {
        onSelect(sticker);
        onClose();
    }, [onSelect, onClose]);

    if (!open) return null;

    const category = STICKER_CATEGORIES.find(c => c.id === activeCategory) || STICKER_CATEGORIES[0];
    const filtered = search.trim()
        ? STICKER_CATEGORIES.flatMap(c => c.stickers).filter(s => s.emoji.includes(search) || s.code.toLowerCase().includes(search.toLowerCase()))
        : category.stickers;

    return (
        <div
            ref={panelRef}
            className="absolute bottom-full left-0 right-0 mb-2 mx-2 z-50 rounded-xl bg-[#212121] border border-white/[0.06] shadow-[0_-4px_24px_rgba(0,0,0,0.4)] overflow-hidden animate-fade-in"
            style={{ maxHeight: '360px' }}
        >
            {/* Search */}
            <div className="px-3 pt-3 pb-2">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search stickers..."
                    className="w-full bg-white/[0.06] rounded-lg px-3 py-2 text-[14px] text-white placeholder-white/30 outline-none focus:bg-white/[0.1] transition-colors"
                    autoFocus
                />
            </div>

            {/* Category tabs */}
            {!search.trim() && (
                <div className="flex gap-0.5 px-2 pb-1 overflow-x-auto custom-scrollbar">
                    {STICKER_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[18px] transition-colors ${
                                activeCategory === cat.id ? 'bg-[#8774e1]/20' : 'hover:bg-white/[0.06]'
                            }`}
                            title={cat.label}
                        >
                            {cat.icon}
                        </button>
                    ))}
                </div>
            )}

            {/* Sticker grid */}
            <div className="overflow-y-auto custom-scrollbar px-2 pb-2" style={{ maxHeight: '260px' }}>
                {!search.trim() && (
                    <div className="px-1 py-1 text-[12px] font-medium text-white/30 uppercase tracking-wider">
                        {category.label}
                    </div>
                )}
                <div className="grid grid-cols-5 gap-1">
                    {filtered.map(sticker => (
                        <button
                            key={sticker.code + sticker.emoji}
                            onClick={() => handleSelect(sticker)}
                            className="aspect-square rounded-lg hover:bg-white/[0.08] active:scale-90 transition-all flex items-center justify-center p-1.5 group"
                            title={sticker.emoji}
                        >
                            <img
                                src={sticker.webp}
                                alt={sticker.emoji}
                                className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-150"
                                loading="lazy"
                            />
                        </button>
                    ))}
                </div>
                {filtered.length === 0 && (
                    <div className="py-8 text-center text-white/30 text-[14px]">
                        No stickers found
                    </div>
                )}
            </div>
        </div>
    );
}
