'use client';

import React from 'react';
import { Plus, ArrowLeft } from 'lucide-react';
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
        <div
            className="w-full h-full lg:h-auto lg:max-w-[420px] flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:rounded-2xl bg-[#212121] text-white shadow-[0_2px_16px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex h-12 items-center gap-2 px-2">
                <button type="button" onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.08] hover:text-white">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="font-medium text-[20px]">{t('chat_settings')}</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-6 pb-10">
                <div className="space-y-3">
                    <h4 className="text-[#8774e1] text-[13px] px-1">{t('blur_settings')}</h4>
                    <div className="rounded-xl p-4 space-y-5 bg-[#181818]">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[14px]">
                                <span className="text-white">{t('panel_blur')}</span>
                                <span className="text-[#aaaaaa]">{bgSettings?.blur || 0}px</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={bgSettings?.blur || 0}
                                onChange={(e) => onUpdateBgBlur?.(parseInt(e.target.value))}
                                className="w-full h-1 bg-[#2b2b2b] rounded-lg appearance-none cursor-pointer accent-[#8774e1] focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[14px]">
                                <span className="text-white">{t('bg_blur')}</span>
                                <span className="text-[#aaaaaa]">{bgSettings?.imageBlur || 0}px</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={bgSettings?.imageBlur || 0}
                                onChange={(e) => onUpdateBgImageBlur?.(parseInt(e.target.value))}
                                className="w-full h-1 bg-[#2b2b2b] rounded-lg appearance-none cursor-pointer accent-[#8774e1] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-[#8774e1] text-[13px] px-1">{t('change_wallpaper')}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                className={`aspect-video rounded-xl cursor-pointer overflow-hidden flex flex-col items-center justify-center ${bgSettings?.image === url ? 'ring-2 ring-[#8774e1]' : 'bg-[#181818]'}`}>
                                {url === 'custom_upload' ? (
                                    <>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1 bg-white/10">
                                            <Plus className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-[11px] text-[#aaaaaa]">{t('upload_custom')}</span>
                                    </>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                        {bgSettings?.image === url && (
                                            <div className="absolute inset-0 bg-[#8774e1]/20 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-[#8774e1] flex items-center justify-center text-white">
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
        </div>
    );
}

export default ProfileChatSettingsView;
