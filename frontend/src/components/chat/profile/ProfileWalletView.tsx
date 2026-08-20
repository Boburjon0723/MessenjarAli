'use client';

import React from 'react';
import { GlassButton } from '../../ui/GlassButton';
import { Award, DollarSign, Lock, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { ProfileBgSettings } from './ProfileChatSettingsView';

export type ProfileWalletViewProps = {
    bgSettings?: ProfileBgSettings;
    onBack: () => void;
    walletData: { available: number; locked: number; subscription_end_date: string | null };
    isSubscribing: boolean;
    isExpert: boolean;
    verifiedStatus: string;
    onSubscribe: () => void;
};

export function ProfileWalletView({
    bgSettings,
    onBack,
    walletData,
    isSubscribing,
    isExpert,
    verifiedStatus,
    onSubscribe,
}: ProfileWalletViewProps) {
    const { t } = useLanguage();

    return (
        <div
            className="w-full h-full lg:h-auto lg:max-w-[420px] flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:rounded-2xl bg-[#212121] text-white shadow-[0_2px_16px_rgba(0,0,0,0.4)] border border-white/[0.06]"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex h-12 items-center gap-2 px-2">
                <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.08] hover:text-white"><X className="h-6 w-6 rotate-90" /></button>
                <h2 className="font-medium text-[20px]">{t('wallet')}</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6 pb-10">
                <div className="bg-[#8774e1] rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex flex-col gap-1 text-center">
                        <span className="text-white/60 text-xs font-black uppercase tracking-widest">{t('available_balance')}</span>
                        <div className="flex items-center justify-center gap-2">
                            <DollarSign className="h-8 w-8 text-white" />
                            <span className="text-white font-black text-4xl">{walletData.available} <span className="text-lg opacity-60">MALI</span></span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/5 rounded-xl text-yellow-500"><Lock className="h-5 w-5" /></div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold">{t('escrow_reserved')}</span>
                            <span className="text-white/40 text-xs text-left">{t('escrow_reserved_desc')}</span>
                        </div>
                    </div>
                    <div className="text-yellow-500 font-black">{walletData.locked} MALI</div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-[#8774e1]/20 rounded-xl text-[#8774e1]"><Award className="h-5 w-5" /></div>
                        <div className="flex flex-col h-full items-start justify-center">
                            <span className="text-white font-bold leading-none">{t('specialist_subscription')}</span>
                            <span className="text-[#8774e1] font-medium text-xs mt-1">{t('free_for_now')}</span>
                        </div>
                    </div>

                    <p className="text-white/40 text-[11.5px] leading-relaxed pb-2">
                        {t('subscription_desc')}
                    </p>

                    <GlassButton
                        onClick={onSubscribe}
                        disabled={isSubscribing}
                        className={`w-full !rounded-xl py-3.5 font-bold transition-all ${isExpert && verifiedStatus !== 'none' ? '!bg-white/10 !text-white/40 cursor-not-allowed' : '!bg-emerald-600 !text-white'}`}
                    >
                        {isSubscribing ? t('loading') : (isExpert && verifiedStatus !== 'none' ? t('subscription_active') : t('enable_specialist_free'))}
                    </GlassButton>
                </div>
            </div>
        </div>
    );
}

export default ProfileWalletView;
