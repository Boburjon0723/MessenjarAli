"use client";

import React, { useCallback } from 'react';
import { useCallState } from '@/lib/useCallState';
import { callReset, toggleMute, toggleSpeaker, type CallState } from '@/lib/callStore';
import { useSocket } from '@/context/SocketContext';
import { CHAT_CALLS_ALLOWED } from '@/lib/chat-calls';
import { Phone, PhoneOff, Mic, MicOff, Volume2, Video } from 'lucide-react';

function formatTimer(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function GlobalCallOverlay() {
    const call = useCallState();
    const { socket } = useSocket();

    const handleAccept = useCallback(() => {
        if (!socket || call.status !== 'ringing_in' || !call.peerId) return;
        socket.emit('accept_call', {
            to: call.peerId,
            chatId: call.chatId,
            signal: { type: 'livekit' },
        });
    }, [socket, call.status, call.peerId, call.chatId]);

    const handleReject = useCallback(() => {
        if (!socket || !call.peerId) return;
        socket.emit(call.status === 'ringing_in' ? 'reject_call' : 'end_call', {
            to: call.peerId,
            chatId: call.chatId,
        });
        callReset();
    }, [socket, call.status, call.peerId, call.chatId]);

    const handleEnd = useCallback(() => {
        if (!socket || !call.peerId) return;
        socket.emit('end_call', {
            to: call.peerId,
            chatId: call.chatId,
            durationSeconds: call.timer,
        });
        callReset();
    }, [socket, call.peerId, call.chatId, call.timer]);

    if (!CHAT_CALLS_ALLOWED || call.status === 'idle') return null;

    const isRinging = call.status === 'ringing_in' || call.status === 'ringing_out';
    const isActive = call.status === 'active';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
                background: 'linear-gradient(135deg, #1a1040 0%, #2d1b69 40%, #1e3a5f 100%)',
            }}
        >
            {/* Peer info */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold border-2 border-white/30 shadow-xl">
                    {call.peerName?.[0]?.toUpperCase() || '?'}
                </div>
                <h2 className="text-white text-2xl font-semibold">{call.peerName || 'Unknown'}</h2>
                <p className="text-white/60 text-sm">
                    {call.status === 'ringing_in' && 'Kiruvchi qo\'ng\'iroq...'}
                    {call.status === 'ringing_out' && 'Qo\'ng\'iroq qilinmoqda...'}
                    {isActive && formatTimer(call.timer)}
                </p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-6">
                {isActive && (
                    <>
                        <button
                            onClick={toggleSpeaker}
                            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        >
                            <Volume2 className={`w-6 h-6 ${call.isSpeaker ? 'text-[#8774e1]' : ''}`} />
                        </button>
                        <button
                            onClick={() => toggleMute()}
                            className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                        >
                            {call.isMuted ? <MicOff className="w-6 h-6 text-red-400" /> : <Mic className="w-6 h-6" />}
                        </button>
                    </>
                )}

                {call.status === 'ringing_in' && (
                    <button
                        onClick={handleAccept}
                        className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center text-white shadow-lg transition-colors"
                    >
                        <Phone className="w-7 h-7" />
                    </button>
                )}

                <button
                    onClick={isActive ? handleEnd : handleReject}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center text-white shadow-lg transition-colors"
                >
                    <PhoneOff className="w-7 h-7" />
                </button>
            </div>

            {/* Back button */}
            <button
                onClick={isActive ? handleEnd : handleReject}
                className="absolute top-6 left-6 text-white/60 hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
                ← Orqaga
            </button>
        </div>
    );
}
