"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import { X, Search, UserPlus } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getPublicApiUrl } from '@/lib/public-origin';

interface AddGroupMemberModalProps {
    open: boolean;
    chatId: string;
    currentParticipantIds: string[];
    onClose: () => void;
    onAdded: (user: any) => Promise<void>;
}

export default function AddGroupMemberModal({
    open,
    chatId,
    currentParticipantIds,
    onClose,
    onAdded
}: AddGroupMemberModalProps) {
    const [mounted, setMounted] = useState(false);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [addingId, setAddingId] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchContacts = async () => {
            setLoading(true);
            try {
                const res = await apiFetch('/api/users/contacts');
                if (res.ok) {
                    const users = await res.json();
                    const list = Array.isArray(users) ? users.map((u: any) => {
                        const rawId = u.id ?? u.userId;
                        return {
                            ...u,
                            id: rawId != null ? String(rawId) : '',
                            name: [u.name, u.surname].filter(Boolean).join(' ') || u.phone || 'Kontakt',
                            phone: u.phone || '',
                        };
                    }).filter((u: any) => u.id) : [];
                    setContacts(list);
                }
            } catch (err) {
                console.error('Failed to load contacts:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchContacts();
    }, []);

    const participantSet = new Set(currentParticipantIds.map(String));
    const availableContacts = contacts.filter(c => !participantSet.has(String(c.id)));
    const filteredContacts = availableContacts.filter(c =>
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.phone || '').includes(searchQuery)
    );

    const API_URL = getPublicApiUrl();

    const getAvatarSrc = (c: any) => {
        const avatar = c.avatar || c.avatar_url;
        if (!avatar || avatar === 'null' || avatar === '') return null;
        return avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : `${API_URL}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
    };

    const handleAdd = async (contact: any) => {
        if (addingId || !contact?.id) return;
        setAddingId(String(contact.id));
        try {
            await onAdded(contact);
        } finally {
            setAddingId(null);
        }
    };

    /** document.body ga portal — ong panel/backdrop-blur/chat karuseli (z-20 + transform) ostida qolmasin */
    const modal = (
        <AnimatedModal
            open={open}
            zClass="z-[500]"
            onBackdropClick={onClose}
            className="bg-black/60 backdrop-blur-sm p-4"
        >
            <GlassCard className="w-full max-w-md !p-0 flex flex-col max-h-[85vh] overflow-hidden !rounded-2xl border border-white/10 shadow-2xl">
                <div
                    className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-white/5"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-group-member-title"
                >
                    <h2 id="add-group-member-title" className="text-lg font-bold text-white">Saqlangan kontaktlar</h2>
                    <button onClick={onClose} className="p-2 text-white/50 hover:text-white rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="px-4 py-3 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                        <input
                            type="text"
                            placeholder="Qidirish (ism, telefon)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500/50"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-[200px]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12 text-white/50 text-sm">Yuklanmoqda...</div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-white/40 text-sm text-center">
                            <UserPlus className="h-10 w-10 mb-2 opacity-50" />
                            <p>{searchQuery ? "Kontakt topilmadi" : "Saqlangan kontaktlar yo'q yoki ular guruhda"}</p>
                        </div>
                    ) : (
                        <ul className="space-y-1">
                            {filteredContacts.map((contact) => {
                                const avatarSrc = getAvatarSrc(contact);
                                const isAdding = addingId === contact.id;
                                return (
                                    <li
                                        key={contact.id}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                                    >
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden flex-shrink-0">
                                            {avatarSrc ? (
                                                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                (contact.name || '?').charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{contact.name}</p>
                                            <p className="text-xs text-white/50 truncate">{contact.phone || '—'}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleAdd(contact)}
                                            disabled={isAdding}
                                            className="shrink-0 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                            {isAdding ? (
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <UserPlus className="h-4 w-4" />
                                                    Qo'shish
                                                </>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </GlassCard>
        </AnimatedModal>
    );

    if (!mounted || typeof document === 'undefined') return null;
    return createPortal(modal, document.body);
}
