'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type AvatarLightboxProps = {
    src: string;
    alt?: string;
    onClose: () => void;
};

/**
 * Telegram Desktop: profil rasmi butun viewport o‘rtasida (panel ichida emas).
 */
export function AvatarLightbox({ src, alt = '', onClose }: AvatarLightboxProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/92"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={alt || 'Profile photo'}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] z-10 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Close"
            >
                <X className="h-6 w-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                className="max-h-[min(92vh,920px)] max-w-[min(92vw,920px)] w-auto h-auto object-contain select-none shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
            />
        </div>,
        document.body
    );
}

export default AvatarLightbox;
