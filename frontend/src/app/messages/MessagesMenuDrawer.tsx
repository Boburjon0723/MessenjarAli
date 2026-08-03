'use client';

import React from 'react';
import {
    X,
    UserCircle,
    Wallet,
    HelpCircle,
    Users,
    Megaphone,
    Contact,
    Settings,
    Moon,
} from 'lucide-react';
import { getExpertPanelMode } from '@/lib/expert-roles';

export type MessagesMenuDrawerProps = {
    t: (...args: any[]) => string;
    currentUser: any;
    onClose: () => void;
    onOpenProfile: () => void;
    onOpenWallet: () => void;
    onSupport: () => void;
    onCreateGroup: () => void;
    onCreateChannel: () => void;
    onOpenContacts: () => void;
    onOpenSettings: () => void;
};

export function MessagesMenuDrawer({
    t,
    currentUser,
    onClose,
    onOpenProfile,
    onOpenWallet,
    onSupport,
    onCreateGroup,
    onCreateChannel,
    onOpenContacts,
    onOpenSettings,
}: MessagesMenuDrawerProps) {
    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] animate-fade-in" onClick={onClose}></div>
            <div className="fixed top-0 left-0 bottom-0 w-[300px] z-[110] flex flex-col animate-slide-drawer-left bg-white/30 backdrop-blur-[25px] brightness-[0.85] border-r border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between p-5 px-6 border-b border-white/10">
                    <div className="min-w-0">
                        <h2 className="text-white font-bold text-xl tracking-tight drop-shadow-md leading-tight">ExpertLine</h2>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45 mt-0.5 leading-snug">Mutaxassislarni toping · xavfsiz muloqot</p>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors shrink-0"><X className="h-5 w-5" /></button>
                </div>

                <div className="px-6 py-8 flex items-center gap-5 border-b border-white/10 group cursor-pointer hover:bg-white/10 transition-all"
                    onClick={onOpenProfile}>
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl relative">
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
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xl">
                                {currentUser?.name?.[0]}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold truncate text-lg drop-shadow-sm">{currentUser?.name}</h3>
                        <p className="text-white/60 text-[13px] font-medium truncate">@{currentUser?.username}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                    <button onClick={onOpenProfile} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                        <UserCircle className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('profile')}
                    </button>
                    <button onClick={onOpenWallet} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                        <Wallet className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('wallet')}
                    </button>
                    <button onClick={onSupport} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                        <HelpCircle className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('support')}
                    </button>
                    <div className="h-[1px] bg-white/10 my-4 mx-6"></div>
                    {(!currentUser?.is_expert || getExpertPanelMode(currentUser) === 'mentor') && (
                        <button onClick={onCreateGroup} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                            <Users className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('create_group')}
                        </button>
                    )}
                    <button onClick={onCreateChannel} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                        <Megaphone className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('create_channel')}
                    </button>
                    <button onClick={onOpenContacts} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                        <Contact className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('contacts')}
                    </button>
                    <button onClick={onOpenSettings} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                        <Settings className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('settings')}
                    </button>
                </div>

                <div className="p-6 border-t border-white/10 space-y-4">
                    <div className="flex items-center justify-between text-white/50 px-2">
                        <span className="text-xs uppercase font-bold tracking-widest">v 1.2.0</span>
                        <Moon className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </>
    );
}

export default MessagesMenuDrawer;
