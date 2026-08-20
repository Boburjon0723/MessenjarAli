'use client';

import React from 'react';
import {
    User,
    DollarSign,
    MessageSquare,
    Shield,
    Languages,
    Search,
    MoreVertical,
    X,
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
        { id: 'wallet', icon: <DollarSign className="h-5 w-5" />, label: t('wallet'), subtext: t('wallet_sub') },
        { id: 'chats', icon: <MessageSquare className="h-5 w-5" />, label: t('chat_settings'), subtext: t('chat_settings_sub') },
        ...(user.role === 'admin' ? [{ id: 'admin', icon: <Shield className="h-5 w-5" />, label: 'Admin Panel', subtext: t('admin_panel_sub') }] : []),
    ];

    return (
        <div
            className="w-full h-full lg:h-auto lg:max-w-[420px] flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:rounded-2xl bg-[#212121] text-white shadow-[0_2px_16px_rgba(0,0,0,0.4)] border border-white/[0.06]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
            <div
                className="flex min-h-12 items-center justify-between gap-2 px-3 pb-2"
                style={{
                    paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
                    paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
                    paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
                }}
            >
                <h2 className="min-w-0 flex-1 truncate font-medium text-[20px]">{t('settings')}</h2>
                <div className="flex shrink-0 items-center text-[#aaaaaa]">
                    <button
                        type="button"
                        onClick={onOpenLanguage}
                        className="flex h-10 min-w-10 items-center justify-center gap-1 rounded-full px-2 hover:bg-white/[0.08] hover:text-white"
                    >
                        <Languages className="h-[18px] w-[18px] shrink-0" />
                        <span className="text-[13px] uppercase">{language}</span>
                    </button>
                    <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/[0.08] hover:text-white"
                        aria-label="Search"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/[0.08] hover:text-white"
                        aria-label="More"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/[0.08] hover:text-white"
                        aria-label={t('cancel')}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 pb-6">
                <div
                    className="px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-white/[0.04]"
                    onClick={onOpenNameEdit}
                >
                    <div
                        role="button"
                        tabIndex={0}
                        className={`w-[72px] h-[72px] rounded-full overflow-hidden bg-[#8774e1] relative shrink-0 ${getAvatarUrl(user.avatar || user.avatar_url) ? 'cursor-zoom-in' : ''}`}
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
                            className="w-full h-full object-cover pointer-events-none"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium text-[16px] leading-tight truncate">{user.name} {user.surname || ''}</h3>
                        <div className="flex flex-col mt-0.5 text-[#aaaaaa]">
                            <span className="text-[14px]">{user.phone || '+998 -- --- -- --'}</span>
                            <span className="text-[14px]">@{user.username || 'username'}</span>
                            {displayAge() && (
                                <span className="text-[13px] mt-0.5">
                                    {displayAge()!.current} {t('years_old')} • {t('next_year')} {displayAge()!.nextYear} {t('years_old')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/[0.06] mx-4 my-1"></div>

                <div className="mt-1">
                    {SETTINGS_ITEMS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className="w-full flex items-center gap-4 px-4 py-3 hover:bg-white/[0.04] text-left"
                            onClick={() => {
                                if (item.id === 'account') onOpenNameEdit();
                                else if (item.id === 'wallet') onOpenWallet();
                                else if (item.id === 'chats') onOpenChatSettings();
                                else if (item.id === 'admin') { window.open('/AdminZero0723s', '_blank'); }
                            }}
                        >
                            <span className="text-[#8774e1]">{item.icon}</span>
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                <span className="text-white text-[16px]">{item.label}</span>
                                {item.subtext && <span className="text-[#aaaaaa] text-[13px] mt-0.5">{item.subtext}</span>}
                            </div>
                        </button>
                    ))}
                </div>

                <div className="px-4 mt-6">
                    <button
                        type="button"
                        onClick={onLogout}
                        className="w-full py-3 text-[#e53935] text-[16px] hover:bg-[#e53935]/10 rounded-xl"
                    >
                        {t('logout')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProfileSettingsView;
