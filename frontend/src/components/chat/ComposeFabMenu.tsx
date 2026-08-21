'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, Users, User, PenSquare, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export type ComposeFabMenuProps = {
    canCreateGroup?: boolean;
    onNewChannel: () => void;
    onNewGroup: () => void;
    onNewPrivateChat: () => void;
};

export default function ComposeFabMenu({
    canCreateGroup = true,
    onNewChannel,
    onNewGroup,
    onNewPrivateChat,
}: ComposeFabMenuProps) {
    const { t } = useLanguage();
    const [open, setOpen] = React.useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    const close = () => setOpen(false);

    const handleAction = (action: () => void) => {
        close();
        action();
    };

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    const items = [
        {
            id: 'channel',
            label: t('new_channel'),
            icon: Megaphone,
            onClick: onNewChannel,
            show: true,
        },
        {
            id: 'group',
            label: t('new_group'),
            icon: Users,
            onClick: onNewGroup,
            show: canCreateGroup,
        },
        {
            id: 'private',
            label: t('new_private_chat'),
            icon: User,
            onClick: onNewPrivateChat,
            show: true,
        },
    ].filter((item) => item.show);

    const backdrop =
        open && typeof document !== 'undefined'
            ? createPortal(
                  <button
                      type="button"
                      aria-label="Close menu"
                      className="fixed inset-0 z-[240] cursor-default bg-transparent"
                      onClick={close}
                  />,
                  document.body
              )
            : null;

    return (
        <>
            {backdrop}

            <div
                ref={rootRef}
                className="pointer-events-none absolute right-3.5 bottom-[3.75rem] z-[250] flex flex-col items-end gap-3"
            >
                {open && (
                    <div
                        className="pointer-events-auto tg-compose-menu mb-1 min-w-[220px] overflow-hidden rounded-2xl bg-[#212121] py-1.5 shadow-[0_2px_16px_rgba(0,0,0,0.45)] animate-fade-in"
                        role="menu"
                    >
                        {items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleAction(item.onClick)}
                                    className="flex w-full items-center gap-4 px-5 py-3 text-left text-[15px] font-normal text-white transition-colors hover:bg-white/[0.06]"
                                >
                                    <Icon className="h-[22px] w-[22px] shrink-0 text-[#aaaaaa]" strokeWidth={1.75} />
                                    <span className="whitespace-nowrap">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="pointer-events-auto flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-[#8774e1] text-white shadow-[0_1px_8px_rgba(0,0,0,0.4)] transition-all hover:bg-[#7b68d4] active:scale-95"
                    aria-label={open ? t('cancel') : t('new_message')}
                    aria-expanded={open}
                >
                    <span
                        className={`relative flex h-6 w-6 items-center justify-center transition-transform duration-200 ${
                            open ? 'rotate-90' : 'rotate-0'
                        }`}
                    >
                        {open ? (
                            <X className="h-6 w-6" strokeWidth={2} />
                        ) : (
                            <PenSquare className="h-6 w-6" strokeWidth={2} />
                        )}
                    </span>
                </button>
            </div>
        </>
    );
}
