'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export type AvatarLightboxProps = {
    src: string;
    alt?: string;
    onClose: () => void;
};

export function AvatarLightbox({ src, alt = '', onClose }: AvatarLightboxProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={alt || 'Profile photo'}
        >
            <button
                type="button"
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Close"
            >
                <X className="h-6 w-6" />
            </button>
            <img
                src={src}
                alt={alt}
                className="max-h-[min(85vh,720px)] max-w-[min(92vw,720px)] rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

export default AvatarLightbox;
