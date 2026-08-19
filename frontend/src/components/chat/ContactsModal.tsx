'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Search, UserPlus, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

interface ContactsModalProps {
    open: boolean;
    contacts: any[];
    chats?: any[];
    onClose: () => void;
    onStartChat: (user: any) => void | Promise<void>;
    onAddContact: () => void;
    onDeleteContact: (contactId: string) => void;
}

function avatarSrc(avatar?: string) {
    if (!avatar || avatar === 'null' || avatar === '' || avatar === 'use_initials') return null;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${base}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
}

function displayName(user: any) {
    const full = `${user?.name || ''} ${user?.surname || ''}`.trim();
    return full || user?.phone || (user?.username ? `@${user.username}` : '') || '?';
}

export default function ContactsModal({
    open,
    contacts,
    chats = [],
    onClose,
    onStartChat,
    onAddContact,
    onDeleteContact,
}: ContactsModalProps) {
    const { t } = useLanguage();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [globalHits, setGlobalHits] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [openingId, setOpeningId] = useState<string | null>(null);
    const [menuId, setMenuId] = useState<string | null>(null);
    const searchSeq = useRef(0);

    const onlineIds = useMemo(() => {
        const ids = new Set<string>();
        for (const chat of chats) {
            if (chat?.type !== 'private') continue;
            if (chat.status === 'online' || chat.online || chat.otherUser?.online) {
                const id = String(chat.participantId || chat.otherUser?.id || '');
                if (id) ids.add(id);
            }
        }
        return ids;
    }, [chats]);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setGlobalHits([]);
            setOpeningId(null);
            setMenuId(null);
            return;
        }
        const id = requestAnimationFrame(() => inputRef.current?.focus());
        return () => cancelAnimationFrame(id);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (menuId) setMenuId(null);
                else onClose();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, menuId, onClose]);

    const filteredContacts = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = (contacts || []).filter((c) => {
            if (!q) return true;
            const name = displayName(c).toLowerCase();
            return (
                name.includes(q) ||
                c.username?.toLowerCase().includes(q) ||
                c.phone?.includes(query.trim())
            );
        });
        return [...list].sort((a, b) => {
            const aOn = onlineIds.has(String(a.id)) ? 1 : 0;
            const bOn = onlineIds.has(String(b.id)) ? 1 : 0;
            if (aOn !== bOn) return bOn - aOn;
            return displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' });
        });
    }, [contacts, query, onlineIds]);

    useEffect(() => {
        const q = query.trim();
        if (!open || q.length < 2) {
            setGlobalHits([]);
            setSearching(false);
            return;
        }

        const seq = ++searchSeq.current;
        setSearching(true);
        const timer = window.setTimeout(async () => {
            try {
                const looksPhone = /^\+?[0-9\s-]{5,}$/.test(q);
                const url = looksPhone
                    ? `/api/users/search?q=${encodeURIComponent(q)}`
                    : `/api/users/search?q=${encodeURIComponent(q)}&searchBy=username`;
                const res = await apiFetch(url);
                if (!res.ok || seq !== searchSeq.current) return;
                const list = await res.json();
                const localIds = new Set((contacts || []).map((c) => String(c.id)));
                setGlobalHits(
                    (Array.isArray(list) ? list : [])
                        .filter((u: any) => !localIds.has(String(u.id)))
                        .slice(0, 20)
                );
            } catch {
                if (seq === searchSeq.current) setGlobalHits([]);
            } finally {
                if (seq === searchSeq.current) setSearching(false);
            }
        }, 220);

        return () => clearTimeout(timer);
    }, [query, open, contacts]);

    const handlePick = async (user: any) => {
        const id = String(user.id || user.userId || '');
        if (!id || openingId) return;
        setOpeningId(id);
        setMenuId(null);
        try {
            await onStartChat(user);
        } finally {
            setOpeningId(null);
        }
    };

    const renderRow = (user: any, subtitle: string, isOnline: boolean) => {
        const id = String(user.id || user.userId || '');
        const name = displayName(user);
        const src = avatarSrc(user.avatar || user.avatar_url);
        const busy = openingId === id;

        return (
            <div key={id} className="relative">
                <button
                    type="button"
                    disabled={!!openingId}
                    onClick={() => handlePick(user)}
                    onContextMenu={(e) => {
                        if (!user.id || user.isGlobal) return;
                        e.preventDefault();
                        setMenuId(id);
                    }}
                    className={`tg-chat-row w-full flex items-center gap-3 px-3 h-[72px] text-left border-0 disabled:opacity-60 ${
                        busy ? 'is-active' : ''
                    }`}
                >
                    <div className="relative shrink-0">
                        <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-white font-medium text-[22px] overflow-hidden bg-[#8774e1]">
                            {src ? (
                                <img
                                    src={src}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerText = name.substring(0, 1).toUpperCase();
                                    }}
                                />
                            ) : (
                                name.substring(0, 1).toUpperCase()
                            )}
                        </div>
                        {isOnline && (
                            <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#0ac630] rounded-full border-[2px] border-[#212121]" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0 py-[8px] border-b border-white/[0.06] self-stretch flex flex-col justify-center">
                        <h3 className="text-white font-medium truncate text-[15px] leading-[18px]">{name}</h3>
                        <p className={`text-[14px] truncate leading-[18px] mt-[3px] ${isOnline ? 'text-[#0ac630]' : 'text-[#aaaaaa]'}`}>
                            {busy ? t('loading') : subtitle}
                        </p>
                    </div>
                </button>
                {menuId === id && (
                    <div className="absolute right-3 top-14 z-40 min-w-[180px] overflow-hidden rounded-xl bg-[#2b2b2b] py-1 shadow-[0_2px_16px_rgba(0,0,0,0.45)]">
                        <button
                            type="button"
                            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] text-red-400 hover:bg-white/[0.06]"
                            onClick={() => {
                                setMenuId(null);
                                onDeleteContact(id);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            {t('delete_contact')}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    if (!open) return null;

    return (
        <div className="absolute inset-0 z-30 flex flex-col bg-[#212121] animate-fade-in">
            {menuId && (
                <button type="button" className="absolute inset-0 z-30 bg-transparent" aria-label="Close" onClick={() => setMenuId(null)} />
            )}

            <div className="shrink-0 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 shrink-0 rounded-full hover:bg-white/10 flex items-center justify-center text-[#aaaaaa] hover:text-white transition-colors"
                        aria-label={t('cancel')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="relative flex-1 min-w-0">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-[#aaaaaa]" />
                        </div>
                        <input
                            ref={inputRef}
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('search')}
                            className="w-full bg-[#181818] border-none outline-none text-[15px] text-white rounded-full py-[7px] pl-10 pr-4 placeholder-[#aaaaaa]"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <button
                    type="button"
                    onClick={onAddContact}
                    className="tg-chat-row w-full flex items-center gap-3 px-3 h-[72px] text-left border-0"
                >
                    <div className="w-[54px] h-[54px] rounded-full bg-[#8774e1] flex items-center justify-center shrink-0">
                        <UserPlus className="h-[22px] w-[22px] text-white" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0 py-[8px] border-b border-white/[0.06] self-stretch flex items-center">
                        <span className="text-white font-medium text-[15px]">{t('new_contact')}</span>
                    </div>
                </button>

                {!query.trim() && filteredContacts.length === 0 && (
                    <div className="px-6 py-16 text-center text-[15px] text-[#aaaaaa]">{t('no_contacts')}</div>
                )}

                {filteredContacts.length > 0 && (
                    <>
                        {query.trim() && (
                            <h4 className="px-4 py-2 text-[13px] font-medium text-[#aaaaaa]">{t('contacts')}</h4>
                        )}
                        {filteredContacts.map((c) => {
                            const online = onlineIds.has(String(c.id)) || c.status === 'online';
                            return renderRow(
                                c,
                                online ? t('online') : t('last_seen_recent'),
                                online
                            );
                        })}
                    </>
                )}

                {query.trim().length >= 2 && (
                    <>
                        {(searching || globalHits.length > 0) && (
                            <h4 className="px-4 py-2 text-[13px] font-medium text-[#aaaaaa]">{t('global_search')}</h4>
                        )}
                        {searching && globalHits.length === 0 && (
                            <div className="px-4 py-3 text-[14px] text-[#aaaaaa]">{t('loading')}</div>
                        )}
                        {globalHits.map((u) =>
                            renderRow(
                                { ...u, isGlobal: true, avatar: u.avatar_url || u.avatar },
                                u.username ? `@${u.username}` : (u.phone || t('username')),
                                false
                            )
                        )}
                        {!searching && filteredContacts.length === 0 && globalHits.length === 0 && (
                            <div className="px-6 py-16 text-center text-[15px] text-[#aaaaaa]">{t('contact_not_found')}</div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
