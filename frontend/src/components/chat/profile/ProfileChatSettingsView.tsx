'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { Plus, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { CHAT_BACKGROUND_PRESETS } from '@/lib/wallpapers';

export type ProfileBgSettings = {
    blur: number;
    imageBlur?: number;
    image: string;
    isDark?: boolean;
    rgb?: { r: number; g: number; b: number };
};

export type ProfileChatSettingsViewProps = {
    bgSettings?: ProfileBgSettings;
    onBack: () => void;
    onUpdateBgBlur?: (val: number) => void;
    onUpdateBgImageBlur?: (val: number) => void;
    onUpdateBgImage?: (url: string) => void;
};

export function ProfileChatSettingsView({
    bgSettings,
    onBack,
    onUpdateBgBlur,
    onUpdateBgImageBlur,
    onUpdateBgImage,
}: ProfileChatSettingsViewProps) {
    const { t } = useLanguage();

    return (
        <GlassCard
            className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-2xl animate-scale-up lg:border-white/10 text-white`}
            style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-4 p-4 px-6 border-b border-white/10`}>
                <button onClick={onBack} className={`text-white/40 hover:text-white transition-colors p-1`}><X className="h-6 w-6 rotate-90" /></button>
                <h2 className="font-medium text-[19px]">Настройки чатов</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-8 pb-10">
                <div className="space-y-4">
                    <h4 className="text-accent-primary text-xs font-bold uppercase tracking-widest ml-1">{t('blur_settings')}</h4>
                    <div className="rounded-2xl p-5 space-y-6 border bg-white/5 border-white/10">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-white">{t('panel_blur')}</span>
                                <span className="text-white/60">{bgSettings?.blur || 0}px</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={bgSettings?.blur || 0}
                                onChange={(e) => onUpdateBgBlur?.(parseInt(e.target.value))}
                                className="w-full h-2 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-white">{t('bg_blur')}</span>
                                <span className="text-white/60">{bgSettings?.imageBlur || 0}px</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={bgSettings?.imageBlur || 0}
                                onChange={(e) => onUpdateBgImageBlur?.(parseInt(e.target.value))}
                                className="w-full h-2 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-accent-primary text-xs font-bold uppercase tracking-widest ml-1">{t('change_wallpaper')}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['custom_upload', ...CHAT_BACKGROUND_PRESETS].map((url, i) => (
                            <div key={i}
                                onClick={() => {
                                    if (url === 'custom_upload') {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => onUpdateBgImage?.(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        };
                                        input.click();
                                    } else {
                                        onUpdateBgImage?.(url);
                                    }
                                }}
                                className={`aspect-video rounded-xl cursor-pointer border-2 transition-all hover:scale-105 active:scale-95 overflow-hidden flex flex-col items-center justify-center ${bgSettings?.image === url ? 'border-accent-primary shadow-lg shadow-accent-primary/20' : 'border-transparent bg-white/5'}`}>
                                {url === 'custom_upload' ? (
                                    <>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform bg-white/10">
                                            <Plus className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase text-white/40 group-hover:text-[#00A884]">{t('upload_custom')}</span>
                                    </>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                        {bgSettings?.image === url && (
                                            <div className="absolute inset-0 bg-accent-primary/20 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </GlassCard>
    );
}

export default ProfileChatSettingsView;
