'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    isExpertListingChat,
    isJobListingChat,
    getJobListingIntent,
    getJobListingSnapshot,
    jobListingTitle,
    jobListingSubtitle,
} from '@/lib/listing-chat';
import { getExpertListingPitch, getExpertPanelMode, isMentorPanelMode } from '@/lib/expert-roles';
import {
    X, MessageCircle, Phone, Bell, BellOff, Link, Mic, Users, Edit3, Trash2, ShieldAlert,
    Check, Loader2, GraduationCap, ChevronLeft, ExternalLink,
} from 'lucide-react';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { getPrivateChatPeerUserId } from '@/lib/private-chat-peer';
import { apiFetch } from '@/lib/api';
import { useNotification } from '@/context/NotificationContext';
import { getUser } from '@/lib/auth-storage';
import { syncChatPrefToServer, toggleChatMuted } from '@/lib/chat-list-prefs';
import { useChatListPrefs } from '@/hooks/useChatListPrefs';
import AvatarLightbox from './AvatarLightbox';

interface UserInfoPanelProps {
    chat: any;
    onClose?: () => void;
    /** Guruh a'zosidan ochilganda: Chat tugmasi DM ochadi (oddiy yopish o‘rniga) */
    onOpenChat?: () => void;
}

type SharedView = 'main' | 'links' | 'voice' | 'groups';

type SharedLinkItem = { id: string; content: string; created_at?: string };
type SharedVoiceItem = { id: string; content: string; created_at?: string; metadata?: unknown };
type SharedGroupItem = { id: string; name: string; avatar?: string | null };

function extractFirstUrl(text: string): string | null {
    const m = String(text || '').match(/https?:\/\/[^\s<>"']+/i);
    return m ? m[0] : null;
}

function formatShortTime(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function UserInfoPanel({ chat, onClose, onOpenChat }: UserInfoPanelProps) {
    const { t } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const { prefOf } = useChatListPrefs();
    const [fullUserDetails, setFullUserDetails] = useState<any>(null);
    const [stats, setStats] = useState({ linksCount: 0, voiceCount: 0, commonGroupsCount: 0 });
    const [isBlocked, setIsBlocked] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', surname: '' });
    const [imgError, setImgError] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [listingIntro, setListingIntro] = useState(false);
    const { confirm } = useConfirm();
    const lastFetchKeyRef = useRef<string>('');
    const [contactsBump, setContactsBump] = useState(0);
    const [avatarLightboxOpen, setAvatarLightboxOpen] = useState(false);
    const [peerInContacts, setPeerInContacts] = useState(false);
    const [studentInfo, setStudentInfo] = useState<{
        isActiveStudent: boolean;
        memberGroups: { id: string; name: string }[];
        canReinviteViaListing?: boolean;
    } | null>(null);

    const [sharedView, setSharedView] = useState<SharedView>('main');
    const [sharedLoading, setSharedLoading] = useState(false);
    const [sharedLinks, setSharedLinks] = useState<SharedLinkItem[]>([]);
    const [sharedVoice, setSharedVoice] = useState<SharedVoiceItem[]>([]);
    const [sharedGroups, setSharedGroups] = useState<SharedGroupItem[]>([]);

    const me = getUser() as { id?: string; is_expert?: boolean; profession?: string } | null;
    const iAmMentor =
        !!me?.is_expert &&
        isMentorPanelMode(getExpertPanelMode(me as Parameters<typeof getExpertPanelMode>[0]));

    const chatMuted = chat?.id ? !!prefOf(chat.id).muted : false;
    const isPeerPreview = String(chat?.id || '').startsWith('peer-preview:');

    /** Telegram: Message — suhbatga qaytish / guruhdan DM ochish */
    const handleOpenChat = () => {
        if (onOpenChat) {
            onOpenChat();
            return;
        }
        onClose?.();
    };

    /** Telegram: Call */
    const handleVoiceCall = () => {
        if (isPeerPreview && onOpenChat) {
            onOpenChat();
            return;
        }
        const peerId = getPrivateChatPeerUserId(chat);
        window.dispatchEvent(
            new CustomEvent('panel_start_call', {
                detail: { chatId: String(chat.id), peerId, callType: 'audio' },
            })
        );
        onClose?.();
    };

    /** Telegram: Mute / Unmute */
    const handleToggleMute = () => {
        if (!chat?.id || isPeerPreview) return;
        const muted = toggleChatMuted(chat.id);
        void syncChatPrefToServer(chat.id, { muted });
        showSuccess(muted ? t('mute_chat') : t('unmute_chat'));
    };

    useEffect(() => {
        const onContactsUpdated = () => {
            lastFetchKeyRef.current = '';
            setContactsBump((n) => n + 1);
        };
        window.addEventListener('contacts_updated', onContactsUpdated);
        return () => window.removeEventListener('contacts_updated', onContactsUpdated);
    }, []);

    useEffect(() => {
        setSharedView('main');
        setSharedLinks([]);
        setSharedVoice([]);
        setSharedGroups([]);
    }, [chat?.id]);

    useEffect(() => {
        if (!chat?.id || chat.type !== 'private' || !iAmMentor || chat.is_saved_messages) {
            setStudentInfo(null);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch(
                    `/api/specialists/mentor/group-invite-eligibility?chatId=${encodeURIComponent(String(chat.id))}`
                );
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setStudentInfo({
                    isActiveStudent: !!data.isActiveStudent,
                    memberGroups: Array.isArray(data.memberGroups) ? data.memberGroups : [],
                    canReinviteViaListing: !!data.canReinviteViaListing,
                });
            } catch {
                if (!cancelled) setStudentInfo(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [chat?.id, chat?.type, iAmMentor, contactsBump]);

    useEffect(() => {
        if (!chat || chat.type !== 'private') return;
        if (chat.is_saved_messages) {
            setListingIntro(false);
            setPeerInContacts(true);
            setFullUserDetails(null);
            void fetchChatStats();
            return;
        }

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

            setPeerInContacts(inContacts);

            const showListingCard =
                Boolean(chat.otherUser) &&
                !inContacts &&
                (isExpertListingChat(chat) ||
                    (isJobListingChat(chat) && getJobListingIntent(chat) === 'apply'));

            if (showListingCard) {
                const key = `listing:${chat.id}`;
                if (lastFetchKeyRef.current === key) return;
                lastFetchKeyRef.current = key;
                setListingIntro(true);
                setFullUserDetails({ ...chat.otherUser });
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
        chat?.is_saved_messages,
        chat?.participantId,
        chat?.participants,
        chat?.otherUser?.id,
        chat?.userId,
        chat?.metadata,
        contactsBump,
    ]);

    const fetchUserDetails = async () => {
        if (!chat) return;
        setImgError(false);
        try {
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) return;
            const res = await apiFetch(`/api/users/${targetId}`);
            if (res.ok) {
                const data = await res.json();
                setFullUserDetails(data);
                setEditForm({ name: data.name || '', surname: data.surname || '' });
                setIsBlocked(data.isBlocked || false);
            }
        } catch (err) {
            console.error('Failed to fetch user details:', err);
        }
    };

    const fetchChatStats = async () => {
        if (!chat?.id || chat.type !== 'private' || isPeerPreview) return;
        try {
            const res = await apiFetch(`/api/users/chat-stats/${chat.id}`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch chat stats:', err);
        }
    };

    const loadShared = useCallback(
        async (kind: 'links' | 'voice' | 'groups') => {
            if (!chat?.id || String(chat.id).startsWith('peer-preview:')) return;
            setSharedLoading(true);
            try {
                const res = await apiFetch(
                    `/api/users/chat-shared/${chat.id}?kind=${encodeURIComponent(kind)}`
                );
                if (!res.ok) {
                    showError(t('server_error'));
                    return;
                }
                const data = await res.json();
                if (kind === 'links') setSharedLinks(Array.isArray(data) ? data : []);
                if (kind === 'voice') setSharedVoice(Array.isArray(data) ? data : []);
                if (kind === 'groups') setSharedGroups(Array.isArray(data) ? data : []);
            } catch {
                showError(t('server_error'));
            } finally {
                setSharedLoading(false);
            }
        },
        [chat?.id, showError, t]
    );

    const openShared = (kind: 'links' | 'voice' | 'groups') => {
        setSharedView(kind);
        void loadShared(kind);
    };

    const handleCopyPhone = async () => {
        const phone = fullUserDetails?.phone || chat?.otherUser?.phone;
        if (!phone || phone === 'Скрыт') return;
        try {
            await navigator.clipboard.writeText(String(phone));
            showSuccess(t('msg_copied'));
        } catch {
            showError(t('server_error'));
        }
    };

    const handleBlock = async () => {
        const ok = await confirm({
            title: isBlocked ? t('unblock') : t('block'),
            description: isBlocked
                ? (t('unblock' as any) || 'Unblock')
                : (t('block') as string),
            variant: isBlocked ? 'default' : 'danger',
            confirmLabel: isBlocked ? t('unblock') : t('block'),
        });
        if (!ok) return;
        setActionLoading('block');
        try {
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) return;
            const res = await apiFetch(`/api/users/${isBlocked ? 'unblock' : 'block'}`, {
                method: 'POST',
                body: JSON.stringify({ targetId }),
            });
            if (res.ok) {
                setIsBlocked(!isBlocked);
                window.dispatchEvent(new CustomEvent('block_status_changed'));
                showSuccess(isBlocked ? t('unblock') : t('block'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
        }
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
                body: JSON.stringify({
                    contactUserId: targetId,
                    name: editForm.name,
                    surname: editForm.surname,
                }),
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
        } finally {
            setActionLoading(null);
        }
    };

    /** Telegram: Delete contact — chat qoladi, faqat kontakt o‘chadi */
    const handleDeleteContact = async () => {
        const ok = await confirm({
            title: t('delete_contact'),
            description: t('delete_contact_desc'),
            variant: 'danger',
            confirmLabel: t('delete_contact'),
        });
        if (!ok) return;
        setActionLoading('delete');
        try {
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) return;
            const res = await apiFetch(`/api/users/contacts/${targetId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setPeerInContacts(false);
                showSuccess(t('success_update'));
                window.dispatchEvent(new CustomEvent('contacts_updated'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(null);
        }
    };

    const jumpToMessage = (messageId: string) => {
        window.dispatchEvent(
            new CustomEvent('panel_jump_message', {
                detail: { chatId: String(chat.id), messageId: String(messageId) },
            })
        );
        onClose?.();
    };

    const openCommonGroup = (groupId: string) => {
        window.dispatchEvent(
            new CustomEvent('panel_open_chat', {
                detail: { chatId: String(groupId) },
            })
        );
        onClose?.();
    };

    if (!chat) return null;

    const isSavedMessages = !!chat.is_saved_messages;
    const user = fullUserDetails || chat;
    const jobSnap = listingIntro && isJobListingChat(chat) ? getJobListingSnapshot(chat) : null;
    const isJobListingIntro = Boolean(jobSnap);
    const listingPitch = listingIntro && !isJobListingIntro ? getExpertListingPitch(user) : '';
    const rawAvatar = user.avatar || user.avatar_url;
    const avatarUrl =
        rawAvatar && rawAvatar !== 'null' && rawAvatar !== '' && rawAvatar !== 'saved_messages'
            ? rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')
                ? rawAvatar
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${rawAvatar.startsWith('/') ? '' : '/'}${rawAvatar}`
            : null;

    const initials = user.name ? user.name.substring(0, 1).toUpperCase() : '?';
    const hasPhone = !listingIntro && !isSavedMessages && user.phone && user.phone !== 'Скрыт';
    const username = !listingIntro && !isSavedMessages && user.username ? `@${user.username}` : '';

    if (sharedView !== 'main') {
        const title =
            sharedView === 'links'
                ? t('links_count')
                : sharedView === 'voice'
                  ? t('voice_messages_count')
                  : t('common_groups_count');
        return (
            <div className="fixed lg:relative inset-0 lg:inset-auto z-[70] lg:z-0 h-full min-h-0 w-full flex flex-col bg-[#212121] overflow-hidden select-none relative pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
                <div className="flex items-center gap-2 px-3 py-3 border-b border-white/[0.06]">
                    <button
                        type="button"
                        onClick={() => setSharedView('main')}
                        className="p-2 rounded-full text-[#aaaaaa] hover:text-white hover:bg-white/[0.08]"
                        aria-label="Back"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <h3 className="text-[15px] font-medium text-white truncate flex-1">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-[#aaaaaa] hover:text-white hover:bg-white/[0.08]"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                    {sharedLoading ? (
                        <div className="flex items-center justify-center py-16 text-[#aaaaaa]">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : sharedView === 'links' ? (
                        sharedLinks.length === 0 ? (
                            <EmptyShared />
                        ) : (
                            sharedLinks.map((item) => {
                                const url = extractFirstUrl(item.content);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => jumpToMessage(item.id)}
                                        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/[0.04] border-b border-white/[0.04]"
                                    >
                                        <Link className="h-5 w-5 text-[#8774e1] shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[14px] text-[#6ab3f3] truncate">
                                                {url || item.content}
                                            </p>
                                            <p className="text-[12px] text-[#aaaaaa] mt-0.5">
                                                {formatShortTime(item.created_at)}
                                            </p>
                                        </div>
                                        {url && (
                                            <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1.5 rounded-full text-[#aaaaaa] hover:text-white hover:bg-white/[0.08]"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </button>
                                );
                            })
                        )
                    ) : sharedView === 'voice' ? (
                        sharedVoice.length === 0 ? (
                            <EmptyShared />
                        ) : (
                            sharedVoice.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => jumpToMessage(item.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] border-b border-white/[0.04]"
                                >
                                    <Mic className="h-5 w-5 text-[#8774e1] shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14px] text-white/90">{t('voice_message')}</p>
                                        <p className="text-[12px] text-[#aaaaaa] mt-0.5">
                                            {formatShortTime(item.created_at)}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )
                    ) : sharedGroups.length === 0 ? (
                        <EmptyShared />
                    ) : (
                        sharedGroups.map((g) => (
                            <button
                                key={g.id}
                                type="button"
                                onClick={() => openCommonGroup(g.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] border-b border-white/[0.04]"
                            >
                                <div className="h-10 w-10 rounded-full bg-[#8774e1]/25 flex items-center justify-center text-white font-medium overflow-hidden shrink-0">
                                    {g.avatar ? (
                                        <img src={g.avatar} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        (g.name || '?')[0].toUpperCase()
                                    )}
                                </div>
                                <span className="text-[15px] text-white truncate">{g.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // Telegram Saved Messages: bookmark avatar, no peer profile / call / block / phone
    if (isSavedMessages) {
        return (
            <div className="fixed lg:relative inset-0 lg:inset-auto z-[70] lg:z-0 h-full min-h-0 w-full flex flex-col bg-[#212121] overflow-hidden select-none relative pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
                <button
                    onClick={onClose}
                    className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 p-2 text-[#aaaaaa] hover:text-white hover:bg-white/[0.08] rounded-full transition-all lg:top-4"
                >
                    <X className="h-6 w-6" />
                </button>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar">
                    <div className="flex flex-col items-center pt-10 pb-6 px-4">
                        <div className="w-28 h-28 rounded-full bg-[#2AABEE] overflow-hidden flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-14 w-14 fill-white" aria-hidden>
                                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-medium text-white text-center leading-tight">
                            {t('saved_messages')}
                        </h2>
                    </div>

                    <div className="flex justify-center gap-2 px-4 mb-8">
                        <ActionButton
                            icon={<MessageCircle className="h-5 w-5" />}
                            label={t('chats')}
                            onClick={handleOpenChat}
                        />
                        <ActionButton
                            icon={chatMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                            label={chatMuted ? t('unmute_chat') : t('mute_chat')}
                            onClick={handleToggleMute}
                        />
                    </div>

                    <div className="w-full space-y-1">
                        <div className="py-2">
                            <MenuItem
                                icon={<Link className="h-5 w-5" />}
                                label={`${stats.linksCount} ${t('links_count')}`}
                                onClick={() => openShared('links')}
                            />
                            <MenuItem
                                icon={<Mic className="h-5 w-5" />}
                                label={`${stats.voiceCount} ${t('voice_messages_count')}`}
                                onClick={() => openShared('voice')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed lg:relative inset-0 lg:inset-auto z-[70] lg:z-0 h-full min-h-0 w-full flex flex-col bg-[#212121] overflow-hidden select-none relative pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
            <button
                onClick={onClose}
                className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 z-20 p-2 text-[#aaaaaa] hover:text-white hover:bg-white/[0.08] rounded-full transition-all lg:top-4"
            >
                <X className="h-6 w-6" />
            </button>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain custom-scrollbar">
                {listingIntro && (
                    <div className="mx-4 mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/95 leading-snug">
                        <span className="font-bold text-amber-200">
                            {isJobListingIntro ? t('job_chat_banner_title') : t('listing_chat_prompt')}
                        </span>{' '}
                        {isJobListingIntro ? t('job_chat_banner_apply') : t('listing_chat_prompt_desc')}
                    </div>
                )}

                <div className="flex flex-col items-center pt-10 pb-6 px-4">
                    <div className="relative mb-4">
                        <button
                            type="button"
                            onClick={() => avatarUrl && !imgError && setAvatarLightboxOpen(true)}
                            className={`w-28 h-28 rounded-full bg-[#8774e1] overflow-hidden flex items-center justify-center text-white text-3xl font-medium ${avatarUrl && !imgError ? 'cursor-zoom-in ring-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8774e1]' : ''}`}
                            aria-label="Profil rasmi"
                        >
                            {avatarUrl && !imgError ? (
                                <img
                                    src={avatarUrl}
                                    className="w-full h-full rounded-full object-cover"
                                    alt={user.name}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <span>{initials}</span>
                            )}
                        </button>
                    </div>

                    {isEditing ? (
                        <div className="w-full max-w-[200px] flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
                            <input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                placeholder={t('name')}
                                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500/50"
                            />
                            <input
                                value={editForm.surname}
                                onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                                placeholder={t('surname')}
                                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-blue-500/50"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-1 text-xs text-white/40 hover:text-white"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    onClick={handleUpdateContact}
                                    disabled={actionLoading === 'edit'}
                                    className="flex-1 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 text-xs rounded-lg flex items-center justify-center gap-1"
                                >
                                    {actionLoading === 'edit' ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                        <Check className="h-3 w-3" />
                                    )}
                                    {t('save')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-medium text-white text-center leading-tight">
                                {user.name} {user.surname || ''}
                            </h2>
                            {username && <p className="text-[#aaaaaa] text-sm mt-0.5">{username}</p>}
                        </>
                    )}

                    <p className="text-[#8774e1] text-[14px] mt-1">
                        {listingIntro ? t('listing_profile') : user.isOnline ? t('online') : t('last_seen_recent')}
                    </p>
                </div>

                {/* Telegram Desktop: Message / Call / Mute */}
                {!listingIntro && (
                    <div className="flex justify-center gap-2 px-4 mb-8">
                        <ActionButton
                            icon={<MessageCircle className="h-5 w-5" />}
                            label={t('chats')}
                            onClick={handleOpenChat}
                        />
                        <ActionButton
                            icon={<Phone className="h-5 w-5" />}
                            label={t('voice_call')}
                            onClick={handleVoiceCall}
                        />
                        {!isPeerPreview && (
                            <ActionButton
                                icon={chatMuted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                                label={chatMuted ? t('unmute_chat') : t('mute_chat')}
                                onClick={handleToggleMute}
                            />
                        )}
                    </div>
                )}

                {listingIntro && !peerInContacts && (
                    <div className="px-4 mb-6">
                        <button
                            type="button"
                            disabled={actionLoading === 'add_contact'}
                            onClick={async () => {
                                const targetId = getPrivateChatPeerUserId(chat);
                                if (!targetId) return;
                                setActionLoading('add_contact');
                                try {
                                    const res = await apiFetch('/api/users/contacts', {
                                        method: 'POST',
                                        body: JSON.stringify({
                                            contactUserId: targetId,
                                            name: chat.otherUser?.name || user.name || 'User',
                                            surname: chat.otherUser?.surname || '',
                                        }),
                                    });
                                    if (res.ok) {
                                        setPeerInContacts(true);
                                        showSuccess(t('success_update'));
                                        window.dispatchEvent(new Event('contacts_updated'));
                                    } else {
                                        showError(t('contact_save_error'));
                                    }
                                } catch {
                                    showError(t('contact_save_error'));
                                } finally {
                                    setActionLoading(null);
                                }
                            }}
                            className="w-full py-2.5 rounded-xl bg-[#8774e1]/20 text-[#8774e1] text-[14px] font-medium hover:bg-[#8774e1]/30 disabled:opacity-50"
                        >
                            {actionLoading === 'add_contact' ? t('adding') : t('add')}
                        </button>
                        <p className="text-center text-[11px] text-[#707579] mt-2">
                            {t('listing_save_contact_hint')}
                        </p>
                    </div>
                )}

                <div className="w-full space-y-1">
                    <button
                        type="button"
                        onClick={hasPhone ? handleCopyPhone : undefined}
                        className={`w-full px-6 py-4 border-t border-white/5 text-left ${hasPhone ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'}`}
                    >
                        <h3 className="text-white text-[15px] font-medium">
                            {listingIntro ? '—' : hasPhone ? user.phone : t('hidden')}
                        </h3>
                        <p className="text-[#8774e1] text-xs">
                            {listingIntro
                                ? t('telegram_link_desc').replace('Telegram', 'Telegram/Username')
                                : t('phone_number')}
                        </p>
                    </button>

                    {listingIntro && isJobListingIntro && jobSnap && (
                        <>
                            <div className="h-px bg-white/5 mx-2" />
                            <div className="px-6 py-4">
                                <h3 className="text-white text-[14px] font-medium">{jobListingTitle(jobSnap)}</h3>
                                <p className="text-[#8774e1] text-xs mt-1">{jobListingSubtitle(jobSnap)}</p>
                            </div>
                        </>
                    )}

                    {listingIntro && !isJobListingIntro && user.profession && (
                        <>
                            <div className="h-px bg-white/5 mx-2" />
                            <div className="px-6 py-4">
                                <h3 className="text-white text-[14px]">{user.profession}</h3>
                                <p className="text-[#8774e1] text-xs mt-1">{t('listing_profession')}</p>
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
                                <p className="text-[#8774e1] text-xs mt-1">{t('listing_description')}</p>
                            </div>
                        </>
                    )}

                    {!listingIntro && user.bio && (
                        <>
                            <div className="h-px bg-white/5 mx-2" />
                            <div className="px-6 py-4">
                                <h3 className="text-white text-[14px] leading-relaxed">{user.bio}</h3>
                                <p className="text-[#8774e1] text-xs mt-1">{t('bio')}</p>
                            </div>
                        </>
                    )}

                    <div className="h-px bg-white/5 mx-2" />

                    <div className="py-2">
                        <MenuItem
                            icon={<Link className="h-5 w-5" />}
                            label={`${stats.linksCount} ${t('links_count')}`}
                            onClick={() => openShared('links')}
                        />
                        <MenuItem
                            icon={<Mic className="h-5 w-5" />}
                            label={`${stats.voiceCount} ${t('voice_messages_count')}`}
                            onClick={() => openShared('voice')}
                        />
                        <MenuItem
                            icon={<Users className="h-5 w-5" />}
                            label={`${stats.commonGroupsCount} ${t('common_groups_count')}`}
                            onClick={() => openShared('groups')}
                        />
                    </div>

                    {iAmMentor && studentInfo?.isActiveStudent && (
                        <>
                            <div className="h-px bg-white/5 mx-2" />
                            <div className="px-6 py-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8774e1]/15 text-[#8774e1]">
                                        <GraduationCap className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-white text-[15px] font-medium">
                                            {t('student_status_label')}
                                        </p>
                                        <p className="text-[#8774e1] text-xs mt-0.5">
                                            {t('student_status_active_desc')}
                                        </p>
                                    </div>
                                </div>
                                {studentInfo.memberGroups.length > 0 && (
                                    <ul className="mt-2 space-y-1.5 pl-12">
                                        {studentInfo.memberGroups.map((g) => (
                                            <li key={g.id} className="text-[13px] text-white/75">
                                                · {g.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}

                    <div className="h-px bg-white/5 mx-2" />

                    <div className="py-2 pb-10">
                        {!listingIntro && peerInContacts && (
                            <MenuItem
                                icon={<Edit3 className="h-5 w-5" />}
                                label={t('edit_contact')}
                                onClick={() => setIsEditing(true)}
                            />
                        )}
                        {!listingIntro && peerInContacts && (
                            <MenuItem
                                icon={
                                    actionLoading === 'delete' ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-5 w-5" />
                                    )
                                }
                                label={t('delete_contact')}
                                onClick={handleDeleteContact}
                            />
                        )}
                        <MenuItem
                            icon={
                                actionLoading === 'block' ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <ShieldAlert className="h-5 w-5 text-rose-500" />
                                )
                            }
                            label={isBlocked ? t('unblock') : t('block')}
                            className="text-rose-500"
                            onClick={handleBlock}
                        />
                    </div>
                </div>
            </div>
            {avatarLightboxOpen && avatarUrl && (
                <AvatarLightbox
                    src={avatarUrl}
                    alt={user.name || ''}
                    onClose={() => setAvatarLightboxOpen(false)}
                />
            )}
        </div>
    );
}

function EmptyShared() {
    return (
        <div className="flex items-center justify-center py-16 text-[14px] text-white/30">—</div>
    );
}

function ActionButton({
    icon,
    label,
    onClick,
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex-1 flex flex-col items-center gap-2 px-2 py-3 rounded-xl bg-[#181818] hover:bg-[#2b2b2b] transition-colors group"
        >
            <div className="text-[#8774e1] group-hover:text-white transition-colors">{icon}</div>
            <span className="text-[12px] text-[#aaaaaa] group-hover:text-white text-center leading-tight">
                {label}
            </span>
        </button>
    );
}

function MenuItem({
    icon,
    label,
    onClick,
    className = '',
}: {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-6 py-3 hover:bg-white/[0.04] transition-colors group ${className}`}
        >
            <div className="w-6 flex items-center justify-center text-[#aaaaaa] group-hover:text-white transition-colors">
                {icon}
            </div>
            <span className="text-[14px] font-medium text-white/80 group-hover:text-white">{label}</span>
        </button>
    );
}
