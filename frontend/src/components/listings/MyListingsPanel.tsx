'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, MessageSquare, User } from 'lucide-react';
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
};

export default function MyListingsPanel({
    currentUser,
    chats,
    onBack,
    onOpenChat,
    onOpenJobsMarket,
    onOpenProfile,
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

    return (
        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden bg-[#14161c]">
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

            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-4">
                {currentUser?.is_expert && (
                    <section className="rounded-2xl border border-[#8774e1]/25 bg-[#8774e1]/10 p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-[#8774e1]/20">
                                <User className="h-5 w-5 text-[#8774e1]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-semibold text-sm">{t('listing_profession')}</h3>
                                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                                    {expertListingChats.length > 0
                                        ? `${expertListingChats.length} ta murojaat chat`
                                        : t('no_messages')}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={onOpenProfile}
                                        className="text-[13px] font-medium text-[#8774e1] hover:underline"
                                    >
                                        {t('profile')}
                                    </button>
                                    {expertListingChats.slice(0, 4).map((chat) => (
                                        <button
                                            key={String(chat.id ?? chat._id)}
                                            type="button"
                                            onClick={() => onOpenChat(chat)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] text-white/80 hover:bg-white/15"
                                        >
                                            <MessageSquare className="h-3 w-3" />
                                            {chat.name || t('sidebar_murojaatlar')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <section>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#8774e1]" />
                            {t('jobs')}
                        </h3>
                        <button
                            type="button"
                            onClick={onOpenJobsMarket}
                            className="text-xs text-[#8774e1] hover:underline"
                        >
                            +
                        </button>
                    </div>

                    {loading ? (
                        <div className="py-8 flex justify-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : jobs.length === 0 ? (
                        <p className="text-white/50 text-sm text-center py-8">{t('nothing_found')}</p>
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
                                        className={`rounded-xl border p-3 ${
                                            isClosed
                                                ? 'border-white/5 bg-white/[0.02] opacity-80'
                                                : 'border-white/10 bg-white/[0.04]'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{title}</p>
                                                <p className="text-white/45 text-[11px] mt-0.5">
                                                    {job.category_name_uz || job.type} · {statusLabel(job.status)}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                {apps.length > 0 && (
                                                    <span className="text-[11px] font-bold text-[#8774e1] bg-[#8774e1]/15 px-2 py-0.5 rounded-full">
                                                        {apps.length}
                                                    </span>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={busy}
                                                    onClick={() => void toggleJobStatus(job)}
                                                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-white/15 text-white/80 hover:bg-white/10 disabled:opacity-50"
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
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {apps.slice(0, 5).map((chat) => (
                                                    <button
                                                        key={String(chat.id ?? chat._id)}
                                                        type="button"
                                                        onClick={() => onOpenChat(chat)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-[11px] text-white/80 hover:bg-white/15"
                                                    >
                                                        <MessageSquare className="h-3 w-3" />
                                                        {chat.name ||
                                                            jobListingTitle(
                                                                getChatMetadata(chat).snapshot || {}
                                                            )}
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
    );
}
