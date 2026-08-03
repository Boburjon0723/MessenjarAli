'use client';

import React from 'react';
import LiveKitRoomWrapper from './LiveKitRoomWrapper';
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
    handleEndCall: () => void;
    handleRejectCall: () => void;
    handleAcceptCall: () => void;
    setCallType: (v: 'audio' | 'video') => void;
    startLocalStream: (withVideo: boolean) => Promise<MediaStream | null>;
    pcRef: React.MutableRefObject<RTCPeerConnection | null>;
    toggleMute: () => void;
    isMuted: boolean;
};

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
    handleEndCall,
    handleRejectCall,
    handleAcceptCall,
    setCallType,
    startLocalStream,
    pcRef,
    toggleMute,
    isMuted,
}: ChatCallOverlayProps) {
    return (
                    <div className="absolute inset-0 z-[100] bg-[#0d0d0f]/90 backdrop-blur-2xl flex flex-col items-center justify-between py-4 sm:py-6 md:py-8 animate-fade-in shadow-2xl overflow-hidden min-h-0">
                        {/* Remote audio — ovozli chaqiruvda sherik ovozini ijro qilish (ref doim overlayda) */}
                        <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only absolute opacity-0 w-0 h-0 pointer-events-none" aria-hidden />
                        {/* Elegant floating background glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

                        <div className="flex flex-col items-center z-10 w-full px-3 sm:px-6 md:px-8 flex-1 min-h-0 min-w-0">
                            <div className="text-center mb-3 sm:mb-4 md:mb-6 animate-slide-down shrink-0">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-wide mb-1 sm:mb-2 truncate max-w-[90vw]">{callData?.fromName || displayName}</h2>
                                {isIncomingCall ? (
                                    <p className="text-blue-400 font-medium tracking-widest uppercase text-xs sm:text-sm animate-pulse flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        {t('incoming_call')}... ({callType === 'video' ? t('video_call') : t('voice_call')})
                                    </p>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                                        <p className="text-white/40 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] px-2 sm:px-3 py-0.5 sm:py-1 bg-white/5 rounded-full">{callType === 'video' ? t('video_call') : t('voice_call')}</p>
                                        <p className="text-blue-400 font-mono text-lg sm:text-xl md:text-2xl tracking-widest font-light">{formatCallTime(callTimer)}</p>
                                    </div>
                                )}
                            </div>

                            <div className="relative group flex-1 min-h-0 w-full max-w-4xl flex flex-col min-w-0">
                                {callType === 'video' ? (
                                    <div className="relative w-full flex-1 min-h-[180px] sm:min-h-[200px] max-h-[40vh] sm:max-h-[50vh] md:max-h-[55vh] bg-black/60 rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-2xl ring-2 ring-white/5 mali-video-call-container">
                                        <LiveKitRoomWrapper
                                            sessionId={String(chat?.id ?? 'demo-room')}
                                            onDisconnected={handleEndCall}
                                        />
                                    </div>
                                ) : (
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 rounded-full animate-ping-slow bg-blue-500/20" />
                                        <div className="absolute -inset-2 sm:-inset-4 rounded-full animate-ping-slower bg-blue-500/10" />
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full glass-premium border-2 border-white/20 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold text-white shadow-[0_0_50px_rgba(59,130,246,0.5)] overflow-hidden relative z-10">
                                            {(() => {
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
                                                if (avatar && avatar !== 'null' && avatar !== '') {
                                                    const src = avatar.startsWith('http')
                                                        ? avatar
                                                        : avatar.startsWith('data:')
                                                          ? avatar
                                                          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
                                                    return <img src={src} className="w-full h-full object-cover" />;
                                                }
                                                return String(displayName || callData?.fromName || '?')[0].toUpperCase();
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center w-full z-10 pt-2 sm:pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] shrink-0">
                            {isIncomingCall ? (
                                <div className="flex items-center gap-6 sm:gap-8 md:gap-10">
                                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                                        <button onClick={handleRejectCall} className="min-w-[48px] min-h-[48px] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 touch-manipulation" aria-label={t('reject') as string}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.15 10.85 21.56 21 21v-5.54z" /></svg>
                                        </button>
                                        <span className="text-white/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{t('reject')}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/40" />
                                            <button onClick={handleAcceptCall} className="relative min-w-[48px] min-h-[48px] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 touch-manipulation" aria-label={t('accept') as string}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            </button>
                                        </div>
                                        <span className="text-white/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{t('accept')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-premium px-3 py-2.5 sm:px-5 sm:py-3 rounded-full border border-white/10 flex items-center gap-3 sm:gap-5 shadow-2xl bg-black/40">
                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={async () => {
                                                const newType = callType === 'video' ? 'audio' : 'video';
                                                setCallType(newType);
                                                if (isCalling && !isIncomingCall) {
                                                    const stream = await startLocalStream(newType === 'video');
                                                    if (stream && pcRef.current) {
                                                        const videoTrack = stream.getVideoTracks()[0];
                                                        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
                                                        if (sender && videoTrack) {
                                                            sender.replaceTrack(videoTrack);
                                                        } else if (videoTrack) {
                                                            pcRef.current.addTrack(videoTrack, stream);
                                                        }
                                                    }
                                                }
                                            }}
                                            className={`min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 active:scale-95 touch-manipulation ${callType === 'video' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                        <span className="text-white/50 text-[8px] sm:text-[9px] uppercase font-bold tracking-wider">{t('camera')}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <button onClick={handleEndCall} className="min-w-[52px] min-h-[52px] w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 text-white flex items-center justify-center shadow-[0_0_24px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 touch-manipulation" aria-label={t('exit') as string}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.15 10.85 21.56 21 21v-5.54z" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={toggleMute}
                                            className={`min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 active:scale-95 touch-manipulation ${
                                                isMuted ? 'bg-red-500/80 border-red-400 shadow-red-500/40' : 'bg-white/10 hover:bg-white/20 border border-white/10'
                                            }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        </button>
                                        <span className="text-white/50 text-[8px] sm:text-[9px] uppercase font-bold tracking-wider">{isMuted ? t('mic_off') : t('mic_on')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

    );
}

export default ChatCallOverlay;
