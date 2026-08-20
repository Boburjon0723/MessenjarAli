'use client';

import React from 'react';
import {
    X,
    Wallet,
    HelpCircle,
    Users,
    Megaphone,
    Contact,
    Settings,
    Moon,
    Briefcase,
    LineChart,
    Bookmark,
    ClipboardList,
    Layout,
} from 'lucide-react';
import { getExpertPanelMode } from '@/lib/expert-roles';

export type MessagesMenuDrawerProps = {
    t: (...args: any[]) => string;
    currentUser: any;
    isExpertMode?: boolean;
    isMobile?: boolean;
    onClose: () => void;
    onOpenProfile: () => void;
    onOpenWallet: () => void;
    onOpenExperts: () => void;
    onOpenJobs: () => void;
    onOpenFinance: () => void;
    onOpenListings: () => void;
    onToggleExpertPanel?: () => void;
    onSupport: () => void;
    onCreateGroup: () => void;
    onCreateChannel: () => void;
    onOpenContacts: () => void;
    onOpenSettings: () => void;
};

const itemCls =
    'w-full flex items-center gap-5 px-5 py-3 hover:bg-white/[0.06] text-white text-[16px] transition-colors';
const iconCls = 'h-[22px] w-[22px] text-[#aaaaaa]';

export function MessagesMenuDrawer({
    t,
    currentUser,
    isExpertMode,
    isMobile = false,
    onClose,
    onOpenProfile,
    onOpenWallet,
    onOpenExperts,
    onOpenJobs,
    onOpenFinance,
    onOpenListings,
    onToggleExpertPanel,
    onSupport,
    onCreateGroup,
    onCreateChannel,
    onOpenContacts,
    onOpenSettings,
}: MessagesMenuDrawerProps) {
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-[100] animate-fade-in" onClick={onClose}></div>
            <div className="fixed top-0 left-0 bottom-0 w-[300px] z-[110] flex flex-col animate-slide-drawer-left bg-[#212121]">
                <div
                    className="flex items-center justify-between px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]"
                >
                    <h2 className="text-white text-[20px] font-medium leading-tight">ExpertLine</h2>
                    <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.08] hover:text-white" type="button">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div
                    className="px-5 py-4 flex items-center gap-4 border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.04]"
                    onClick={onOpenProfile}
                >
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#8774e1] relative shrink-0">
                        {currentUser?.avatar || currentUser?.avatar_url ? (
                            <img
                                src={(() => {
                                    const path = currentUser.avatar || currentUser.avatar_url;
                                    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
                                    if (path.startsWith('http') || path.startsWith('data:')) return path;
                                    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
                                })()}
                                className="w-full h-full object-cover"
                                alt=""
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-medium text-white text-2xl">
                                {currentUser?.name?.[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate text-[16px]">{currentUser?.name}</h3>
                        <p className="text-[#aaaaaa] text-[14px] truncate">@{currentUser?.username}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
                    <button type="button" onClick={onOpenWallet} className={itemCls}>
                        <Wallet className={iconCls} /> {t('wallet')}
                    </button>
                    <button type="button" onClick={onOpenExperts} className={itemCls}>
                        <Briefcase className={iconCls} /> {t('experts')}
                    </button>
                    <button type="button" onClick={onOpenJobs} className={itemCls}>
                        <ClipboardList className={iconCls} /> {t('jobs')}
                    </button>
                    <button type="button" onClick={onOpenFinance} className={itemCls}>
                        <LineChart className={iconCls} /> {t('finance')}
                    </button>
                    <button type="button" onClick={onOpenListings} className={itemCls}>
                        <Bookmark className={iconCls} /> {t('my_ads')}
                    </button>
                    {currentUser?.is_expert && onToggleExpertPanel && !isMobile && (
                        <button type="button" onClick={onToggleExpertPanel} className={itemCls}>
                            <Layout className={iconCls} />
                            {isExpertMode
                                ? t('client_view')
                                : getExpertPanelMode(currentUser) === 'mentor'
                                  ? t('mentor_panel')
                                  : t('service_panel')}
                        </button>
                    )}
                    <button type="button" onClick={onSupport} className={itemCls}>
                        <HelpCircle className={iconCls} /> {t('support')}
                    </button>
                    <div className="h-px bg-white/[0.06] my-2 mx-5"></div>
                    {(!currentUser?.is_expert || getExpertPanelMode(currentUser) === 'mentor') && (
                        <button type="button" onClick={onCreateGroup} className={itemCls}>
                            <Users className={iconCls} /> {t('create_group')}
                        </button>
                    )}
                    <button type="button" onClick={onCreateChannel} className={itemCls}>
                        <Megaphone className={iconCls} /> {t('create_channel')}
                    </button>
                    <button type="button" onClick={onOpenContacts} className={itemCls}>
                        <Contact className={iconCls} /> {t('contacts')}
                    </button>
                    <button type="button" onClick={onOpenSettings} className={itemCls}>
                        <Settings className={iconCls} /> {t('settings')}
                    </button>
                </div>

                <div className="px-5 py-4 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between text-[#aaaaaa]">
                        <span className="text-[13px]">v 1.2.0</span>
                        <Moon className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </>
    );
}

export default MessagesMenuDrawer;
