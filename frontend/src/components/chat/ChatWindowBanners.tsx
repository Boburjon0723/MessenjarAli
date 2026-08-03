'use client';

import React from 'react';
import type { ServiceSessionPayload, TradeDetails } from '@/types/chat-room';

export type ChatWindowBannersProps = {
    t: (...args: any[]) => string;
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
    return (
        <>
            {/* AI Summary Banner */}
            {chatSummary && (
                <div className="z-10 px-4 mt-2">
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
                <div className="z-10 px-4 mt-2">
                    <div className="bg-red-900/40 backdrop-blur-xl border border-red-500/30 rounded-2xl p-3 shadow-lg flex justify-between items-center animate-slide-down">
                        <span className="text-xs text-red-200">{summaryError}</span>
                        <button onClick={() => setSummaryError(null)} className="text-white/50 hover:text-white p-1 ml-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
            )}

            {/* Special Banners Container */}
            <div className="z-10 px-4 space-y-2 mt-2">
                {chatCompliance && !isTrade && !isComplianceDismissed && (
                    <div className="bg-amber-900/30 backdrop-blur-xl border border-amber-400/30 rounded-2xl p-3 shadow-lg text-[11px] text-amber-50/95 leading-snug">
                        <p className="font-bold text-amber-100 mb-1">{chatCompliance.title}</p>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-50/90 mb-3">
                            {chatCompliance.lines.map((ln, i) => (
                                <li key={i}>{ln}</li>
                            ))}
                        </ul>
                        <button
                            onClick={() => setIsComplianceDismissed(true)}
                            className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-xl text-amber-100 font-bold transition-all active:scale-[0.98]"
                        >
                            {t('i_have_read')}
                        </button>
                    </div>
                )}
                {/* Unknown Contact Bar */}
                {!isContact && !isTrade && (
                    <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-lg animate-slide-up">
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-white/80 text-xs font-medium">{t('not_in_contacts')}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddContact}
                                disabled={isAddingContact}
                                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-bold transition-all disabled:opacity-50"
                            >
                                {isAddingContact ? t('adding') : t('add')}
                            </button>
                            <button onClick={handleBlockUser} className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-bold transition-all">{t('block')}</button>
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
