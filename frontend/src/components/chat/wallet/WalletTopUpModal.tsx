'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { AnimatedModal } from '../../ui/AnimatedModal';
import { useLanguage } from '@/context/LanguageContext';
import { WALLET_MODAL_SOLID_STYLE, WALLET_MODAL_FOOTER_CLASS } from './walletHelpers';

type TopUpStatus = 'idle' | 'loading' | 'success' | 'error';

export type WalletTopUpModalProps = {
    open: boolean;
    onClose: () => void;
    adminCard: string | null;
    amount: string;
    onAmountChange: (v: string) => void;
    status: TopUpStatus;
    error: string;
    onSubmit: () => void;
};

export function WalletTopUpModal({
    open,
    onClose,
    adminCard,
    amount,
    onAmountChange,
    status,
    error,
    onSubmit,
}: WalletTopUpModalProps) {
    const { t } = useLanguage();

    return (
        <AnimatedModal
            open={open}
            zClass="z-[130]"
            className="overflow-y-auto overscroll-y-contain bg-[#040507]/95 backdrop-blur-2xl p-3 sm:p-6"
        >
            <GlassCard
                style={WALLET_MODAL_SOLID_STYLE}
                className="w-full max-w-[min(100%,22rem)] sm:max-w-md !p-0 overflow-hidden relative shadow-2xl my-auto max-h-[min(90dvh,calc(100dvh-1rem))] flex flex-col !backdrop-blur-none border border-white/15"
            >
                <div className="shrink-0 bg-gradient-to-r from-emerald-900/50 to-teal-900/50 px-4 py-3 sm:p-4 border-b border-white/10">
                    <h2 className="text-base sm:text-lg font-bold text-white">{t('top_up')}</h2>
                    <p className="text-white/55 text-[11px] sm:text-xs">{t('admin_approval_wait')}</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-5 space-y-4">
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-4 rounded-xl shadow-xl relative overflow-hidden border border-white/10">
                        <div className="absolute top-0 right-0 w-28 h-28 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-white/80 text-sm font-medium tracking-wider">UZCARD</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                        </div>
                        <div className="space-y-1 text-center py-1">
                            <p className="text-xl sm:text-2xl font-mono text-white tracking-[0.12em] drop-shadow-md">
                                {adminCard || t('admin_card_not_set')}
                            </p>
                            <p className="text-white/55 text-[10px] sm:text-xs uppercase tracking-widest mt-1.5">MALI ADMIN</p>
                        </div>
                    </div>
                    {status === 'success' ? (
                        <div className="text-center py-4 space-y-2">
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </div>
                            <h3 className="text-white font-bold text-sm sm:text-base">{t('topup_success')}</h3>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('amount_mali_label')}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => onAmountChange(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/25 transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xs">MALI</span>
                                </div>
                            </div>
                            {error && (
                                <p className="text-[11px] text-red-200 bg-red-500/15 border border-red-500/35 rounded-lg px-2.5 py-2">
                                    {error}
                                </p>
                            )}
                            <p className="text-[10px] text-white/40 text-center leading-snug">
                                To&apos;g&apos;ridan-to&apos;g&apos;ri MALI summasini kiriting.
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {[50, 100, 200].map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => onAmountChange(String(preset))}
                                        className="py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/85 text-[10px] sm:text-xs border border-white/10"
                                    >
                                        {preset} MALI
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {status !== 'success' && (
                    <div className={WALLET_MODAL_FOOTER_CLASS}>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10 transition-all"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={status === 'loading'}
                                className="py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {status === 'loading' ? t('adding') : t('accept')}
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </AnimatedModal>
    );
}

export default WalletTopUpModal;
