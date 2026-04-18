'use client';

import React, { useEffect, useRef, useState } from 'react';

const EXIT_MS = 230;

export type AnimatedModalProps = {
    open: boolean;
    children: React.ReactNode;
    /** Qopqoq (backdrop) uchun qo‘shimcha klasslar: fon, blur, padding */
    className?: string;
    /** Masalan z-[130] */
    zClass?: string;
    /** Qopqoqqa bosganda */
    onBackdropClick?: () => void;
    /** `open` false bo‘lib animatsiya tugagach (DOM dan olib tashlashdan oldin) */
    onExitComplete?: () => void;
};

/**
 * Ochilish/yopilish: fon fade + panel scale-yengil.
 * `open` false bo‘lganda biroz kutib DOM dan olib tashlanadi (exit animatsiya).
 */
export function AnimatedModal({
    open,
    children,
    className = '',
    zClass = 'z-50',
    onBackdropClick,
    onExitComplete,
}: AnimatedModalProps) {
    const [mounted, setMounted] = useState(open);
    const [exiting, setExiting] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (open) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            setMounted(true);
            const id = requestAnimationFrame(() => setExiting(false));
            return () => cancelAnimationFrame(id);
        }

        setMounted((current) => {
            if (!current) return current;
            setExiting(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                setMounted(false);
                setExiting(false);
                timeoutRef.current = null;
                onExitComplete?.();
            }, EXIT_MS);
            return current;
        });
    }, [open]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    if (!mounted) return null;

    const backdropAnim = exiting ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in';
    const panelAnim = exiting ? 'animate-modal-panel-out' : 'animate-modal-panel-in';

    return (
        <div
            role="presentation"
            className={`fixed inset-0 ${zClass} flex items-center justify-center ${backdropAnim} ${className}`}
            onClick={onBackdropClick ? () => onBackdropClick() : undefined}
        >
            <div
                className={`flex w-full min-h-0 justify-center items-center max-h-[100dvh] ${panelAnim}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}


