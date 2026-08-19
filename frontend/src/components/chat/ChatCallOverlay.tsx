'use client';

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Mic, MicOff, PhoneOff, Speaker, Video, VideoOff } from 'lucide-react';
import LiveKitRoomWrapper from './LiveKitRoomWrapper';
import { AvatarLightbox } from './AvatarLightbox';
import type { ChatRoom } from '@/types/chat-room';
import type { CallSignalPayload } from '@/types/chat-room';

export type ChatCallOverlayProps = {
    t: (...args: any[]) => string;
    remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
    callData: CallSignalPayload | null;
    displayName: string;
    isIncomingCall: boolean;
    isCalling: boolean;
    callType: 'audio' | 'video';
    callTimer: number;
    formatCallTime: (seconds: number) => string;
    chat: ChatRoom | null | undefined;
    canShowVideo?: boolean;
    handleEndCall: () => void;
    handleRejectCall: () => void;
    handleAcceptCall: () => void;
    setCallType: (v: 'audio' | 'video') => void;
    startLocalStream: (withVideo: boolean) => Promise<MediaStream | null>;
    pcRef: React.MutableRefObject<RTCPeerConnection | null>;
    toggleMute: () => void;
    isMuted: boolean;
};

function resolveAvatarSrc(
    chat: ChatRoom | null | undefined,
    callData: CallSignalPayload | null
): string | null {
    const avatarRaw =
        chat?.avatar ??
        chat?.otherUser?.avatar ??
        chat?.otherUser?.avatar_url ??
        callData?.fromAvatar;
    const avatar =
        typeof avatarRaw === 'string'
            ? avatarRaw
            : avatarRaw != null
              ? String(avatarRaw)
              : '';
    if (!avatar || avatar === 'null') return null;
    if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${base}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
}

export function ChatCallOverlay({
    t,
    remoteAudioRef,
    callData,
    displayName,
    isIncomingCall,
    isCalling,
    callType,
    callTimer,
    formatCallTime,
    chat,
    canShowVideo = true,
    handleEndCall,
    handleRejectCall,
    handleAcceptCall,
    setCallType,
    startLocalStream,
    pcRef,
    toggleMute,
    isMuted,
}: ChatCallOverlayProps) {
    const liveKitRoomId = String(chat?.id ?? 'demo-room');
    const showLiveKit = isCalling && !isIncomingCall;
    const isConnected = isCalling && !isIncomingCall && callTimer > 0;
    const isOutgoingRinging = isCalling && !isIncomingCall && callTimer === 0;
    const [avatarLightbox, setAvatarLightbox] = useState(false);
    const [speakerOn, setSpeakerOn] = useState(true);

    const peerName = callData?.fromName || displayName || '?';
    const avatarSrc = useMemo(() => resolveAvatarSrc(chat, callData), [chat, callData]);

    const statusLine = isIncomingCall
        ? `${t('incoming_call')} (${callType === 'video' ? t('video_call') : t('voice_call')})`
        : isConnected
          ? formatCallTime(callTimer)
          : t('call_requesting');

    const toggleVideoType = async () => {
        if (!canShowVideo) return;
        const newType = callType === 'video' ? 'audio' : 'video';
        setCallType(newType);
        if (isCalling && !isIncomingCall) {
            const stream = await startLocalStream(newType === 'video');
            if (stream && pcRef.current) {
                const videoTrack = stream.getVideoTracks()[0];
                const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
                if (sender && videoTrack) {
                    sender.replaceTrack(videoTrack);
                } else if (videoTrack) {
                    pcRef.current.addTrack(videoTrack, stream);
                }
            }
        }
    };

    return (
        <div className="absolute inset-0 z-[100] call-screen-gradient flex flex-col animate-fade-in overflow-hidden min-h-0">
            <audio
                ref={remoteAudioRef}
                autoPlay
                playsInline
                className="sr-only absolute opacity-0 w-0 h-0 pointer-events-none"
                aria-hidden
            />

            <div className="relative z-10 flex items-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 shrink-0">
                <button
                    type="button"
                    onClick={handleEndCall}
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white text-[15px] font-medium px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label={t('back') as string}
                >
                    <ArrowLeft className="h-5 w-5 shrink-0" />
                    {t('back')}
                </button>
            </div>

            <div className="relative z-10 flex-1 min-h-0 flex flex-col items-center justify-center px-4 pb-4">
                {callType === 'video' && showLiveKit && isConnected ? (
                    <div className="w-full max-w-3xl flex-1 min-h-[180px] max-h-[42vh] bg-black/50 rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-4">
                        <LiveKitRoomWrapper sessionId={liveKitRoomId} onDisconnected={handleEndCall} />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => avatarSrc && setAvatarLightbox(true)}
                        className="relative mb-5 shrink-0 disabled:cursor-default"
                        disabled={!avatarSrc}
                        aria-label={peerName}
                    >
                        {showLiveKit && callType === 'audio' && (
                            <LiveKitRoomWrapper
                                sessionId={liveKitRoomId}
                                onDisconnected={handleEndCall}
                                audioOnly
                            />
                        )}
                        {!isConnected && (
                            <>
                                <div className="absolute inset-0 rounded-full animate-ping-slow bg-[#8774e1]/25" />
                                <div className="absolute -inset-3 rounded-full animate-ping-slower bg-[#8774e1]/15" />
                            </>
                        )}
                        <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full border-[3px] border-white/25 bg-white/10 flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(135,116,225,0.35)]">
                            {avatarSrc ? (
                                <img src={avatarSrc} alt={peerName} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl sm:text-5xl font-bold text-white">
                                    {String(peerName)[0]?.toUpperCase() || '?'}
                                </span>
                            )}
                        </div>
                    </button>
                )}

                <h2 className="text-xl sm:text-2xl font-semibold text-white text-center truncate max-w-[90vw] mb-1">
                    {peerName}
                </h2>
                <p
                    className={`text-sm sm:text-base text-center ${
                        isIncomingCall || isOutgoingRinging
                            ? 'text-[#a8b4ff] animate-pulse'
                            : 'text-white/70 font-mono tracking-wider'
                    }`}
                >
                    {statusLine}
                </p>
            </div>

            <div className="relative z-10 shrink-0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {isIncomingCall ? (
                    <div className="flex items-center justify-center gap-10 sm:gap-14">
                        <div className="flex flex-col items-center gap-2">
                            <button
                                type="button"
                                onClick={handleRejectCall}
                                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 text-white flex items-center justify-center shadow-lg shadow-red-500/30"
                                aria-label={t('reject') as string}
                            >
                                <PhoneOff className="h-6 w-6 rotate-[135deg]" />
                            </button>
                            <span className="text-white/60 text-[11px]">{t('reject')}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <button
                                type="button"
                                onClick={handleAcceptCall}
                                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30"
                                aria-label={t('accept') as string}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-6 w-6"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                    />
                                </svg>
                            </button>
                            <span className="text-white/60 text-[11px]">{t('accept')}</span>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
                        <CallControlButton
                            label={t('call_speaker') as string}
                            active={speakerOn}
                            onClick={() => setSpeakerOn((v) => !v)}
                            icon={<Speaker className="h-5 w-5" />}
                        />
                        <CallControlButton
                            label={t('camera') as string}
                            active={callType === 'video'}
                            disabled={!canShowVideo}
                            onClick={() => void toggleVideoType()}
                            icon={callType === 'video' ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                        />
                        <CallControlButton
                            label={(isMuted ? t('mic_off') : t('mic_on')) as string}
                            active={!isMuted}
                            danger={isMuted}
                            onClick={toggleMute}
                            icon={isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        />
                        <CallControlButton
                            label={t('exit') as string}
                            danger
                            onClick={handleEndCall}
                            icon={<PhoneOff className="h-5 w-5 rotate-[135deg]" />}
                        />
                    </div>
                )}
            </div>

            {avatarLightbox && avatarSrc && (
                <AvatarLightbox src={avatarSrc} alt={peerName} onClose={() => setAvatarLightbox(false)} />
            )}
        </div>
    );
}

function CallControlButton({
    label,
    icon,
    onClick,
    active = false,
    danger = false,
    disabled = false,
}: {
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-1.5">
            <button
                type="button"
                disabled={disabled}
                onClick={onClick}
                className={`w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full flex items-center justify-center text-white transition-all touch-manipulation disabled:opacity-35 disabled:pointer-events-none ${
                    danger
                        ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/25'
                        : active
                          ? 'bg-white/20 border border-white/25'
                          : 'bg-white/10 hover:bg-white/15 border border-white/10'
                }`}
            >
                {icon}
            </button>
            <span className="text-white/55 text-[10px] text-center leading-tight">{label}</span>
        </div>
    );
}

export default ChatCallOverlay;
