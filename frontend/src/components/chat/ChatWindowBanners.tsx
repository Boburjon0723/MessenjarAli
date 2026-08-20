'use client';

import React, { useState } from 'react';
import type { ServiceSessionPayload, TradeDetails } from '@/types/chat-room';
import {
    getChatMetadata,
    getApplicationStatus,
    getJobListingIntent,
    getJobListingSnapshot,
    isApplicationPending,
    isApplicationRejected,
    isExpertListingChat,
    isJobListingChat,
    jobListingSubtitle,
    jobListingTitle,
} from '@/lib/listing-chat';
import { getChatConsent, isListingChat, isMessagingUnlocked } from '@/lib/chat-consent';
import { postListingConsent } from '@/lib/listing-consent-api';
import { useNotification } from '@/context/NotificationContext';
import { isPrivatePeerUnavailable } from '@/lib/private-chat-peer';
import ChatPaymentStatusCard from './ChatPaymentStatusCard';

export type ChatWindowBannersProps = {
    t: (...args: any[]) => string;
    chat?: any;
    currentUserId?: string;
    onChatMetadataUpdate?: (metadata: Record<string, unknown>) => void;
    chatSummary: string | null;
    setChatSummary: (v: string | null) => void;
    summaryError: string | null;
    setSummaryError: (v: string | null) => void;
    chatCompliance: { title: string; lines: string[] } | null;
    isTrade: boolean;
    isComplianceDismissed: boolean;
    setIsComplianceDismissed: (v: boolean) => void;
    isContact: boolean;
    handleAddContact: () => void;
    isAddingContact: boolean;
    handleBlockUser: () => void;
    tradeData: TradeDetails | null | undefined;
    activeSession: ServiceSessionPayload | null | undefined;
};

export function ChatWindowBanners({
    t,
    chat,
    currentUserId,
    onChatMetadataUpdate,
    chatSummary,
    setChatSummary,
    summaryError,
    setSummaryError,
    chatCompliance,
    isTrade,
    isComplianceDismissed,
    setIsComplianceDismissed,
    isContact,
    handleAddContact,
    isAddingContact,
    handleBlockUser,
    tradeData,
    activeSession,
}: ChatWindowBannersProps) {
    const { showError, showSuccess } = useNotification();
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [consentLoading, setConsentLoading] = useState(false);
    const jobSnap = chat ? getJobListingSnapshot(chat) : null;
    const jobIntent = chat ? getJobListingIntent(chat) : null;
    const isExpertListing = chat ? isExpertListingChat(chat) : false;
    const isJobListing = chat ? isJobListingChat(chat) : false;
    const meta = chat ? getChatMetadata(chat) : {};
    const consent = chat ? getChatConsent(chat) : {};
    const uid = currentUserId ? String(currentUserId) : '';
    const isExpertSide = isExpertListing && String(meta.expert_id) === uid;
    const isEmployerSide =
        isJobListing && jobIntent === 'apply' && String(meta.poster_id) === uid;
    const isClientSide = uid && !isExpertSide && !isEmployerSide;

    const runConsent = async (
        action: 'client_accept' | 'expert_accept' | 'employer_accept' | 'employer_reject',
        reason?: string
    ) => {
        if (!chat?.id) return;
        setConsentLoading(true);
        try {
            const { metadata } = await postListingConsent(String(chat.id), action, { reason });
            onChatMetadataUpdate?.(metadata);
            if (action === 'employer_reject') {
                setShowRejectForm(false);
                setRejectReason('');
            }
            showSuccess(t('success_update'));
        } catch (e) {
            showError(e instanceof Error ? e.message : t('server_error'));
        } finally {
            setConsentLoading(false);
        }
    };

    const applicationStatus = chat ? getApplicationStatus(chat) : undefined;
    const applicationPending = chat ? isApplicationPending(chat) : false;
    const applicationRejected = chat ? isApplicationRejected(chat) : false;

    return (
        <>
            {/* AI Summary Banner */}
            {chatSummary && (
                <div className="z-10 mt-2">
                    <div className="bg-purple-900/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-lg animate-slide-down relative">
                        <button onClick={() => setChatSummary(null)} className="absolute top-2 right-2 p-1 text-white/50 hover:text-white bg-white/5 rounded-full">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span className="text-sm font-bold text-purple-200">{t('ai_summary')} {t('ai_summary_desc')}</span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed pl-7">{chatSummary}</p>
                    </div>
                </div>
            )}

            {summaryError && (
                <div className="z-10 mt-2">
                    <div className="bg-red-900/40 backdrop-blur-xl border border-red-500/30 rounded-2xl p-3 shadow-lg flex justify-between items-center animate-slide-down">
                        <span className="text-xs text-red-200">{summaryError}</span>
                        <button onClick={() => setSummaryError(null)} className="text-white/50 hover:text-white p-1 ml-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
            )}

            {/* Special Banners Container */}
            <div className="z-10 space-y-1">
                {isJobListing && jobSnap && (
                    <div className="mt-1 rounded-[24px] bg-[#212121] border border-white/[0.06] p-3 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#777587] mb-1">
                            {t('job_chat_banner_title')}
                        </p>
                        <p className="text-[15px] font-semibold text-white leading-snug">{jobListingTitle(jobSnap)}</p>
                        <p className="text-[13px] text-[#8774e1] mt-0.5">{jobListingSubtitle(jobSnap)}</p>
                        <p className="text-[12px] text-[#aaaaaa] mt-2">
                            {jobIntent === 'apply' ? t('job_chat_banner_apply') : t('job_chat_banner_chat')}
                        </p>
                    </div>
                )}
                {isExpertListing && !isJobListing && (
                    <div className="mt-1 rounded-[24px] bg-[#8774e1]/10 border border-[#8774e1]/25 p-3 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
                        <p className="text-[13px] font-semibold text-[#8774e1] mb-1">{t('expert_chat_banner_title')}</p>
                        <p className="text-[12px] text-[#aaaaaa] leading-snug">{t('expert_chat_banner_hint')}</p>
                        <p className="text-[11px] text-[#777587] mt-2 leading-snug">{t('listing_calls_panel_hint')}</p>
                    </div>
                )}
                {chat && isListingChat(chat) && applicationPending && !applicationRejected && (
                    <div className="mt-1 rounded-[20px] bg-white/[0.04] border border-white/[0.08] px-3 py-2 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
                        <p className="text-[13px] text-white/75 leading-snug">
                            {isEmployerSide || isExpertSide
                                ? t('application_pending_applicant')
                                : t('application_pending_client')}
                        </p>
                    </div>
                )}
                {chat && isListingChat(chat) && applicationRejected && (
                    <div className="mt-1 rounded-[20px] bg-red-500/10 border border-red-400/25 px-3 py-2 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
                        <p className="text-[13px] text-red-200/95 leading-snug">{t('application_rejected_banner')}</p>
                    </div>
                )}
                {chat && isListingChat(chat) && !isMessagingUnlocked(chat) && !applicationRejected && (
                    <div className="mt-1 rounded-[24px] bg-amber-500/10 border border-amber-400/25 px-3 py-2.5 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)] space-y-2">
                        <p className="text-[13px] text-amber-100/95 leading-snug">{t('consent_waiting_message')}</p>
                        {isClientSide && !consent.client_accepted_at && (
                            <button
                                type="button"
                                disabled={consentLoading}
                                onClick={() => void runConsent('client_accept')}
                                className="w-full py-2 rounded-xl bg-[#8774e1] text-white text-[14px] font-medium disabled:opacity-50"
                            >
                                {t('consent_agree_btn')}
                            </button>
                        )}
                        {isExpertSide && !consent.expert_accepted_at && (
                            <button
                                type="button"
                                disabled={consentLoading}
                                onClick={() => void runConsent('expert_accept')}
                                className="w-full py-2 rounded-xl bg-emerald-600 text-white text-[14px] font-medium disabled:opacity-50"
                            >
                                {t('expert_accept_murojaat_btn')}
                            </button>
                        )}
                        {isEmployerSide && !consent.expert_accepted_at && (
                            <div className="space-y-2">
                                {!showRejectForm ? (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            disabled={consentLoading}
                                            onClick={() => void runConsent('employer_accept')}
                                            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-[14px] font-medium disabled:opacity-50"
                                        >
                                            {t('job_accept_application_btn')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={consentLoading}
                                            onClick={() => setShowRejectForm(true)}
                                            className="flex-1 py-2 rounded-xl bg-red-600/90 text-white text-[14px] font-medium disabled:opacity-50"
                                        >
                                            {t('job_reject_application_btn')}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder={t('reject_reason_placeholder') as string}
                                            rows={2}
                                            className="w-full rounded-xl bg-black/25 border border-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/35 resize-none"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                disabled={consentLoading}
                                                onClick={() => {
                                                    setShowRejectForm(false);
                                                    setRejectReason('');
                                                }}
                                                className="flex-1 py-2 rounded-xl bg-white/10 text-white/80 text-[14px]"
                                            >
                                                {t('cancel')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={consentLoading}
                                                onClick={() =>
                                                    void runConsent(
                                                        'employer_reject',
                                                        rejectReason.trim() || undefined
                                                    )
                                                }
                                                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-[14px] font-medium disabled:opacity-50"
                                            >
                                                {t('job_reject_application_btn')}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {chat && isListingChat(chat) && isMessagingUnlocked(chat) && (
                    <ChatPaymentStatusCard chatId={chat.id} t={t} />
                )}

                {chatCompliance && !isTrade && !isComplianceDismissed && (
                    <div className="mt-1 rounded-[24px] bg-[#212121] p-3 text-[13px] text-white/90 leading-snug shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
                        <p className="mb-1 font-medium text-[#8774e1]">{chatCompliance.title}</p>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-50/90 mb-3">
                            {chatCompliance.lines.map((ln, i) => (
                                <li key={i}>{ln}</li>
                            ))}
                        </ul>
                        <button
                            onClick={() => setIsComplianceDismissed(true)}
                            className="w-full py-2 text-[15px] font-medium text-[#8774e1]"
                        >
                            {t('i_have_read')}
                        </button>
                    </div>
                )}
                {/* Deleted / missing peer */}
                {isPrivatePeerUnavailable(chat) && !isTrade && (
                    <div className="mt-1 flex h-12 items-center justify-between rounded-[24px] bg-[#3d1f1f] px-3 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
                        <p className="min-w-0 truncate text-[14px] text-[#ff8a80]">
                            {t('peer_account_deleted')}
                        </p>
                    </div>
                )}
                {/* Unknown Contact Bar */}
                {!isContact && !isTrade && !isPrivatePeerUnavailable(chat) && (
                    <div className="mt-1 flex h-12 items-center justify-between rounded-[24px] bg-[#212121] px-3 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
                        <p className="min-w-0 truncate text-[14px] text-white">
                            {(isExpertListing || isJobListing) ? t('listing_save_contact_hint') : t('not_in_contacts')}
                        </p>
                        <div className="flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                onClick={handleAddContact}
                                disabled={isAddingContact}
                                className="px-3 py-1.5 text-[15px] font-medium text-[#8774e1] disabled:opacity-50"
                            >
                                {isAddingContact ? t('adding') : t('add')}
                            </button>
                            <button type="button" onClick={handleBlockUser} className="px-3 py-1.5 text-[15px] font-medium text-[#e53935]">
                                {t('block')}
                            </button>
                        </div>
                    </div>
                )}

                {/* P2P Trade Banner */}
                {isTrade && tradeData && (
                    <div className="bg-emerald-600/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center shadow-lg animate-fade-in relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">
                                    {t('p2p_trade')} #{String(tradeData.id ?? '').slice(0, 8)}
                                </h4>
                                <p className="text-emerald-400/70 text-[10px] font-medium uppercase tracking-wider">
                                    {tradeData.status} • {(Number(tradeData.amount_uzs) || 0).toLocaleString()} UZS
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Service Escrow Banner */}
                {activeSession && (
                    <div className="bg-blue-600/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4 flex justify-between items-center shadow-lg animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">{t('service_session')}</h4>
                                <p className="text-blue-400/70 text-[10px] font-medium uppercase tracking-wider">{activeSession.status} • {activeSession.amount_mali} MALI {t('in_escrow')}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </>
    );
}

export default ChatWindowBanners;
