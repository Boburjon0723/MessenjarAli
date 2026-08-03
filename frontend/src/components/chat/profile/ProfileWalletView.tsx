'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
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
        <GlassCard
            className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-2xl animate-scale-up lg:border-white/10 text-white`}
            style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-4 p-4 px-6 border-b border-white/10`}>
                <button onClick={onBack} className={`text-white/40 hover:text-white transition-colors p-1`}><X className="h-6 w-6 rotate-90" /></button>
                <h2 className="font-medium text-[19px]">{t('wallet')}</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6 pb-10">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
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
                        <div className="p-3 bg-accent-primary/20 rounded-xl text-[#00A884]"><Award className="h-5 w-5" /></div>
                        <div className="flex flex-col h-full items-start justify-center">
                            <span className="text-white font-bold leading-none">{t('specialist_subscription')}</span>
                            <span className="text-[#00A884] font-black text-xs uppercase tracking-widest leading-none mt-1">{t('free_for_now')}</span>
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
        </GlassCard>
    );
}

export default ProfileWalletView;
