'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { GlassButton } from '../../ui/GlassButton';
import { useLanguage } from '@/context/LanguageContext';

export type WalletPinSetupCardProps = {
    newPin: string;
    confirmPin: string;
    pinError: string;
    onNewPinChange: (v: string) => void;
    onConfirmPinChange: (v: string) => void;
    onSave: () => void;
    onCancel: () => void;
};

export function WalletPinSetupCard({
    newPin,
    confirmPin,
    pinError,
    onNewPinChange,
    onConfirmPinChange,
    onSave,
    onCancel,
}: WalletPinSetupCardProps) {
    const { t } = useLanguage();

    return (
        <GlassCard className="p-6 border-amber-500/20 bg-amber-900/10">
            <h3 className="text-white font-bold mb-4">{t('setup_pin')}</h3>
            <div className="space-y-4 max-w-xs">
                <input
                    type="password"
                    maxLength={4}
                    placeholder={t('new_pin')}
                    className="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-white text-center tracking-widest"
                    value={newPin}
                    onChange={(e) => onNewPinChange(e.target.value)}
                />
                <input
                    type="password"
                    maxLength={4}
                    placeholder={t('confirm_pin_label')}
                    className="w-full p-3 rounded-lg bg-black/20 border border-white/10 text-white text-center tracking-widest"
                    value={confirmPin}
                    onChange={(e) => onConfirmPinChange(e.target.value)}
                />
                {pinError && <p className="text-red-400 text-xs">{pinError}</p>}
                <div className="flex gap-2">
                    <GlassButton onClick={onSave} variant="premium" className="flex-1 py-2 !rounded-lg text-sm">
                        {t('save')}
                    </GlassButton>
                    <GlassButton onClick={onCancel} variant="secondary" className="px-4 py-2 !rounded-lg text-sm">
                        {t('cancel')}
                    </GlassButton>
                </div>
            </div>
        </GlassCard>
    );
}

export default WalletPinSetupCard;
