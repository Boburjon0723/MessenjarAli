'use client';

import React from 'react';
import { MicOff, Video, VideoOff } from 'lucide-react';
import { useRemoteParticipants } from '@livekit/components-react';
import { useLanguage } from '@/context/LanguageContext';
import { getStudentPanelExpertLabel, type ExpertPanelMode } from '@/lib/expert-roles';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
export const getAvatarUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

/** Savol matni: yangi qator, `**qalin**` */
export function FormattedQuizText({ text }: { text: string }) {
    if (!text?.trim()) return null;
    const lines = text.split('\n');
    return (
        <div className="space-y-1 text-[15px] sm:text-sm font-medium text-white/92 leading-relaxed">
            {lines.map((line, li) => {
                const segments = line.split(/(\*\*[^*]+\*\*)/g).filter((s) => s !== '');
                return (
                    <p key={li} className="whitespace-pre-wrap break-words">
                        {segments.map((part, pi) => {
                            const bold = part.match(/^\*\*([^*]+)\*\*$/);
                            if (bold) {
                                return (
                                    <strong key={pi} className="font-semibold text-white">
                                        {bold[1]}
                                    </strong>
                                );
                            }
                            return <span key={pi}>{part}</span>;
                        })}
                    </p>
                );
            })}
        </div>
    );
}

export function parseLkRole(metadata: string | undefined): 'mentor' | 'student' | null {
    if (!metadata) return null;
    try {
        const m = JSON.parse(metadata) as { lkRole?: string };
        if (m.lkRole === 'mentor') return 'mentor';
        if (m.lkRole === 'student') return 'student';
    } catch {
        /* ignore */
    }
    return null;
}

export function MentorProfileHeader({
    mentorAudioOn = true,
    mentorVideoOn = true,
    className = '',
    panelMode = 'mentor',
}: {
    mentorAudioOn?: boolean;
    mentorVideoOn?: boolean;
    className?: string;
    panelMode?: ExpertPanelMode;
}) {
    const { t } = useLanguage();
    const expertRoleLabel = getStudentPanelExpertLabel(panelMode, t);
    const participants = useRemoteParticipants();
    const mentor =
        participants.find((p) => parseLkRole(p.metadata) === 'mentor') ??
        (participants.length > 0 ? participants[0] : null);

    let mentorAvatar: string | null = null;
    if (mentor?.metadata) {
        try {
            const meta = JSON.parse(mentor.metadata);
            mentorAvatar = meta.avatar_url || meta.avatar;
        } catch {
            /* ignore */
        }
    }
    return (
        <div
            className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-2 bg-black/40 backdrop-blur-2xl rounded-[1.25rem] border border-white/10 shadow-2xl transition-all hover:border-white/20 hover:bg-black/50 ring-1 ring-white/5 ${className}`}
        >
            <div className="flex flex-col items-end min-w-0">
                <span className="text-[9px] text-sky-400/80 font-black uppercase tracking-[0.25em]">{expertRoleLabel}</span>
            </div>
            <div
                className="flex items-center gap-1.5 shrink-0 rounded-xl bg-white/5 border border-white/10 px-2 py-1.5 shadow-inner"
                title={t('expert_mic_cam_socket')}
            >
                {mentorAudioOn ? (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                ) : (
                    <MicOff className="w-3 h-3 text-red-400" aria-hidden />
                )}
                {mentorVideoOn ? (
                    <Video className="w-3.5 h-3.5 text-sky-400" aria-hidden />
                ) : (
                    <VideoOff className="w-3.5 h-3.5 text-red-400" aria-hidden />
                )}
            </div>
            <div className="relative shrink-0 group">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-sky-500/40 to-indigo-500/40 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs border border-white/20 shadow-xl overflow-hidden">
                    {mentorAvatar ? (
                        <img src={getAvatarUrl(mentorAvatar)!} alt={expertRoleLabel} className="w-full h-full object-cover" />
                    ) : mentor ? (
                        mentor.identity?.[0]?.toUpperCase() || 'U'
                    ) : (
                        '?'
                    )}
                </div>
                {mentor && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0c0d12] shadow-sm shadow-emerald-500/40">
                        <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20" />
                    </div>
                )}
            </div>
        </div>
    );
}

