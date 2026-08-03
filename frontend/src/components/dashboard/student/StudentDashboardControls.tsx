'use client';

import React, { useEffect, useState } from 'react';
import { useLocalParticipant, useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSocket } from '@/context/SocketContext';

export function StudentMentorMediaSync({ sessionId }: { sessionId: string }) {
    const { socket } = useSocket();
    const { localParticipant } = useLocalParticipant();
    const connectionState = useConnectionState();

    useEffect(() => {
        if (!socket || connectionState !== ConnectionState.Connected || !localParticipant) return;
        const onCmd = (p: { sessionId?: string; kind?: string; enabled?: boolean }) => {
            if (p == null || String(p.sessionId) !== String(sessionId)) return;
            if (p.kind === 'mic') {
                void localParticipant.setMicrophoneEnabled(!!p.enabled);
            }
        };
        socket.on('mentor_media_command', onCmd);
        return () => {
            socket.off('mentor_media_command', onCmd);
        };
    }, [socket, sessionId, localParticipant, connectionState]);

    return null;
}

export function StudentMediaControls() {
    const { t } = useLanguage();
    const { localParticipant } = useLocalParticipant();
    const connectionState = useConnectionState();
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isCamEnabled, setIsCamEnabled] = useState(true);

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected || !localParticipant) return;
        const t = setTimeout(() => {
            localParticipant.setMicrophoneEnabled(true).then(() => setIsMicEnabled(true)).catch((e) => {
                console.warn('Student mic:', e);
                setIsMicEnabled(false);
            });
            localParticipant.setCameraEnabled(true).then(() => setIsCamEnabled(true)).catch((e) => {
                console.warn('Student camera (kamera yo\'q bo\'lishi mumkin):', e);
                setIsCamEnabled(false);
            });
        }, 600);
        return () => clearTimeout(t);
    }, [connectionState, localParticipant]);

    const toggleMic = async () => {
        const nextState = !isMicEnabled;
        await localParticipant.setMicrophoneEnabled(nextState);
        setIsMicEnabled(nextState);
    };

    const toggleCam = async () => {
        const nextState = !isCamEnabled;
        await localParticipant.setCameraEnabled(nextState);
        setIsCamEnabled(nextState);
    };

    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <button
                type="button"
                onClick={toggleMic}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all lg:h-10 lg:w-10 border ${!isMicEnabled ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/40 ring-1 ring-red-400/30' : 'bg-white/10 border-white/10 text-white/80 hover:bg-white/20 hover:border-white/20 hover:text-white shadow-xl shadow-black/20'}`}
                title={isMicEnabled ? t('mic_off_title') : t('mic_on_title')}
            >
                {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
                type="button"
                onClick={toggleCam}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all lg:h-10 lg:w-10 border ${!isCamEnabled ? 'bg-red-500 border-red-400 text-white shadow-lg shadow-red-500/40 ring-1 ring-red-400/30' : 'bg-white/10 border-white/10 text-white/80 hover:bg-white/20 hover:border-white/20 hover:text-white shadow-xl shadow-black/20'}`}
                title={isCamEnabled ? t('cam_off_title') : t('cam_on_title')}
            >
                {isCamEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
        </div>
    );
}

interface ControlButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    color: 'blue' | 'pink' | 'emerald' | 'violet';
    label: string;
    pulse?: boolean;
    /** Header (desktop): ixcham, faqat ikonka + sr-only */
    compact?: boolean;
    /** Mobil pastki bar: katta bosish maydoni + qisqa yozuv */
    mobileDock?: boolean;
}

export function ControlToggleButton({
    active,
    onClick,
    icon,
    color,
    label,
    pulse,
    compact,
    mobileDock,
}: ControlButtonProps) {
    const colorClasses = {
        blue: active
            ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-500/50 ring-1 ring-sky-400/50'
            : 'text-sky-300 border-white/10 bg-white/5 hover:bg-sky-500/20 hover:border-sky-500/30 hover:text-sky-200',
        pink: active
            ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-lg shadow-fuchsia-500/50 ring-1 ring-fuchsia-400/50'
            : 'text-fuchsia-300 border-white/10 bg-white/5 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/30 hover:text-fuchsia-200',
        emerald: active
            ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/50 ring-1 ring-emerald-400/50'
            : 'text-emerald-300 border-white/10 bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/30 hover:text-emerald-200',
        violet: active
            ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-500/50 ring-1 ring-violet-400/50'
            : 'text-violet-300 border-white/10 bg-white/5 hover:bg-violet-500/20 hover:border-violet-500/30 hover:text-violet-200',
    };

    const layout = mobileDock
        ? 'min-h-[3.25rem] min-w-[3.5rem] flex-col gap-1 rounded-2xl border bg-[#0c0f1a]/95 px-2 py-2 text-[10px] backdrop-blur-2xl shadow-xl'
        : compact
          ? 'gap-1.5 rounded-xl px-2.5 py-2 text-[10px] border shadow-md'
          : 'gap-2.5 rounded-full px-5 py-3 text-xs border bg-black/40 backdrop-blur-xl shadow-xl';

    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={`group relative flex items-center justify-center font-black uppercase tracking-widest transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 ${colorClasses[color]} ${layout} ${active ? 'z-10 scale-[1.05]' : 'opacity-80 hover:opacity-100 hover:scale-105'} ${pulse ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#05060c] animate-pulse' : ''}`}
        >
            <span className="transition-transform group-hover:scale-110">{icon}</span>
            {mobileDock ? <span className="max-w-[4rem] text-center leading-none mt-1">{label}</span> : null}
            {compact && !mobileDock ? <span className="sr-only">{label}</span> : null}
            {!compact && !mobileDock ? <span className="ml-1 tracking-[0.2em]">{label}</span> : null}
            
            {/* Glossy overlay */}
            <div className="absolute inset-0 rounded-inherit bg-gradient-to-tr from-white/10 to-transparent pointer-events-none opacity-50" />
        </button>
    );
}

