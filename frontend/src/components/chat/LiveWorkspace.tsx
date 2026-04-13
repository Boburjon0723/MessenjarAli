"use client";

import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { apiFetch } from '@/lib/api';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import LiveKitRoomWrapper from './LiveKitRoomWrapper';
import { LiveWhiteboard } from '../dashboard/shared/LiveWhiteboard';
import ReviewModal from './ReviewModal';
import {
    X,
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff,
    Layout,
    Maximize2,
    Minimize2,
    FileText,
    Users,
    Clipboard,
    Send,
    User,
    MessageSquare,
    Radio,
    MonitorUp,
    StopCircle,
    Settings,
    MoreVertical,
    Shield,
    Lock,
    Unlock,
    UserX,
    FileSignature,
    Archive,
    CheckCircle2,
    PenTool
} from 'lucide-react';

interface LiveWorkspaceProps {
    chat: any;
    user: any;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    onEndCall: () => void;
    callType: 'audio' | 'video';
}

export default function LiveWorkspace({
    chat,
    user,
    localStream,
    remoteStream,
    onEndCall,
    callType = 'video'
}: LiveWorkspaceProps) {
    const { showSuccess } = useNotification();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
    const getAvatarUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
    const [showTools, setShowTools] = useState(true);
    const [activeRightTab, setActiveRightTab] = useState<'tools' | 'chat'>('tools');
    const [noteContent, setNoteContent] = useState('');
    const [isShared, setIsShared] = useState(false);

    // Chat & Recording States
    const { socket } = useSocket();
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const chatScrollRef = useRef<HTMLDivElement>(null);

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Breakout States
    const [currentRoomId, setCurrentRoomId] = useState(chat?.id || 'demo-room');
    const [isBreakoutActive, setIsBreakoutActive] = useState(false);
    const [breakoutRooms, setBreakoutRooms] = useState<Record<string, string[]>>({});
    const [numGroups, setNumGroups] = useState(2);

    // Logic Layer Mapping
    const getLogicLayer = () => {
        const profession = user?.profession?.toLowerCase();
        if (['o\'qituvchi', 'mentor', 'teacher'].includes(profession)) return 'education';
        if (['advokat', 'yurist', 'lawyer'].includes(profession)) return 'consultation';
        if (['psixolog', 'psychologist'].includes(profession)) return 'teletherapy';

        // Mock layer switching for demo
        const demoRole = localStorage.getItem('demo_role');
        if (demoRole === 'teletherapy') return 'teletherapy';
        if (demoRole === 'consultation') return 'consultation';

        return 'general';
    };

    const layer = getLogicLayer();
    const isMentor = user?.role === 'provider' || user?.role === 'admin' || layer !== 'general';

    // Teletherapy States
    const [isSessionLocked, setIsSessionLocked] = useState(false);
    const [isAnon, setIsAnon] = useState(false);
    const [isE2EEActive, setIsE2EEActive] = useState(false);

    // Consultation States
    const [isSigned, setIsSigned] = useState(false);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Fetch Initial Chats
    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await apiFetch(`/api/sessions/${chat?.id || 'demo-room'}/chat`);
                if (res.ok) {
                    const data = await res.json();
                    setChatMessages(data);
                    setTimeout(() => {
                        if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                    }, 100);
                }
            } catch (e) {
                console.error("Chat fetch error:", e);
            }
        };
        if (activeRightTab === 'chat') {
            fetchChats();
        }
    }, [activeRightTab, chat?.id, currentRoomId]); // Re-fetch on room change? Usually chat is global room, but for now we keep it global.

    // Socket Event Listeners for Chat & Breakout
    useEffect(() => {
        if (!socket) return;

        // Join session room
        socket.emit('session_join', { sessionId: chat?.id || 'demo-room' });

        const handleReceive = (msg: any) => {
            setChatMessages(prev => [...prev, msg]);
            setTimeout(() => {
                if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
            }, 100);
        };

        const handleBreakoutAssigned = (data: { subRoomId: string, mainRoomId: string }) => {
            setCurrentRoomId(data.subRoomId);
            setIsBreakoutActive(true);
        };

        const handleBreakoutRoomsCreated = (data: { assignments: Record<string, string[]> }) => {
            setBreakoutRooms(data.assignments);
            setIsBreakoutActive(true);
        };

        const handleBreakoutActive = () => setIsBreakoutActive(true);

        const handleBreakoutEnded = () => {
            setCurrentRoomId(chat?.id || 'demo-room');
            setIsBreakoutActive(false);
            setBreakoutRooms({});
        };

        const handleWhiteboardToggle = (isOpen: boolean) => {
            setShowWhiteboard(isOpen);
        };

        socket.on('session_chat:receive', handleReceive);
        socket.on('breakout:assigned', handleBreakoutAssigned);
        socket.on('breakout:rooms_created', handleBreakoutRoomsCreated);
        socket.on('breakout:active', handleBreakoutActive);
        socket.on('breakout:ended', handleBreakoutEnded);
        socket.on('whiteboard:toggle', handleWhiteboardToggle);

        return () => {
            socket.off('session_chat:receive', handleReceive);
            socket.off('breakout:assigned', handleBreakoutAssigned);
            socket.off('breakout:rooms_created', handleBreakoutRoomsCreated);
            socket.off('breakout:active', handleBreakoutActive);
            socket.off('breakout:ended', handleBreakoutEnded);
            socket.off('whiteboard:toggle', handleWhiteboardToggle);
        };
    }, [socket, chat?.id]);

    const handleSendMessage = () => {
        if (!chatInput.trim() || !socket) return;
        socket.emit('session_chat:send', {
            sessionId: chat?.id || 'demo-room',
            content: chatInput,
            type: 'text'
        });
        setChatInput('');
    };

    const handleToggleRecording = async () => {
        try {
            const action = isRecording ? 'stop' : 'start';
            const res = await apiFetch(`/api/sessions/${chat?.id || 'demo-room'}/record/${action}`, { method: 'POST' });
            if (res.ok) {
                setIsRecording(!isRecording);
            }
        } catch (e) {
            console.error("Recording error:", e);
        }
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleWhiteboard = () => {
        const newState = !showWhiteboard;
        setShowWhiteboard(newState);
        if (socket) {
            socket.emit('whiteboard:toggle', { sessionId: chat?.id || 'demo-room', isOpen: newState });
        }
    };
    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const saveQuickNote = async () => {
        if (!noteContent.trim()) return;
        try {
            const res = await apiFetch('/api/specialists/notes', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: chat.otherUser?.id || chat.userId || chat.id,
                    content: noteContent,
                    shared_with_client: isShared,
                    chat_id: chat.id
                })
            });
            if (res.ok) {
                setNoteContent('');
                setIsShared(false);
                showSuccess("Eslatma saqlandi!");
            }
        } catch (e) { console.error("Note save error:", e); }
    };

    const startBreakout = () => {
        if (!socket) return;
        socket.emit('breakout:start', { sessionId: chat?.id || 'demo-room', numGroups });
    };

    const endBreakout = () => {
        if (!socket) return;
        socket.emit('breakout:end', { sessionId: chat?.id || 'demo-room' });
    };

    const joinSubRoom = (subRoomId: string) => {
        setCurrentRoomId(subRoomId);
    };

    return (
        <div className="absolute inset-0 z-[100] flex flex-col bg-[#0a0a0c] text-white">
            {showWhiteboard && (
                <div className="fixed inset-0 z-[200] p-10 bg-black/80 backdrop-blur-2xl animate-fade-in flex items-center justify-center">
                    <div className="w-full h-full max-w-6xl max-h-[85vh] relative flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                Interaktiv Doska (Whiteboard)
                            </h3>
                            <button
                                onClick={toggleWhiteboard}
                                className="p-2 bg-white/5 hover:bg-red-500 text-white rounded-xl transition-all shadow-xl"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <LiveWhiteboard
                            socket={socket}
                            sessionId={currentRoomId}
                            isMentor={isMentor}
                            onClose={toggleWhiteboard}
                        />
                    </div>
                </div>
            )}
            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Video Stage */}
                <div className={`flex-1 relative bg-black transition-all duration-500 ${showTools ? 'mr-0' : ''}`}>
                    {/* LiveKit SFU Video Stage */}
                    <div className="w-full h-full flex flex-col items-center justify-center relative bg-black/50">
                        {/* Remount LiveKitRoomWrapper when currentRoomId changes to auto-connect to new room */}
                        <LiveKitRoomWrapper
                            key={currentRoomId}
                            sessionId={currentRoomId}
                            onDisconnected={onEndCall}
                        />
                    </div>

                    {/* Overlay Info */}
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                        <GlassCard className="!px-3 !py-1.5 flex items-center gap-2 !rounded-full border-white/10">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold tracking-tight">LIVE: {chat?.name}</span>
                        </GlassCard>
                    </div>
                </div>

                {/* Specialist Tools Panel */}
                {showTools && (
                    <aside className="w-80 border-l border-white/10 glass-premium flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between">
                            <div className="flex bg-white/5 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveRightTab('tools')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeRightTab === 'tools' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/80'}`}
                                >
                                    Asboblar
                                </button>
                                <button
                                    onClick={() => setActiveRightTab('chat')}
                                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeRightTab === 'chat' ? 'bg-blue-500 text-white' : 'text-white/40 hover:text-white/80'}`}
                                >
                                    Chat & Info
                                </button>
                            </div>
                            <button onClick={() => setShowTools(false)} className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar flex flex-col">
                            {activeRightTab === 'tools' ? (
                                <>
                                    {layer === 'teletherapy' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 text-blue-400">
                                                <Shield className="h-5 w-5" />
                                                <h4 className="font-bold text-sm">Xavfsizlik va Maxfiylik</h4>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Session Lock */}
                                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-white">Xonani Qulflash</span>
                                                        <span className="text-[10px] text-white/40">Yangi mijozlar kirolmaydi</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsSessionLocked(!isSessionLocked)}
                                                        className={`p-2 rounded-lg transition-all ${isSessionLocked ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white/50'}`}
                                                    >
                                                        {isSessionLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                    </button>
                                                </div>

                                                {/* E2EE */}
                                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-white">E2E Shifrlash</span>
                                                        <span className="text-[10px] text-white/40">Tibbiy maxfiylik uchun</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsE2EEActive(!isE2EEActive)}
                                                        className={`p-2 rounded-lg transition-all ${isE2EEActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/10 text-white/50'}`}
                                                    >
                                                        {isE2EEActive ? <Shield className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                                                    </button>
                                                </div>

                                                {/* Anonymous Mode (If patient) */}
                                                {!isMentor && (
                                                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-white">Anonim rejim</span>
                                                            <span className="text-[10px] text-white/40">Ismni yashirish</span>
                                                        </div>
                                                        <button
                                                            onClick={() => setIsAnon(!isAnon)}
                                                            className={`p-2 rounded-lg transition-all ${isAnon ? 'bg-blue-500/20 text-blue-500' : 'bg-white/10 text-white/50'}`}
                                                        >
                                                            <UserX className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <hr className="border-white/10" />

                                            <div className="flex items-center gap-2 text-blue-400">
                                                <Clipboard className="h-5 w-5" />
                                                <h4 className="font-bold text-sm">Sessiya Qaydlari</h4>
                                            </div>
                                            <textarea
                                                value={noteContent}
                                                onChange={(e) => setNoteContent(e.target.value)}
                                                placeholder="Mijoz haqida muhim ma'lumotlarni yozing..."
                                                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-white/10"
                                            />
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    id="share-note"
                                                    checked={isShared}
                                                    onChange={(e) => setIsShared(e.target.checked)}
                                                    className="w-4 h-4 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500"
                                                />
                                                <label htmlFor="share-note" className="text-[10px] text-white/60 font-medium cursor-pointer">
                                                    Mijoz bilan ulashish (Guruhga yuborish)
                                                </label>
                                            </div>
                                            <button
                                                onClick={saveQuickNote}
                                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Send className="h-3 w-3" /> Saqlash
                                            </button>
                                        </div>
                                    )}

                                    {layer === 'education' && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-emerald-400">
                                                    <Users className="h-5 w-5" />
                                                    <h4 className="font-bold text-sm">Guruh Boshqaruvi</h4>
                                                </div>
                                                {isBreakoutActive && (
                                                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">ACTIVE</span>
                                                )}
                                            </div>

                                            {/* Always visible tools in Education layer */}
                                            <button
                                                onClick={() => {
                                                    const newState = !showWhiteboard;
                                                    setShowWhiteboard(newState);
                                                    if (socket) socket.emit('whiteboard:toggle', { sessionId: chat?.id || 'demo-session', isOpen: newState });
                                                }}
                                                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all border mb-4 flex items-center justify-center gap-2 ${showWhiteboard ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20'}`}
                                            >
                                                <PenTool className="w-4 h-4" />
                                                {showWhiteboard ? 'Doskani Yopish' : 'Interaktiv Doska (Whiteboard)'}
                                            </button>

                                            {isBreakoutActive ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-[10px] text-white/50 uppercase font-black tracking-widest">Sizning xonangiz:</span>
                                                        <span className="text-[10px] font-bold text-blue-400 truncate max-w-[120px]">{currentRoomId}</span>
                                                    </div>

                                                    {Object.entries(breakoutRooms).map(([roomId, users], idx) => (
                                                        <div key={roomId} className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col gap-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-bold text-emerald-300 uppercase tracking-tighter">Guruh {idx + 1}</span>
                                                                <span className="text-[10px] text-white/40">{users.length} talaba</span>
                                                            </div>
                                                            {currentRoomId !== roomId ? (
                                                                <button onClick={() => joinSubRoom(roomId)} className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-bold transition-all">
                                                                    Kirish (Kuzatish)
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => setCurrentRoomId(chat?.id || 'demo-room')} className="w-full py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition-all">
                                                                    Asosiy Xonaga Qaytish
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {isMentor && (
                                                        <button onClick={endBreakout} className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 rounded-xl text-xs font-bold transition-all mt-2">
                                                            Barchani Qaytarish (End)
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                                                    <p className="text-[10px] text-white/50 text-center leading-relaxed font-medium">
                                                        Talabalarni avtomatik tarzda kichik guruhlarga (Breakout Rooms) bo'lish.
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="2" max="10"
                                                            value={numGroups}
                                                            onChange={(e) => setNumGroups(parseInt(e.target.value) || 2)}
                                                            className="flex-1 bg-black/50 border border-white/10 rounded-lg p-2 text-sm text-center outline-none focus:border-emerald-500 text-white font-bold"
                                                        />
                                                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">ta guruh</span>
                                                    </div>
                                                    <button onClick={startBreakout} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 uppercase">
                                                        Bo'lishni Boshlash
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {layer === 'consultation' && (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-purple-400">
                                                    <FileText className="h-5 w-5" />
                                                    <h4 className="font-bold text-sm">Ish Papkasi (Case)</h4>
                                                </div>
                                                <button className="text-purple-400 hover:bg-purple-500/10 p-1.5 rounded-lg transition-all">
                                                    <Archive className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                                <p className="text-[10px] text-purple-200/60 uppercase font-black mb-2 tracking-widest">Aktiv Ish</p>
                                                <p className="text-sm font-bold text-white mb-2">№ 2024-08/12 - Fuqarolik Ishi</p>
                                                <div className="flex items-center gap-2 mt-4">
                                                    <button className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all">Fayllar</button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <span className="text-xs font-bold text-white/50">Imzolash uchun hujjat:</span>
                                                <div className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between">
                                                    <div className="flex gap-2 items-center">
                                                        <FileSignature className="h-4 w-4 text-purple-400" />
                                                        <span className="text-xs font-medium text-white/80">Kelishuv_shartnomasi.pdf</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setIsSigned(true)}
                                                        disabled={isSigned}
                                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isSigned ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-purple-600 text-white hover:bg-purple-500'}`}
                                                    >
                                                        {isSigned ? <div className="flex gap-1 items-center"><CheckCircle2 className="h-3 w-3" /> Imzolandi</div> : 'Imzolash'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col space-y-4">
                                    {/* Session Info & Recording Controls */}
                                    <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white/60">SESSION NAZORATI</span>
                                            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                LIVE
                                            </div>
                                        </div>
                                        {isMentor ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleToggleRecording}
                                                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-red-500/10 hover:bg-red-500/20 text-red-500'
                                                        }`}
                                                >
                                                    {isRecording ? <StopCircle className="h-3.5 w-3.5" /> : <Radio className="h-3.5 w-3.5" />}
                                                    {isRecording ? 'To\'xtatish' : 'Yozish'}
                                                </button>
                                                <button className="flex-1 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors">
                                                    <MonitorUp className="h-3.5 w-3.5" /> Ekran
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-white/40 text-center">Faqat mentor uchun boshqaruv mavjud</p>
                                        )}
                                    </div>

                                    {/* Chat Messages Area */}
                                    <div ref={chatScrollRef} className="flex-1 min-h-[200px] border border-white/10 rounded-xl bg-black/20 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
                                        {chatMessages.length === 0 ? (
                                            <p className="text-xs text-white/30 text-center m-auto">Xabarlar tarixi bo'sh</p>
                                        ) : (
                                            chatMessages.map((msg, i) => (
                                                <div key={i} className={`flex gap-3 max-w-[85%] ${msg.sender_id === user?.id ? 'self-end flex-row-reverse' : 'self-start'}`}>
                                                    <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                                                        {getAvatarUrl(msg.sender_avatar || msg.senderAvatar) ? (
                                                            <img src={getAvatarUrl(msg.sender_avatar || msg.senderAvatar)!} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User className="w-4 h-4 text-white/40" />
                                                        )}
                                                    </div>
                                                    <div className={`flex flex-col ${msg.sender_id === user?.id ? 'items-end' : 'items-start'}`}>
                                                        <div className={`p-2.5 rounded-xl ${msg.sender_id === user?.id ? 'bg-blue-600/20 rounded-tr-none' : 'bg-white/5 rounded-tl-none'}`}>
                                                            <span className="text-[10px] text-white/40 mb-1 font-bold block">{msg.sender_name || msg.senderName}</span>
                                                            <span className="text-sm text-white/90">{msg.text || msg.content}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Chat Input */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={chatInput}
                                            onChange={e => setChatInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Guruhga yozish..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-white/20"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-blue-400 transition-colors"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-white/10 bg-white/5">
                            <p className="text-[10px] text-white/20 text-center italic">Ushbu panel faqat sizga ko'rinadi</p>
                        </div>
                    </aside>
                )}
            </div>

            {/* Enhanced Control Bar */}
            <div className="h-20 glass-premium border-t border-white/10 flex items-center justify-between px-6 z-[110]">
                {/* Left: Meeting Info */}
                <div className="flex items-center gap-3 w-1/3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
                        {getAvatarUrl(chat?.otherUser?.avatar_url || chat?.otherUser?.avatar) ? (
                            <img src={getAvatarUrl(chat?.otherUser?.avatar_url || chat?.otherUser?.avatar)!} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <Users className="w-5 h-5 text-white/40" />
                        )}
                    </div>
                    <div className="hidden md:block">
                        <p className="font-bold text-sm truncate">{chat?.name || 'Live Workspace'}</p>
                        <p className="text-xs text-white/50">{isMentor ? 'Siz Mentorsiz' : 'Talaba'}</p>
                    </div>
                </div>

                {/* Center: Main Controls */}
                <div className="flex items-center justify-center gap-4 flex-1">
                    <button
                        onClick={toggleMute}
                        title="Mic (On/Off)"
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </button>

                    <button
                        onClick={toggleVideo}
                        title="Camera (On/Off)"
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                    </button>

                    {/* Screen Share (Mostly Mentor) */}
                    {(isMentor || layer === 'general') && (
                        <button
                            title="Screen Share"
                            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                        >
                            <MonitorUp className="h-5 w-5" />
                        </button>
                    )}

                    {/* End Call (Red Button) */}
                    <button
                        onClick={() => {
                            if (!isMentor) {
                                setShowReviewModal(true);
                            } else {
                                onEndCall();
                            }
                        }}
                        title="End Session"
                        className="w-14 h-14 rounded-full bg-red-600 outline outline-4 outline-red-600/30 text-white flex items-center justify-center shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all mx-2"
                    >
                        <PhoneOff className="h-6 w-6" />
                    </button>

                    {/* Participants & Tools (Right panel toggle) */}
                    <button
                        onClick={() => { setActiveRightTab('chat'); setShowTools(true); }}
                        title="Participants & Chat"
                        className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
                    >
                        <Users className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => { setActiveRightTab('tools'); setShowTools(!showTools); }}
                        title="Specialist Tools"
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showTools ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        <Layout className="h-5 w-5" />
                    </button>
                </div>

                {/* Right: Settings & Extras */}
                <div className="flex items-center justify-end gap-3 w-1/3">
                    <button title="Settings" className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                        <Settings className="h-5 w-5" />
                    </button>
                    <button className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                        <Maximize2 className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {showReviewModal && (
                <ReviewModal
                    expertId={chat?.otherUser?.id || chat?.userId || ''}
                    expertName={chat?.otherUser?.name || 'Mutaxassis'}
                    onClose={() => {
                        setShowReviewModal(false);
                        onEndCall();
                    }}
                    onSuccess={() => {
                        setShowReviewModal(false);
                        onEndCall();
                    }}
                />
            )}
        </div >
    );
}
