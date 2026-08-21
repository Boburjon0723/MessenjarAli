'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { AnimatedModal } from '../../ui/AnimatedModal';
import { useLanguage } from '@/context/LanguageContext';
import { WALLET_MODAL_SOLID_STYLE, WALLET_MODAL_FOOTER_CLASS } from './walletHelpers';

type WithdrawStatus = 'idle' | 'loading' | 'success' | 'error';

export type WalletWithdrawModalProps = {
    open: boolean;
    onClose: () => void;
    amount: string;
    onAmountChange: (v: string) => void;
    card: string;
    onCardChange: (v: string) => void;
    pin: string;
    onPinChange: (v: string) => void;
    status: WithdrawStatus;
    error: string;
    availableBalance: number;
    minWithdraw: number;
    onSubmit: () => void;
};

export function WalletWithdrawModal({
    open,
    onClose,
    amount,
    onAmountChange,
    card,
    onCardChange,
    pin,
    onPinChange,
    status,
    error,
    availableBalance,
    minWithdraw,
    onSubmit,
}: WalletWithdrawModalProps) {
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
                <div className="shrink-0 bg-gradient-to-r from-rose-900/50 to-orange-900/50 px-4 py-3 sm:p-4 border-b border-white/10">
                    <h2 className="text-base sm:text-lg font-bold text-white">{t('withdraw')}</h2>
                    <p className="text-white/55 text-[11px] sm:text-xs">{t('withdraw_desc')}</p>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-5 space-y-3">
                    {status === 'success' ? (
                        <div className="text-center py-4 space-y-2">
                            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white">✓</div>
                            <h3 className="text-white font-bold text-sm sm:text-base">{t('withdraw_success')}</h3>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('amount_mali_label')}</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => onAmountChange(e.target.value)}
                                    placeholder="0.00"
                                    className="mt-1 w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('confirm_pin_label')}</label>
                                <input
                                    type="text"
                                    value={card}
                                    onChange={(e) => onCardChange(e.target.value.replace(/\D/g, '').slice(0, 16))}
                                    placeholder="8600 0000 0000 0000"
                                    className="mt-1 w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('confirm_pin_label')}</label>
                                <input
                                    type="password"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    className="mt-1 w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-rose-500/40 focus:ring-1 focus:ring-rose-500/20"
                                />
                            </div>
                            <p className="text-[10px] text-white/45 leading-snug">
                                Balans: {availableBalance.toLocaleString()} MALI · min {minWithdraw} MALI
                            </p>
                            {error && (
                                <p className="text-[11px] text-red-200 bg-red-500/15 border border-red-500/35 rounded-lg px-2.5 py-2">
                                    {error}
                                </p>
                            )}
                        </>
                    )}
                </div>
                {status !== 'success' && (
                    <div className={WALLET_MODAL_FOOTER_CLASS}>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium border border-white/10"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={onSubmit}
                                disabled={status === 'loading'}
                                className="py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-60"
                            >
                                {status === 'loading' ? t('adding') : t('create_chat')}
                            </button>
                        </div>
                    </div>
                )}
            </GlassCard>
        </AnimatedModal>
    );
}

export default WalletWithdrawModal;
