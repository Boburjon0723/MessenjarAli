'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import {
    User,
    DollarSign,
    MessageSquare,
    Shield,
    Languages,
    Search,
    MoreVertical,
    X,
    Grid,
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import type { ProfileBgSettings } from './ProfileChatSettingsView';

export type ProfileSettingsViewProps = {
    bgSettings?: ProfileBgSettings;
    user: any;
    profilePhotoDisplaySrc: string;
    getAvatarUrl: (url?: string | null) => string | null;
    displayAge: () => { current: number; nextYear: number } | null;
    onClose: () => void;
    onLogout: () => void;
    onOpenLanguage: () => void;
    onOpenNameEdit: () => void;
    onOpenAvatar: () => void;
    onOpenWallet: () => void;
    onOpenChatSettings: () => void;
};

export function ProfileSettingsView({
    bgSettings,
    user,
    profilePhotoDisplaySrc,
    getAvatarUrl,
    displayAge,
    onClose,
    onLogout,
    onOpenLanguage,
    onOpenNameEdit,
    onOpenAvatar,
    onOpenWallet,
    onOpenChatSettings,
}: ProfileSettingsViewProps) {
    const { t, language } = useLanguage();

    const SETTINGS_ITEMS = [
        { id: 'account', icon: <User className="h-5 w-5" />, label: t('profile'), subtext: t('edit_account_sub') },
        { id: 'wallet', icon: <DollarSign className="h-5 w-5 text-emerald-400" />, label: t('wallet'), subtext: t('wallet_sub') },
        { id: 'chats', icon: <MessageSquare className="h-5 w-5" />, label: t('chat_settings'), subtext: t('chat_settings_sub') },
        ...(user.role === 'admin' ? [{ id: 'admin', icon: <Shield className="h-5 w-5 text-emerald-400" />, label: 'Admin Panel', subtext: t('admin_panel_sub') }] : []),
    ];

    return (
        <GlassCard
            className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-2xl animate-scale-up lg:border-white/10 text-white`}
            style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
            <div
                className={`flex min-h-[52px] items-center justify-between gap-2 border-b border-white/10 px-4 pb-3 sm:px-6`}
                style={{
                    paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                    paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                    paddingRight: 'max(1rem, env(safe-area-inset-right))',
                }}
            >
                <h2 className="min-w-0 flex-1 truncate font-medium text-[17px] sm:text-[19px]">{t('settings')}</h2>
                <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5 text-white/50">
                    <button
                        type="button"
                        onClick={onOpenLanguage}
                        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-xl bg-white/10 px-2 py-2 text-[11px] font-bold uppercase tracking-wide border border-white/10 hover:text-white transition-colors sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5 sm:text-[13px]"
                    >
                        <Languages className="h-[17px] w-[17px] shrink-0 sm:h-[18px] sm:w-[18px]" />
                        <span className="max-w-[2.5rem] truncate sm:max-w-none">{language}</span>
                    </button>
                    <button
                        type="button"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                        aria-label="Search"
                    >
                        <Search className="h-[21px] w-[21px] sm:h-[22px] sm:w-[22px]" />
                    </button>
                    <button
                        type="button"
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                        aria-label="More"
                    >
                        <MoreVertical className="h-[21px] w-[21px] sm:h-[22px] sm:w-[22px]" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                        aria-label={t('cancel')}
                    >
                        <X className="h-[21px] w-[21px] sm:h-[22px] sm:w-[22px]" />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 pb-6">
                <div className="px-6 py-5 flex items-center gap-5 group cursor-pointer hover:bg-white/5 transition-all"
                    onClick={onOpenNameEdit}>
                    <div
                        role="button"
                        tabIndex={0}
                        className={`w-[64px] h-[64px] rounded-full overflow-hidden border-2 border-white/10 shadow-xl relative shrink-0 ${getAvatarUrl(user.avatar || user.avatar_url) ? 'cursor-zoom-in' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (getAvatarUrl(user.avatar || user.avatar_url)) onOpenAvatar();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                if (getAvatarUrl(user.avatar || user.avatar_url)) onOpenAvatar();
                            }
                        }}
                        aria-label={
                            language === 'ru'
                                ? 'Открыть фото'
                                : language === 'en'
                                  ? 'View photo'
                                  : 'Rasmni kattalashtirish'
                        }
                    >
                        <img
                            src={profilePhotoDisplaySrc}
                            alt=""
                            className="w-full h-full object-cover transition-transform group-hover:scale-110 pointer-events-none"
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-bold text-[18px] leading-tight group-hover:text-[#00A884] transition-colors">{user.name} {user.surname || ''}</h3>
                        <div className="flex flex-col mt-0.5 opacity-40">
                            <span className="text-[13px]">{user.phone || '+998 -- --- -- --'}</span>
                            <span className="text-[13px]">@{user.username || 'username'}</span>
                            {displayAge() && (
                                <span className="text-[12px] mt-0.5 opacity-70">
                                    {displayAge()!.current} {t('years_old')} • {t('next_year')} {displayAge()!.nextYear} {t('years_old')}
                                </span>
                            )}
                        </div>
                    </div>
                    <button className="text-white/20 group-hover:text-white transition-all bg-white/5 p-2 rounded-xl active:scale-95"><Grid className="h-6 w-6" /></button>
                </div>

                <div className="h-[1px] bg-white/5 mx-6 mb-2"></div>

                <div className="space-y-0.5 mt-2">
                    {SETTINGS_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            className="w-full flex items-center gap-5 px-6 py-3.5 hover:bg-white/5 transition-all group text-left"
                            onClick={() => {
                                if (item.id === 'account') onOpenNameEdit();
                                else if (item.id === 'wallet') onOpenWallet();
                                else if (item.id === 'chats') onOpenChatSettings();
                                else if (item.id === 'admin') { window.open('/AdminZero0723s', '_blank'); }
                            }}
                        >
                            <span className="text-white/30 group-hover:text-[#00A884] transition-colors">{item.icon}</span>
                            <div className="flex-1 flex flex-col justify-center">
                                <span className="text-white/90 group-hover:text-white text-[15px] font-medium">{item.label}</span>
                                {item.subtext && <span className="text-white/20 text-[12px] mt-0.5">{item.subtext}</span>}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="px-6 mt-8">
                    <button onClick={onLogout} className="w-full py-4 text-red-500/80 font-bold text-[15px] hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-red-500/5">{t('logout')}</button>
                </div>
            </div>
        </GlassCard>
    );
}

export default ProfileSettingsView;
