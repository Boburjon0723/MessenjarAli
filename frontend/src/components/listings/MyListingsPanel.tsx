'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, MessageSquare, Plus, User } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { getChatMetadata, jobListingTitle } from '@/lib/listing-chat';

type JobRow = {
    id: string;
    sub_type?: string;
    type?: string;
    status?: string;
    short_text?: string;
    company_name?: string;
    full_name?: string;
    category_name_uz?: string;
    created_at?: string;
};

export type MyListingsPanelProps = {
    currentUser: any;
    chats: any[];
    onBack: () => void;
    onOpenChat: (chat: any) => void;
    onOpenJobsMarket: () => void;
    onOpenProfile: () => void;
    /** Ishlar paneli ichida — tashqi header yashiriladi */
    embedded?: boolean;
};

export default function MyListingsPanel({
    currentUser,
    chats,
    onBack,
    onOpenChat,
    onOpenJobsMarket,
    onOpenProfile,
    embedded = false,
}: MyListingsPanelProps) {
    const { t } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const { confirm } = useConfirm();
    const [jobs, setJobs] = useState<JobRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/api/jobs/mine');
            if (res.ok) {
                const data = await res.json();
                setJobs(Array.isArray(data) ? data : []);
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const applicationChatsByJob = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const chat of chats || []) {
            if (chat?.type !== 'private') continue;
            const meta = getChatMetadata(chat);
            if (meta.source !== 'job_listing' || meta.intent !== 'apply' || !meta.job_id) continue;
            if (String(meta.poster_id) !== String(currentUser?.id)) continue;
            const jid = String(meta.job_id);
            const list = map.get(jid) ?? [];
            list.push(chat);
            map.set(jid, list);
        }
        return map;
    }, [chats, currentUser?.id]);

    const expertListingChats = useMemo(
        () =>
            (chats || []).filter((chat) => {
                if (chat?.type !== 'private') return false;
                const meta = getChatMetadata(chat);
                return (
                    meta.source === 'expert_listing' &&
                    String(meta.expert_id) === String(currentUser?.id)
                );
            }),
        [chats, currentUser?.id]
    );

    const toggleJobStatus = async (job: JobRow) => {
        const id = String(job.id);
        const nextStatus = job.status === 'closed' ? 'active' : 'closed';
        if (nextStatus === 'closed') {
            const ok = await confirm({
                title: t('listing_close_ad') as any,
                description: t('listing_close_ad_confirm') as any,
                variant: 'danger',
                confirmLabel: t('listing_close_ad') as any,
            });
            if (!ok) return;
        }
        setStatusLoadingId(id);
        try {
            const res = await apiFetch(`/api/jobs/${encodeURIComponent(id)}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status: nextStatus }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(typeof data?.message === 'string' ? data.message : t('server_error'));
            }
            setJobs((prev) =>
                prev.map((j) => (String(j.id) === id ? { ...j, status: nextStatus } : j))
            );
            showSuccess(t('success_update') as string);
        } catch (e) {
            showError(e instanceof Error ? e.message : (t('server_error') as string));
        } finally {
            setStatusLoadingId(null);
        }
    };

    const statusLabel = (status?: string) =>
        status === 'closed' ? t('listing_status_closed') : t('listing_status_active');

    const inquiryLabel = (n: number) =>
        String(t('my_ads_inquiry_count')).replace('{n}', String(n));

    const isExpert = !!currentUser?.is_expert;

    return (
        <div
            className={`flex flex-col flex-1 min-h-0 h-full overflow-hidden ${
                embedded ? 'bg-[#181818]' : 'bg-[#14161c]'
            }`}
        >
            {!embedded && (
                <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#14161c]/95 backdrop-blur-xl">
                    <button
                        type="button"
                        onClick={onBack}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-white/90 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 shrink-0" />
                        <span className="text-sm font-semibold">{t('back')}</span>
                    </button>
                    <h2 className="text-white font-bold text-base truncate">{t('my_ads')}</h2>
                </header>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="mx-auto w-full max-w-xl px-4 py-5 space-y-6">
                    {/* Kasb e'loni */}
                    {isExpert && (
                        <section className="space-y-2.5">
                            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#777587]">
                                {t('listing_profession')}
                            </h3>
                            <div className="rounded-2xl border border-[#8774e1]/30 bg-gradient-to-br from-[#8774e1]/15 to-[#8774e1]/[0.04] p-4">
                                <div className="flex gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8774e1]">
                                        <User className="h-5 w-5 text-white" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-semibold text-white leading-snug">
                                            {currentUser?.profession ||
                                                currentUser?.name ||
                                                t('listing_profession')}
                                        </p>
                                        <p className="mt-1 text-[13px] text-[#aaaaaa]">
                                            {expertListingChats.length > 0
                                                ? inquiryLabel(expertListingChats.length)
                                                : t('my_ads_no_inquiries')}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onOpenProfile}
                                        className="h-9 rounded-xl bg-[#8774e1] px-3.5 text-[13px] font-semibold text-white hover:bg-[#7b68d4] transition-colors"
                                    >
                                        {t('profile')}
                                    </button>
                                    {expertListingChats.slice(0, 4).map((chat) => (
                                        <button
                                            key={String(chat.id ?? chat._id)}
                                            type="button"
                                            onClick={() => onOpenChat(chat)}
                                            className="inline-flex h-9 max-w-[11rem] items-center gap-1.5 rounded-xl bg-white/[0.08] px-3 text-[12px] text-white/90 hover:bg-white/[0.12] transition-colors"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[#8774e1]" />
                                            <span className="truncate">
                                                {chat.name || t('sidebar_murojaatlar')}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Ish e'lonlari */}
                    <section className="space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#777587]">
                                {t('my_job_ads')}
                            </h3>
                            <button
                                type="button"
                                onClick={onOpenJobsMarket}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#8774e1]/15 px-2.5 text-[12px] font-semibold text-[#8774e1] hover:bg-[#8774e1]/25 transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                {t('my_ads_create_job')}
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#8774e1]" />
                            </div>
                        ) : jobs.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center">
                                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                                    <Briefcase className="h-5 w-5 text-[#777587]" />
                                </div>
                                <p className="text-[14px] text-white/70">{t('my_ads_no_job_listings')}</p>
                                <p className="mt-1 text-[12px] text-[#777587]">{t('my_ads_no_job_hint')}</p>
                                <button
                                    type="button"
                                    onClick={onOpenJobsMarket}
                                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#8774e1] px-4 text-[13px] font-semibold text-white hover:bg-[#7b68d4] transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('my_ads_create_job')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {jobs.map((job) => {
                                    const apps = applicationChatsByJob.get(String(job.id)) ?? [];
                                    const title =
                                        job.company_name ||
                                        job.full_name ||
                                        job.short_text?.slice(0, 60) ||
                                        "E'lon";
                                    const isClosed = job.status === 'closed';
                                    const busy = statusLoadingId === String(job.id);
                                    return (
                                        <div
                                            key={job.id}
                                            className={`rounded-2xl border p-3.5 ${
                                                isClosed
                                                    ? 'border-white/5 bg-white/[0.02] opacity-75'
                                                    : 'border-white/[0.08] bg-white/[0.04]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-[14px] font-medium text-white">
                                                        {title}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-[#aaaaaa]">
                                                        {job.category_name_uz || job.type} ·{' '}
                                                        {statusLabel(job.status)}
                                                    </p>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    {apps.length > 0 && (
                                                        <span className="rounded-full bg-[#8774e1]/15 px-2 py-0.5 text-[11px] font-bold text-[#8774e1]">
                                                            {apps.length}
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => void toggleJobStatus(job)}
                                                        className="rounded-lg border border-white/12 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
                                                    >
                                                        {busy
                                                            ? '...'
                                                            : isClosed
                                                              ? t('listing_reopen_ad')
                                                              : t('listing_close_ad')}
                                                    </button>
                                                </div>
                                            </div>
                                            {apps.length > 0 && (
                                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                                    {apps.slice(0, 5).map((chat) => (
                                                        <button
                                                            key={String(chat.id ?? chat._id)}
                                                            type="button"
                                                            onClick={() => onOpenChat(chat)}
                                                            className="inline-flex max-w-[10rem] items-center gap-1 rounded-lg bg-white/[0.08] px-2.5 py-1 text-[11px] text-white/85 hover:bg-white/[0.12]"
                                                        >
                                                            <MessageSquare className="h-3 w-3 shrink-0 text-[#8774e1]" />
                                                            <span className="truncate">
                                                                {chat.name ||
                                                                    jobListingTitle(
                                                                        getChatMetadata(chat)
                                                                            .snapshot || {}
                                                                    )}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
