import React, { useEffect, useRef, useState } from 'react';
import { isExpertListingChat } from '@/lib/listing-chat';
import { getExpertListingPitch } from '@/lib/expert-roles';
import {
    X, MessageCircle, Bell, Gift, Link, Mic, Users, Edit3, Trash2, ShieldAlert, Check, Loader2
} from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { getPrivateChatPeerUserId } from '@/lib/private-chat-peer';
import { apiFetch } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';

interface UserInfoPanelProps {
    chat: any;
    onClose?: () => void;
}

export default function UserInfoPanel({ chat, onClose }: UserInfoPanelProps) {
    const { t, language } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const [loading, setLoading] = useState(false);
    const [fullUserDetails, setFullUserDetails] = useState<any>(null);
    const [stats, setStats] = useState({ linksCount: 0, voiceCount: 0, commonGroupsCount: 0 });
    const [isBlocked, setIsBlocked] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', surname: '' });
    const [imgError, setImgError] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [listingIntro, setListingIntro] = useState(false);
    const { confirm } = useConfirm();
    /** Bir xil suhbat uchun panel yopib-ochganda profil/statistikani qayta yuklamaslik */
    const lastFetchKeyRef = useRef<string>('');
    /** Kontakt qo‘shilgach listing kartasidan to‘liq profilga o‘tish */
    const [contactsBump, setContactsBump] = useState(0);

    useEffect(() => {
        const onContactsUpdated = () => {
            lastFetchKeyRef.current = '';
            setContactsBump((n) => n + 1);
        };
        window.addEventListener('contacts_updated', onContactsUpdated);
        return () => window.removeEventListener('contacts_updated', onContactsUpdated);
    }, []);

    useEffect(() => {
        if (!chat || chat.type !== 'private') return;

        let cancelled = false;

        const run = async () => {
            const peerId = getPrivateChatPeerUserId(chat);
            let inContacts = false;
            if (peerId) {
                try {
                    const res = await apiFetch('/api/users/contacts');
                    if (res.ok) {
                        const list = await res.json();
                        inContacts =
                            Array.isArray(list) &&
                            list.some((c: { id?: string }) => String(c.id) === String(peerId));
                    }
                } catch {
                    /* ignore */
                }
            }
            if (cancelled) return;

            const showListingCard =
                Boolean(chat.otherUser) && isExpertListingChat(chat) && !inContacts;

            if (showListingCard) {
                const key = `listing:${chat.id}`;
                if (lastFetchKeyRef.current === key) return;
                lastFetchKeyRef.current = key;
                setListingIntro(true);
                setFullUserDetails({ ...chat.otherUser });
                setLoading(false);
                setImgError(false);
                setEditForm({
                    name: chat.otherUser.name || '',
                    surname: chat.otherUser.surname || '',
                });
                void fetchChatStats();
                return;
            }

            const targetId = String(peerId || '');
            const key = `priv:${chat.id}:${targetId}:${contactsBump}`;
            if (lastFetchKeyRef.current === key) return;
            lastFetchKeyRef.current = key;
            setListingIntro(false);
            await fetchUserDetails();
            void fetchChatStats();
        };

        void run();
        return () => {
            cancelled = true;
        };
    }, [
        chat?.id,
        chat?.type,
        chat?.participantId,
        chat?.participants,
        chat?.otherUser?.id,
        chat?.userId,
        chat?.metadata,
        contactsBump,
    ]);

    const fetchUserDetails = async () => {
        if (!chat) return;
        setLoading(true);
        setImgError(false);
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app';
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) return;
            const res = await fetch(`${API_URL}/api/users/${targetId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setFullUserDetails(data);
                setEditForm({ name: data.name || '', surname: data.surname || '' });
                setIsBlocked(data.isBlocked || false);
            }
        } catch (err) {
            console.error("Failed to fetch user details:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchChatStats = async () => {
        if (!chat?.id || chat.type !== 'private') return;
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app';
            const res = await fetch(`${API_URL}/api/users/chat-stats/${chat.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Failed to fetch chat stats:", err);
        }
    };

    const handleBlock = async () => {
        setActionLoading('block');
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app';
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) return;
            const res = await fetch(`${API_URL}/api/users/${isBlocked ? 'unblock' : 'block'}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ targetId })
            });
            if (res.ok) {
                setIsBlocked(!isBlocked);
                window.dispatchEvent(new CustomEvent('block_status_changed'));
            }
        } catch (e) { console.error(e); } finally { setActionLoading(null); }
    };

    const handleUpdateContact = async () => {
        setActionLoading('edit');
        try {
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) {
                showError(t('user_not_found'));
                return;
            }
            const res = await apiFetch(`/api/users/contacts`, {
                method: 'PUT',
                body: JSON.stringify({ contactUserId: targetId, name: editForm.name, surname: editForm.surname })
            });
            if (res.ok) {
                setIsEditing(false);
                fetchUserDetails();
                showSuccess(t('success_update'));
                window.dispatchEvent(new CustomEvent('contacts_updated'));
            } else {
                let msg = t('contact_save_error');
                try {
                    const data = await res.json();
                    if (data?.message && typeof data.message === 'string') msg = data.message;
                } catch {
                    /* ignore */
                }
                showError(msg);
            }
        } catch (e) {
            console.error(e);
            showError(t('server_error'));
        } finally { setActionLoading(null); }
    };

    const handleDeleteContact = async () => {
        const ok = await confirm({
            title: t('delete_contact'),
            description: t('delete_contact_desc'),
            variant: 'danger',
            confirmLabel: t('delete_chat')
        });
        if (!ok) return;
        setActionLoading('delete');
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app';
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) return;
            const res = await fetch(`${API_URL}/api/users/contacts/${targetId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                onClose?.();
                window.dispatchEvent(new CustomEvent('chat_deleted', { detail: { chatId: chat.id } }));
            }
        } catch (e) { console.error(e); } finally { setActionLoading(null); }
    };

    if (!chat) return null;

    const user = fullUserDetails || chat;
    const listingPitch = listingIntro ? getExpertListingPitch(user) : '';
    const rawAvatar = user.avatar || user.avatar_url;
    const avatarUrl = rawAvatar && rawAvatar !== 'null' && rawAvatar !== ''
        ? (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:') ? rawAvatar : `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app'}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`)
        : null;

    const initials = user.name ? user.name.substring(0, 1).toUpperCase() : '?';
    const hasPhone = !listingIntro && user.phone && user.phone !== 'Скрыт';
    const username = !listingIntro && user.username ? `@${user.username}` : '';

    return (
        <div className="fixed lg:relative inset-0 lg:inset-auto z-[70] lg:z-0 h-full min-h-0 w-full flex flex-col max-lg:bg-white/[0.07] max-lg:backdrop-blur-2xl max-lg:backdrop-saturate-150 lg:bg-transparent lg:backdrop-blur-none border-l-0 lg:border-l lg:border-white/20 overflow-hidden select-none relative pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
            {/* Close Button Top Right */}
            <button
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-full transition-all lg:top-4"
            >
                <X className="h-6 w-6" />
            </button>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar">
                {listingIntro && (
                    <div className="mx-4 mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/95 leading-snug">
                        <span className="font-bold text-amber-200">{t('listing_chat_prompt')}</span>{' '}
                        {t('listing_chat_prompt_desc')}
                    </div>
                )}
                {/* Header Section */}
                <div className="flex flex-col items-center pt-10 pb-6 px-4">
                    <div className="relative mb-4">
                        <div className="w-28 h-28 rounded-full p-[2px] bg-gradient-to-br from-blue-400 to-indigo-500 shadow-2xl overflow-hidden flex items-center justify-center text-white text-3xl font-bold">
                            {avatarUrl && !imgError ? (
                                <img
                                    src={avatarUrl}
                                    className="w-full h-full rounded-full object-cover border-4 border-[#788296]/30"
                                    alt={user.name}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="w-full max-w-[200px] flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                            <input
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder={t('name')}
                                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500/50"
                            />
                            <input
                                value={editForm.surname}
                                onChange={e => setEditForm({ ...editForm, surname: e.target.value })}
                                placeholder={t('surname')}
                                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500/50"
                            />
                            <div className="flex gap-2">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-1 text-xs text-white/40 hover:text-white">{t('cancel')}</button>
                                <button onClick={handleUpdateContact} disabled={actionLoading === 'edit'} className="flex-1 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 text-xs rounded-lg flex items-center justify-center gap-1">
                                    {actionLoading === 'edit' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    {t('save')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-white text-center leading-tight">
                                {user.name} {user.surname || ''}
                            </h2>
                            {username && (
                                <p className="text-white/40 text-sm mt-0.5 font-medium">
                                    {username}
                                </p>
                            )}
                        </>
                    )}

                    <p className="text-blue-400/60 text-[13px] mt-1 font-medium">
                        {listingIntro ? t('listing_profile') : (user.isOnline ? t('online') : t('last_seen_recent'))}
                    </p>
                </div>

                {/* Oddiy harakatlar: Suhbat, Ovoz, Sovg'a (faqat oddiy kontaktlar uchun) */}
                {!listingIntro && (
                <div className="flex justify-center gap-2 px-4 mb-8">
                    <ActionButton icon={<MessageCircle className="h-5 w-5" />} label={t('chats')} />
                    <ActionButton icon={<Bell className="h-5 w-5" />} label={t('voice_call')} />
                    <ActionButton icon={<Gift className="h-5 w-5" />} label={t('personal')} />
                </div>
                )}

                {/* Information Section */}
                <div className="w-full space-y-1">
                    <div className="px-6 py-4 border-t border-white/5">
                        <h3 className="text-white text-[15px] font-medium">
                            {listingIntro ? '—' : (hasPhone ? user.phone : t('hidden'))}
                        </h3>
                        <p className="text-blue-400/40 text-xs">
                            {listingIntro ? t('telegram_link_desc').replace('Telegram', 'Telegram/Username') : t('phone_number')}
                        </p>
                    </div>

                    {listingIntro && user.profession && (
                        <>
                            <div className="h-px bg-white/5 mx-2" />
                            <div className="px-6 py-4">
                                <h3 className="text-white text-[14px]">{user.profession}</h3>
                                <p className="text-blue-400/40 text-xs mt-1">{t('listing_profession')}</p>
                            </div>
                        </>
                    )}

                    {listingIntro && listingPitch && (
                        <>
                            <div className="h-px bg-white/5 mx-2" />
                            <div className="px-6 py-4">
                                <h3 className="text-white text-[14px] leading-relaxed whitespace-pre-wrap">
                                    {listingPitch}
                                </h3>
                                <p className="text-blue-400/40 text-xs mt-1">{t('listing_description')}</p>
                            </div>
                        </>
                    )}

                    {!listingIntro && user.bio && (
                        <>
                            <div className="h-px bg-white/5 mx-2" />
                            <div className="px-6 py-4">
                                <h3 className="text-white text-[14px] leading-relaxed">
                                    {user.bio}
                                </h3>
                                <p className="text-blue-400/40 text-xs mt-1">{t('bio')}</p>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-white/5 mx-2" />

                    <div className="py-2">
                        <MenuItem
                            icon={<Link className="h-5 w-5" />}
                            label={`${stats.linksCount} ${t('links_count')}`}
                        />
                        <MenuItem
                            icon={<Mic className="h-5 w-5" />}
                            label={`${stats.voiceCount} ${t('voice_messages_count')}`}
                        />
                        <MenuItem
                            icon={<Users className="h-5 w-5" />}
                            label={`${stats.commonGroupsCount} ${t('common_groups_count')}`}
                        />
                    </div>

                    <div className="h-px bg-white/5 mx-2" />

                    <div className="py-2 pb-10">
                        {!listingIntro && (
                        <MenuItem
                            icon={<Edit3 className="h-5 w-5" />}
                            label={t('edit_contact')}
                            onClick={() => setIsEditing(true)}
                        />
                        )}
                        <MenuItem
                            icon={actionLoading === 'delete' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                            label={t('delete_contact')}
                            onClick={handleDeleteContact}
                        />
                        <MenuItem
                            icon={actionLoading === 'block' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldAlert className="h-5 w-5 text-rose-500" />}
                            label={isBlocked ? t('unblock') : t('block')}
                            className="text-rose-500"
                            onClick={handleBlock}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex-1 flex flex-col items-center gap-2 px-2 py-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group"
        >
            <div className="text-white/70 group-hover:text-white transition-colors">
                {icon}
            </div>
            <span className="text-[11px] font-medium text-white/40 group-hover:text-white/60">
                {label}
            </span>
        </button>
    );
}

function MenuItem({ icon, label, onClick, className = "" }: { icon: React.ReactNode, label: string, onClick?: () => void, className?: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-6 py-3 hover:bg-white/5 transition-colors group ${className}`}
        >
            <div className="w-6 flex items-center justify-center text-white/30 group-hover:text-white/60 transition-colors">
                {icon}
            </div>
            <span className="text-[14px] font-medium text-white/80 group-hover:text-white">
                {label}
            </span>
        </button>
    );
}



