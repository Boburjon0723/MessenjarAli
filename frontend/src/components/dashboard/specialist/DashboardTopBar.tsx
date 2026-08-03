'use client';

import React from 'react';
import { ArrowLeft, Clock, Users, Video as VideoIcon } from 'lucide-react';

export type DashboardTopBarProps = {
    t: (...args: any[]) => string;
    onBack?: () => void;
    user: { name?: string; avatar_url?: string; avatar?: string } | null | undefined;
    getAvatarUrl: (path?: string | null) => string | null;
    panelHeader: string;
    sessionTimerHeading: string;
    sessionTimeDisplay: string;
    isLessonStarted: boolean;
    attendeesCount: number;
    lkVideoRoomPeerCount: number;
    isRecording: boolean;
    isUploadingRecording: boolean;
    recordingUploadError: string | null | undefined;
};

export function DashboardTopBar({
    t,
    onBack,
    user,
    getAvatarUrl,
    panelHeader,
    sessionTimerHeading,
    sessionTimeDisplay,
    isLessonStarted,
    attendeesCount,
    lkVideoRoomPeerCount,
    isRecording,
    isUploadingRecording,
    recordingUploadError,
}: DashboardTopBarProps) {
    const avatarSrc = getAvatarUrl(user?.avatar_url || user?.avatar);

    return (
        <div className="relative z-10 h-14 shrink-0 flex items-center justify-between px-4 mentor-glass-bar border-b border-white/10 gap-3">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}
                <div className="flex items-center gap-2">
                    {avatarSrc ? (
                        <img src={avatarSrc} alt={t('expert_role_mentor') as string} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                            {user?.name?.[0] || 'M'}
                        </div>
                    )}
                    <span className="text-sm font-bold text-white">{panelHeader}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-5 text-sm flex-wrap justify-center">
                <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className="font-mono font-semibold">
                        {sessionTimerHeading}: {sessionTimeDisplay}
                        {!isLessonStarted ? (
                            <span className="ml-1.5 text-[10px] font-normal text-slate-500 normal-case">
                                ({t('timer_not_started')})
                            </span>
                        ) : null}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
                </div>
                <div className="flex items-center gap-1.5 text-slate-300" title={t('socket_session_title')}>
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold tabular-nums">{attendeesCount}</span>
                    <span className="hidden md:inline text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                        {t('online_label')}
                    </span>
                </div>
                <div
                    className={`flex items-center gap-1.5 ${lkVideoRoomPeerCount > 0 ? 'text-emerald-300' : 'text-slate-400'}`}
                    title={t('livekit_room_title')}
                >
                    <VideoIcon className="w-4 h-4 shrink-0 opacity-90" />
                    <span className="font-semibold tabular-nums">{lkVideoRoomPeerCount}</span>
                    {lkVideoRoomPeerCount > 0 ? (
                        <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">
                            {t('video_label')}
                        </span>
                    ) : null}
                </div>
                <div
                    className={`flex items-center gap-1.5 font-bold shrink-0 ${
                        recordingUploadError
                            ? 'text-red-400'
                            : isUploadingRecording
                              ? 'text-amber-300'
                              : isRecording
                                ? 'text-red-400'
                                : 'text-slate-500'
                    }`}
                    title={
                        recordingUploadError
                            ? t('recording_upload_failed_title')
                            : isUploadingRecording
                              ? t('recording_uploading_title')
                              : isRecording
                                ? t('recording_on_title')
                                : t('recording_off_title')
                    }
                >
                    {recordingUploadError ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="text-[10px] sm:text-xs">{t('error_label')}</span>
                        </>
                    ) : isUploadingRecording ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[10px] sm:text-xs">{t('uploading_label')}</span>
                        </>
                    ) : isRecording ? (
                        <>
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            <span>{t('recording_label')}</span>
                        </>
                    ) : (
                        <span className="text-[11px] font-semibold normal-case">{t('recording_off_label')}</span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {[1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={`w-1 rounded-full ${i === 3 ? 'bg-white h-5' : i === 2 ? 'bg-slate-500 h-4' : 'bg-slate-500 h-3'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {avatarSrc ? (
                    <img src={avatarSrc} alt="User" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        {user?.name?.[0] || 'U'}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DashboardTopBar;
