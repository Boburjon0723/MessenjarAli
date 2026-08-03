'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export type ChatPreCallModalProps = {
    open: boolean;
    pendingCallType: 'audio' | 'video';
    displayName: string;
    lowBandwidth: boolean;
    onLowBandwidthChange: (v: boolean) => void;
    onClose: () => void;
    onStart: () => void | Promise<void>;
};

export function ChatPreCallModal({
    open,
    pendingCallType,
    displayName,
    lowBandwidth,
    onLowBandwidthChange,
    onClose,
    onStart,
}: ChatPreCallModalProps) {
    const { t } = useLanguage();
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="w-full max-w-md glass-premium border border-white/10 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">
                        {pendingCallType === 'video' ? t('video_call') : t('voice_call')}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="text-xs text-white/60 leading-relaxed">
                    {t('expert_mode_desc')}
                </p>

                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
                        {(displayName || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-white font-semibold truncate">{displayName}</p>
                        <p className="text-[11px] text-white/40 uppercase tracking-widest">
                            {pendingCallType === 'video' ? t('video_call') : t('voice_call')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
                    <div>
                        <p className="text-sm text-white font-semibold">{t('low_bandwidth')}</p>
                        <p className="text-[11px] text-white/40">
                            {t('low_bandwidth_desc')}
                        </p>
                    </div>
                    <button
                        onClick={() => onLowBandwidthChange(!lowBandwidth)}
                        className={`w-11 h-6 rounded-full flex items-center px-1 transition-all ${
                            lowBandwidth ? 'bg-emerald-500' : 'bg-white/20'
                        }`}
                    >
                        <span
                            className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                                lowBandwidth ? 'translate-x-5' : 'translate-x-0'
                            }`}
                        />
                    </button>
                </div>

                {pendingCallType === 'video' && lowBandwidth && (
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/40 rounded-2xl px-3 py-2">
                        {t('low_bandwidth_warning')}
                    </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-full text-xs font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={() => void onStart()}
                        className="px-5 py-2 rounded-full text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/40"
                    >
                        {t('start')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChatPreCallModal;
