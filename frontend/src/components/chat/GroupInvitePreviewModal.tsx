'use client';

import React, { useEffect, useState } from 'react';
import { Users, X, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type InvitePreview = {
    status: 'ok' | 'already' | 'not_found' | 'invalid' | 'error';
    alreadyMember?: boolean;
    requiresSubscription?: boolean;
    hasSubscription?: boolean;
    canJoin?: boolean;
    memberCount?: number;
    sampleMembers?: Array<{ id: string; name?: string; surname?: string; avatar?: string }>;
    chat?: {
        id: string;
        name?: string | null;
        description?: string | null;
        avatar_url?: string | null;
        type?: string;
    };
    message?: string;
};

function avatarSrc(path?: string | null) {
    if (!path || path === 'null') return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

type Props = {
    inviteToken: string;
    onClose: () => void;
    /** Qo‘shilgandan (joined=true) yoki allaqachon a’zo */
    onOpenChat: (chatId: string, joined: boolean) => void;
};

export default function GroupInvitePreviewModal({ inviteToken, onClose, onOpenChat }: Props) {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [preview, setPreview] = useState<InvitePreview | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await apiFetch(`/api/chats/invite/${encodeURIComponent(inviteToken)}`);
                const data = (await res.json().catch(() => ({}))) as InvitePreview;
                if (cancelled) return;
                if (!res.ok) {
                    setPreview(data?.status ? data : { status: 'not_found', message: data?.message });
                    setError(data?.message || (t('invite_link_invalid') as string));
                    return;
                }
                setPreview(data);
            } catch {
                if (!cancelled) {
                    setError(t('error_server_connection') as string);
                    setPreview({ status: 'error' });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [inviteToken, t]);

    const handlePrimary = async () => {
        if (!preview?.chat?.id) return;
        if (preview.alreadyMember || preview.status === 'already') {
            onOpenChat(preview.chat.id, false);
            return;
        }
        if (preview.requiresSubscription && !preview.hasSubscription) {
            setError(t('subscription_pay_via_invite') as string);
            return;
        }
        setJoining(true);
        setError(null);
        try {
            const res = await apiFetch(`/api/chats/invite/${encodeURIComponent(inviteToken)}/join`, {
                method: 'POST',
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 403 && data?.status === 'needs_subscription') {
                setError(data.message || (t('subscription_pay_via_invite') as string));
                setPreview((p) => (p ? { ...p, canJoin: false, hasSubscription: false } : p));
                return;
            }
            if (!res.ok) {
                setError(data?.message || (t('invite_link_invalid') as string));
                return;
            }
            onOpenChat(String(data.chatId || preview.chat.id), data?.status !== 'already');
        } catch {
            setError(t('error_server_connection') as string);
        } finally {
            setJoining(false);
        }
    };

    const chat = preview?.chat;
    const name = chat?.name || (t('group_label') as string) || 'Guruh';
    const av = avatarSrc(chat?.avatar_url);
    const members = preview?.sampleMembers || [];
    const needsSub = !!(preview?.requiresSubscription && !preview?.hasSubscription && !preview?.alreadyMember);
    const primaryLabel = preview?.alreadyMember || preview?.status === 'already'
        ? (t('invite_open_chat') as string)
        : (t('invite_join_group') as string);

    return (
        <div
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={onClose}
            role="dialog"
            aria-modal
        >
            <div
                className="w-full max-w-[380px] overflow-hidden rounded-t-3xl border border-white/[0.08] bg-[#212121] shadow-2xl animate-in slide-in-from-bottom-4 duration-200 sm:rounded-2xl sm:slide-in-from-bottom-0 sm:zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                    <span className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">
                        {t('invite_preview_title') as string}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-[#8774e1]" />
                        <p className="text-sm text-white/50">{t('loading') as string}</p>
                    </div>
                ) : preview?.status === 'not_found' || preview?.status === 'invalid' || preview?.status === 'error' || !preview?.chat ? (
                    <div className="px-6 py-10 text-center space-y-3">
                        <p className="text-lg font-bold text-white">{t('invite_expired') as string}</p>
                        <p className="text-sm text-white/55">{error || (t('invite_expired_hint') as string)}</p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-2 w-full rounded-xl bg-white/10 py-3 text-sm font-bold text-white hover:bg-white/15"
                        >
                            {t('close_btn') as string}
                        </button>
                    </div>
                ) : (
                    <div className="px-6 pb-6 pt-2 flex flex-col items-center">
                        <div className="w-[88px] h-[88px] rounded-full bg-[#766ac8] overflow-hidden flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {av ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={av} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>{String(name).charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <h2 className="mt-4 text-center text-[20px] font-semibold text-white break-words max-w-full">
                            {name}
                        </h2>
                        <p className="mt-1 flex items-center gap-1.5 text-[14px] text-[#aaaaaa]">
                            <Users className="h-3.5 w-3.5" />
                            {preview?.memberCount != null
                                ? `${preview.memberCount} ${(t('members_count_label') as string) || "a'zo"}`
                                : null}
                        </p>
                        {chat?.description ? (
                            <p className="mt-3 text-center text-[13px] text-white/60 line-clamp-3">{chat.description}</p>
                        ) : null}

                        {members.length > 0 ? (
                            <div className="mt-4 flex -space-x-2">
                                {members.map((m) => {
                                    const mAv = avatarSrc(m.avatar);
                                    const label = [m.name, m.surname].filter(Boolean).join(' ') || '?';
                                    return (
                                        <div
                                            key={m.id}
                                            title={label}
                                            className="w-9 h-9 rounded-full border-2 border-[#212121] bg-[#766ac8] overflow-hidden flex items-center justify-center text-[11px] font-bold text-white"
                                        >
                                            {mAv ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={mAv} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                label.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}

                        {error ? (
                            <p className="mt-4 text-center text-[13px] text-amber-300/95 leading-snug">{error}</p>
                        ) : null}
                        {needsSub && !error ? (
                            <p className="mt-4 text-center text-[13px] text-amber-200/90 leading-snug">
                                {t('subscription_pay_via_invite') as string}
                            </p>
                        ) : null}
                        {preview?.alreadyMember ? (
                            <p className="mt-3 text-center text-[13px] text-emerald-300/90">
                                {t('invite_already_member') as string}
                            </p>
                        ) : null}

                        <button
                            type="button"
                            disabled={joining || (needsSub && !preview?.alreadyMember)}
                            onClick={handlePrimary}
                            className={`mt-5 w-full rounded-xl py-3.5 text-[15px] font-bold transition-colors ${
                                needsSub && !preview?.alreadyMember
                                    ? 'bg-white/10 text-white/45 cursor-not-allowed'
                                    : 'bg-[#8774e1] text-white hover:bg-[#766ac8] shadow-lg shadow-[#8774e1]/25'
                            }`}
                        >
                            {joining ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t('sending_label') as string}
                                </span>
                            ) : (
                                primaryLabel
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="mt-2 w-full rounded-xl py-3 text-[14px] font-medium text-white/55 hover:bg-white/5 hover:text-white"
                        >
                            {t('cancel') as string}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
