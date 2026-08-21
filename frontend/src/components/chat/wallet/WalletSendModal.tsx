'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { AnimatedModal } from '../../ui/AnimatedModal';
import { useLanguage } from '@/context/LanguageContext';
import {
    WALLET_MODAL_SOLID_STYLE,
    WALLET_MODAL_FOOTER_CLASS,
    walletDigitsOnly,
    walletPhonesMatch,
    walletResolveRecipientFromPhone,
} from './walletHelpers';

type SendStatus = 'idle' | 'loading' | 'success' | 'error';

export type WalletSendModalProps = {
    open: boolean;
    onClose: () => void;
    contacts: any[];
    phone: string;
    onPhoneChange: (v: string) => void;
    recipientId: string;
    onRecipientIdChange: (v: string) => void;
    amount: string;
    onAmountChange: (v: string) => void;
    pin: string;
    onPinChange: (v: string) => void;
    status: SendStatus;
    error: string;
    availableBalance: number;
    onSubmit: () => void;
};

export function WalletSendModal({
    open,
    onClose,
    contacts,
    phone,
    onPhoneChange,
    recipientId,
    onRecipientIdChange,
    amount,
    onAmountChange,
    pin,
    onPinChange,
    status,
    error,
    availableBalance,
    onSubmit,
}: WalletSendModalProps) {
    const { t, language } = useLanguage();

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
                <div className="shrink-0 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 px-4 py-3 sm:p-4 border-b border-white/10">
                    <h2 className="text-base sm:text-lg font-bold text-white leading-tight">{t('send_mali')}</h2>
                    <p className="text-white/55 text-[11px] sm:text-xs mt-0.5">{t('send_desc')}</p>
                </div>
                {status === 'success' ? (
                    <div className="p-5 text-center space-y-2">
                        <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-white text-sm">✓</div>
                        <h3 className="text-white font-bold text-sm sm:text-base">
                            {language === 'uz' ? 'Yuborildi' : language === 'ru' ? 'Отправлено' : 'Sent'}
                        </h3>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-3 sm:px-5 sm:py-4 space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('phone_number')}</label>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    value={phone}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        onPhoneChange(v);
                                        onRecipientIdChange(walletResolveRecipientFromPhone(v, contacts));
                                    }}
                                    placeholder="+998 …"
                                    className="mt-1 w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('contacts')}</label>
                                <select
                                    value={recipientId}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        onRecipientIdChange(id);
                                        const c = contacts.find((x: any) => String(x.id) === id);
                                        onPhoneChange(c?.phone != null ? String(c.phone) : '');
                                    }}
                                    className="mt-1 w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                                >
                                    <option value="">{language === 'uz' ? '— Tanlang —' : language === 'ru' ? '— Выберите —' : '— Select —'}</option>
                                    {contacts.map((c: any) => (
                                        <option key={c.id} value={c.id} className="bg-[#151820] text-white">
                                            {(c.name || '')} {(c.surname || '')}
                                            {c.phone ? ` · ${c.phone}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {phone.trim() &&
                                walletDigitsOnly(phone).length >= 8 &&
                                contacts.filter((c) => walletPhonesMatch(phone, String(c.phone || ''))).length > 1 && (
                                    <p className="text-[10px] text-amber-200/90 leading-snug">
                                        {language === 'uz'
                                            ? 'Bir nechta kontakt mos keldi — ro‘yxatdan aniqini tanlang.'
                                            : language === 'ru'
                                              ? 'Несколько контактов подходят — выберите нужный в списке.'
                                              : 'Multiple contacts match — pick the right one in the list.'}
                                    </p>
                                )}
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{t('amount_mali_label')}</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => onAmountChange(e.target.value)}
                                    placeholder="0.00"
                                    className="mt-1 w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
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
                                    className="mt-1 w-full bg-[#0c0f14] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
                                />
                            </div>
                            {error && (
                                <p className="text-[11px] text-red-200 bg-red-500/15 border border-red-500/35 rounded-lg px-2.5 py-2 leading-snug">
                                    {error}
                                </p>
                            )}
                            <p className="text-[10px] text-white/45">
                                {language === 'uz' ? 'Balans:' : language === 'ru' ? 'Баланс:' : 'Balance:'}{' '}
                                {availableBalance.toLocaleString()} MALI
                            </p>
                        </div>
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
                                    className="py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-60"
                                >
                                    {status === 'loading' ? t('adding') : t('send_mali')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </GlassCard>
        </AnimatedModal>
    );
}

export default WalletSendModal;
