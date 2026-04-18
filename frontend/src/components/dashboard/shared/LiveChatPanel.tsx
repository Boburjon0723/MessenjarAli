"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';

interface LiveChatPanelProps {
    socket: any;
    sessionId: string;
    user: any;
    className?: string; // Additional classes for flex/height
}

export function LiveChatPanel({ socket, sessionId, user, className = "" }: LiveChatPanelProps) {
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const roomMatches = (msg: any) => {
            const sid = String(sessionId);
            const candidates = [
                msg.session_id,
                msg.sessionId,
                msg.roomId,
                msg.chat_id,
                msg.chatId,
            ].filter((v) => v != null);
            return candidates.some((v) => String(v) === sid);
        };

        const pushFormatted = (msg: any) => {
            const cid = msg.clientSideId != null ? String(msg.clientSideId) : '';
            const rawAvatar =
                msg.sender_avatar ??
                msg.senderAvatar ??
                msg.avatar_url ??
                msg.avatar ??
                '';
            const formattedMsg = {
                id: cid || msg.id || `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                text: msg.content || msg.text || '',
                sender: msg.sender_name || msg.sender || 'Foydalanuvchi',
                avatar: rawAvatar || null,
                timestamp: msg.created_at || new Date().toISOString(),
            };
            setChatMessages((prev) => {
                if (prev.some((p) => p.id === formattedMsg.id)) return prev;
                const text = formattedMsg.text.trim();
                const recent = prev.slice(-12);
                if (
                    recent.some(
                        (p) =>
                            p.text.trim() === text &&
                            p.sender === formattedMsg.sender &&
                            Math.abs(
                                new Date(p.timestamp).getTime() -
                                    new Date(formattedMsg.timestamp).getTime()
                            ) < 4000
                    )
                ) {
                    return prev;
                }
                return [...prev, formattedMsg];
            });
        };

        const handleSessionChat = (msg: any) => {
            if (!roomMatches(msg)) return;
            pushFormatted(msg);
        };

        const handleReceiveMessage = (msg: any) => {
            if (!roomMatches(msg)) return;
            pushFormatted(msg);
        };

        socket.on('session_chat:receive', handleSessionChat);
        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('session_chat:receive', handleSessionChat);
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [socket, sessionId]);

    useEffect(() => {
        // Auto scroll to bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        // Emit to backend using session_chat:send format
        const payload = {
            sessionId: sessionId,
            content: newMessage.trim(),
            type: 'text'
        };

        socket.emit('session_chat:send', payload);
        setNewMessage("");
    };

    return (
        <GlassCard className={`flex flex-col overflow-hidden !bg-[#1c1f2b] !rounded-xl !border-transparent ${className}`}>
            <div className="p-3 border-b border-white/5 flex justify-between items-center bg-[#161821]/50">
                <h2 className="font-bold text-[15px] pl-1">Chat</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Jonli</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {chatMessages.length === 0 ? (
                    <div className="text-white/30 text-xs text-center mt-4">Xabarlar yo'q</div>
                ) : (
                    chatMessages.map(msg => (
                        <div key={msg.id} className="flex gap-3.5 text-sm animate-slide-up group">
                            <div className="relative shrink-0">
                                {(() => {
                                    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
                                    const getAvatarUrl = (path: string) => {
                                        if (!path) return null;
                                        if (path.startsWith('http') || path.startsWith('data:')) return path;
                                        return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
                                    };
                                    const seed = encodeURIComponent(String(msg.sender || msg.id || 'u'));
                                    const fallbackDice = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=1e293b`;
                                    const src = getAvatarUrl(msg.avatar) || fallbackDice;
                                    return (
                                        <img
                                            src={src}
                                            alt="avatar"
                                            className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-lg"
                                            onError={(e: any) => {
                                                e.target.onerror = null;
                                                e.target.src = fallbackDice;
                                            }}
                                        />
                                    );
                                })()}
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-[#1c1f2b]"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-col gap-1">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest opacity-80 group-hover:text-blue-400/60 transition-colors">
                                        {msg.sender}
                                    </p>
                                    <div className="inline-block px-3.5 py-2.5 rounded-2xl rounded-tl-none bg-white/5 border border-white/5 shadow-sm group-hover:bg-white/[0.08] transition-colors max-w-[90%]">
                                        <p className="text-white/90 text-[13px] leading-relaxed break-words font-medium">
                                            {msg.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-[#11131a] border-t border-white/5">
                <form className="relative" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        placeholder="Xabar yozing..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        aria-label="Chat xabari"
                        className="w-full bg-[#1c1f2b] rounded-xl py-2.5 px-4 pr-10 text-sm text-white placeholder-white/40 border border-white/5 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        aria-label="Yuborish"
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-blue-400 disabled:opacity-50 disabled:hover:text-white/40 bg-transparent outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                    >
                        <Send className="w-4 h-4" aria-hidden />
                    </button>
                </form>
            </div>
        </GlassCard>
    );
}

