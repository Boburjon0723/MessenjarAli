"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
    useTracks,
    ParticipantTile,
    ControlBar,
    useRemoteParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { VideoIcon, Users, ChevronLeft, ChevronRight, EyeOff, Video } from 'lucide-react';
import { LiveWhiteboard, bindWhiteboardStrokeCacheSocket } from './LiveWhiteboard';

interface LiveVideoFrameProps {
    isMentor?: boolean;
    /** false bo'lsa qo'l ko'tarish videolari qatorlari ko'rinmaydi (huquq/psix/konsultant). Default: true — jonli dars. */
    showClassroomLayout?: boolean;
    /**
     * Huquqshunos (legal) rejimi uchun: markaziy kadrni mijozga, pastdagi kichik oynalarda esa ekspertni ko'rsatish.
     * Odatda showClassroomLayout=false bo'lganda ishlatiladi.
     */
    swapMainWithClient?: boolean;
    isWhiteboardOpen?: boolean;
    socket?: any;
    sessionId?: string;
    onCloseWhiteboard?: () => void;
    immersive?: boolean;
    /** Doska chizma muallifi (talaba o‘z chizmasini o‘chirish) */
    userId?: string;
    /** Qo'l ko'targan talabalar — mentor rejimida pastki qatorda birinchi o‘rinlarga chiqadi */
    handsRaised?: Record<string, string>;
    /** false bo‘lsa o‘ngdagi materiallar paneli yopilgan — talabalar qatori kengayadi va 2 ustun */
    mentorMaterialsPanelOpen?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const getAvatarUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

function getLiveKitRoleFromParticipant(participant: { metadata?: string } | undefined): 'mentor' | 'student' | null {
    if (!participant?.metadata) return null;
    try {
        const meta = JSON.parse(participant.metadata) as { lkRole?: string };
        if (meta.lkRole === 'mentor') return 'mentor';
        if (meta.lkRole === 'student') return 'student';
    } catch {
        /* ignore */
    }
    return null;
}

/** Video pastidagi yorliq: profil ismi (UUID emas) */
function getParticipantLabel(
    participant: { name?: string; identity?: string; metadata?: string; isLocal?: boolean } | undefined,
    fallback: string
): string {
    if (!participant) return fallback;
    const fromName = String(participant.name || '').trim();
    if (fromName && !/^[0-9a-f-]{36}$/i.test(fromName)) return fromName;
    if (participant.metadata) {
        try {
            const meta = JSON.parse(participant.metadata) as { displayName?: string };
            const dn = String(meta.displayName || '').trim();
            if (dn) return dn;
        } catch {
            /* ignore */
        }
    }
    const id = String(participant.identity || '').trim();
    if (id && /^[0-9a-f-]{36}$/i.test(id)) {
        return fallback;
    }
    return id || fallback;
}

export function LiveVideoFrame({
    isMentor = false,
    showClassroomLayout = true,
    swapMainWithClient = false,
    isWhiteboardOpen = false,
    socket,
    sessionId,
    onCloseWhiteboard,
    immersive = false,
    handsRaised = {},
    mentorMaterialsPanelOpen = true,
    userId,
}: LiveVideoFrameProps) {
    const remoteParticipants = useRemoteParticipants();
    const mentorRemoteParticipant = !isMentor
        ? remoteParticipants.find((p) => getLiveKitRoleFromParticipant(p) === 'mentor')
        : null;

    const tracks = useTracks(
        [
            { source: Track.Source.Camera, withPlaceholder: true },
            { source: Track.Source.ScreenShare, withPlaceholder: false },
        ],
        { onlySubscribed: false },
    );

    const localVideoTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);
    const remoteVideoTracks = tracks.filter(t => !t.participant.isLocal && t.source === Track.Source.Camera);

    const sortedRemoteForMentor =
        isMentor && showClassroomLayout
            ? [...remoteVideoTracks].sort((a, b) => {
                  const order = Object.keys(handsRaised);
                  const ia = order.indexOf(a.participant.identity);
                  const ib = order.indexOf(b.participant.identity);
                  const sa = ia === -1 ? 9999 : ia;
                  const sb = ib === -1 ? 9999 : ib;
                  if (sa !== sb) return sa - sb;
                  return 0;
              })
            : remoteVideoTracks;

    const mentorCameraRemote = remoteVideoTracks.find(
        (t) => getLiveKitRoleFromParticipant(t.participant) === 'mentor'
    );

    // Main: mentorda — o‘zi; talabada — faqat ustoz kamerasi (birinchi talaba kadrga tushmasin)
    const baseMainTrack = isMentor ? localVideoTrack : mentorCameraRemote ?? null;

    // Mentorda — barcha uzoq talabalar;
    // talabada:
    //  - dars rejimida kichik oyna (o'zi) ko'rsatiladi
    //  - huquq/psixologiya/konsultatsiyada dublikat chiqmasligi uchun pastki oyna berkitiladi
    const baseGridTracks = isMentor
        ? sortedRemoteForMentor
        : [localVideoTrack].filter(Boolean);

    const mainIsClient = Boolean(swapMainWithClient && isMentor);

    // Huquqshunos/consultant: markazda mijoz, pastda esa ekspert (lokal) bo'lsin
    const mainTrack = mainIsClient ? (sortedRemoteForMentor[0] ?? remoteVideoTracks[0] ?? null) : baseMainTrack;
    const gridTracks = mainIsClient
        ? [localVideoTrack].filter(Boolean)
        : baseGridTracks;

    const screenShareTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
    const shareOrBoardActive = Boolean(isWhiteboardOpen || screenShareTrack);
    /** Screen share / doska rejimida talabalar paneli (2 ustun) */
    const [showShareStudents, setShowShareStudents] = useState(false);
    /** PiP (o‘z/ekspert video) — sudraladigan + yashirish */
    const [pipHidden, setPipHidden] = useState(false);
    const [pipPos, setPipPos] = useState<{ x: number; y: number } | null>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const pipRef = useRef<HTMLDivElement>(null);
    const pipDragRef = useRef<{
        active: boolean;
        startX: number;
        startY: number;
        origX: number;
        origY: number;
        moved: boolean;
    } | null>(null);

    useEffect(() => {
        if (!shareOrBoardActive) {
            setShowShareStudents(false);
            setPipHidden(false);
            setPipPos(null);
        }
    }, [shareOrBoardActive]);

    /** Doska yopiq bo‘lsa ham chizma cache sinxron (qayta ochganda eski chizma qaytmasin) */
    useEffect(() => {
        if (!socket || !sessionId || isWhiteboardOpen) return;
        return bindWhiteboardStrokeCacheSocket(socket, sessionId);
    }, [socket, sessionId, isWhiteboardOpen]);

    const clampPipPos = (x: number, y: number) => {
        const stage = stageRef.current;
        const pip = pipRef.current;
        if (!stage || !pip) return { x, y };
        const maxX = Math.max(0, stage.clientWidth - pip.offsetWidth);
        const maxY = Math.max(0, stage.clientHeight - pip.offsetHeight);
        return {
            x: Math.min(Math.max(0, x), maxX),
            y: Math.min(Math.max(0, y), maxY),
        };
    };

    const onPipPointerDown = (e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('[data-pip-action]')) return;
        if (!stageRef.current || !pipRef.current) return;
        e.preventDefault();
        e.stopPropagation();
        const stageRect = stageRef.current.getBoundingClientRect();
        const pipRect = pipRef.current.getBoundingClientRect();
        const curX = pipPos?.x ?? pipRect.left - stageRect.left;
        const curY = pipPos?.y ?? pipRect.top - stageRect.top;
        pipDragRef.current = {
            active: true,
            startX: e.clientX,
            startY: e.clientY,
            origX: curX,
            origY: curY,
            moved: false,
        };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPipPointerMove = (e: React.PointerEvent) => {
        const drag = pipDragRef.current;
        if (!drag?.active) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
        setPipPos(clampPipPos(drag.origX + dx, drag.origY + dy));
    };

    const onPipPointerUp = (e: React.PointerEvent) => {
        const drag = pipDragRef.current;
        if (!drag?.active) return;
        pipDragRef.current = null;
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
            /* ignore */
        }
    };

    const participantThumb = (track: (typeof gridTracks)[number], i: number) => {
        const hid = track?.participant?.identity;
        const handUp = hid && handsRaised[hid];
        const isLocal = !!track?.participant?.isLocal;
        const thumbLabel = isLocal
            ? mainIsClient
                ? 'Ekspert'
                : 'Siz'
            : getParticipantLabel(track?.participant, `Talaba ${i + 1}`);
        return (
            <div
                key={hid || i}
                className={`w-full aspect-video rounded-xl overflow-hidden relative bg-slate-800 shrink-0 shadow-lg ${handUp ? 'ring-2 ring-amber-500/60' : 'ring-1 ring-white/10'}`}
            >
                {track ? <ParticipantTile trackRef={track} className="w-full h-full [&>video]:object-cover" /> : null}
                <div className="absolute bottom-2 left-2 right-2 max-w-[calc(100%-1rem)] truncate text-[10px] font-bold text-white bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm border border-white/10">
                    {handUp ? `✋ ${typeof handUp === 'string' && handUp !== '1' ? handUp : thumbLabel}` : thumbLabel}
                </div>
            </div>
        );
    };

    return (
        <div className={`flex flex-col w-full h-full relative ${immersive ? 'bg-black' : 'bg-[#0f172a]'} overflow-hidden`}>

            {(isWhiteboardOpen || screenShareTrack) ? (
                // --- SCREEN SHARE / WHITEBOARD: asosiy kontent + strelka bilan talabalar (2 ustun) ---
                <div className="flex-1 relative overflow-hidden w-full h-full min-h-0 bg-black flex flex-row">
                    <div ref={stageRef} className="flex-1 relative min-w-0 min-h-0 overflow-hidden">
                        <div className="absolute inset-0 z-0 flex items-center justify-center p-0">
                            {screenShareTrack && (
                                <div className="w-full h-full">
                                    <ParticipantTile trackRef={screenShareTrack!} className="w-full h-full object-contain [&>video]:object-contain" />
                                </div>
                            )}
                            {isWhiteboardOpen && socket && sessionId && (
                                <LiveWhiteboard
                                    socket={socket}
                                    sessionId={sessionId}
                                    isMentor={isMentor}
                                    onClose={onCloseWhiteboard}
                                    isOverlay={!!screenShareTrack}
                                    userId={userId}
                                />
                            )}
                        </div>

                        {/* Floating self/expert PiP — sudraladi, yashirish mumkin */}
                        {mainTrack && !pipHidden && (
                            <div
                                ref={pipRef}
                                onPointerDown={onPipPointerDown}
                                onPointerMove={onPipPointerMove}
                                onPointerUp={onPipPointerUp}
                                onPointerCancel={onPipPointerUp}
                                className="absolute z-40 w-36 sm:w-52 aspect-video rounded-2xl overflow-hidden bg-black/40 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group ring-1 ring-white/10 touch-none select-none cursor-grab active:cursor-grabbing"
                                style={
                                    pipPos
                                        ? { left: pipPos.x, top: pipPos.y }
                                        : { left: 16, bottom: 16 }
                                }
                                title="Sudrab joyini o‘zgartiring"
                            >
                                <ParticipantTile trackRef={mainTrack} className="w-full h-full pointer-events-none [&>video]:object-cover" />
                                <div className="absolute bottom-2 left-2 text-[9px] font-black text-white bg-black/60 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest pointer-events-none">
                                    {mainIsClient ? 'Mijoz' : isMentor ? 'Siz' : 'Ekspert'}
                                </div>
                                <div className="absolute top-1.5 right-1.5 flex items-center gap-1.5 z-10">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] pointer-events-none" />
                                    <button
                                        type="button"
                                        data-pip-action
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPipHidden(true);
                                        }}
                                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-white/80 border border-white/15 hover:bg-red-500/80 hover:text-white transition-colors"
                                        title="Videoni yashirish"
                                        aria-label="Videoni yashirish"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {mainTrack && pipHidden && (
                            <button
                                type="button"
                                onClick={() => setPipHidden(false)}
                                className="absolute bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border border-white/15 bg-black/75 px-3 py-2 text-[11px] font-bold text-white/90 shadow-lg backdrop-blur-md hover:bg-[#8774e1]/90 hover:text-white transition-colors"
                                title="Videoni ko‘rsatish"
                            >
                                <Video className="w-3.5 h-3.5" />
                                Video
                            </button>
                        )}

                        {/* Strelka: talabalar videosini ochish / yopish */}
                        {isMentor && showClassroomLayout && (
                            <button
                                type="button"
                                onClick={() => setShowShareStudents((v) => !v)}
                                className="absolute right-0 top-1/2 z-50 -translate-y-1/2 flex h-11 w-7 items-center justify-center rounded-l-xl border border-white/15 bg-[#161927]/95 text-white/80 shadow-lg backdrop-blur-md transition-colors hover:bg-[#8774e1]/90 hover:text-white"
                                title={showShareStudents ? 'Talabalarni yashirish' : 'Talabalarni ko‘rsatish'}
                                aria-label={showShareStudents ? 'Talabalarni yashirish' : 'Talabalarni ko‘rsatish'}
                            >
                                {showShareStudents ? (
                                    <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                                ) : (
                                    <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
                                )}
                            </button>
                        )}
                    </div>

                    {isMentor && showClassroomLayout && showShareStudents && (
                        <div className="shrink-0 h-full w-[min(31rem,calc(100vw-12rem))] sm:w-[min(31rem,48%)] md:w-[31rem] bg-[#11131a] border-l border-white/10 flex flex-col min-h-0 overflow-hidden z-30 animate-in slide-in-from-right duration-200">
                            <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2 shrink-0">
                                <span className="text-[10px] font-black text-white/45 uppercase tracking-widest">
                                    Talabalar
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setShowShareStudents(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
                                    aria-label="Yopish"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 pb-3 grid grid-cols-2 auto-rows-min content-start gap-2.5">
                                {gridTracks.length === 0 ? (
                                    <div className="col-span-2 rounded-xl bg-slate-800/30 border border-white/5 flex flex-col items-center justify-center gap-2 py-8 px-2">
                                        <Users className="w-5 h-5 text-slate-500" />
                                        <span className="text-[10px] text-slate-500 font-semibold text-center uppercase tracking-wider leading-snug">
                                            Kutilmoqda — ulanish yoki kamera yoqilganda shu yerga chiqadi
                                        </span>
                                    </div>
                                ) : (
                                    gridTracks.map((track, i) => participantThumb(track, i))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : immersive ? (
                // --- IMMERSIVE THEATRE MODE ---
                <div className="flex-1 relative w-full h-full overflow-hidden bg-black">
                    {/* Main Background Video (Mentor) */}
                    <div className="absolute inset-0 z-0">
                        {mainTrack ? (
                            <ParticipantTile trackRef={mainTrack} className="w-full h-full [&>video]:object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#0a0b10]">
                                {(() => {
                                    const participant = isMentor
                                        ? tracks.find((t) => t.participant.isLocal)?.participant
                                        : mentorRemoteParticipant ?? undefined;
                                    let avatar = null;
                                    if (participant?.metadata) {
                                        try {
                                            const meta = JSON.parse(participant.metadata);
                                            avatar = meta.avatar_url || meta.avatar;
                                        } catch (e) { /* ignore */ }
                                    }
                                    return (
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl">
                                            {avatar ? (
                                                <img src={getAvatarUrl(avatar)!} className="w-full h-full object-cover" alt="Avatar" />
                                            ) : (
                                                <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20">
                                                    <VideoIcon className="w-12 h-12" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                <p className="text-white/40 font-bold text-sm tracking-widest uppercase">
                                    {isMentor ? "Kamerangiz o'chirilgan" : "Ustoz ulanishi kutilmoqda..."}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Floating PiP Window (Self/Others) */}
                    <div className="absolute bottom-24 right-8 z-10 flex flex-col gap-4 items-end">
                        {gridTracks.slice(0, 3).map((track, i) => (
                            <div key={track?.participant?.identity || i} className="w-48 aspect-video rounded-2xl overflow-hidden relative bg-black/40 backdrop-blur-xl border border-white/20 shadow-2xl transition-all hover:scale-105 group">
                                {track ? <ParticipantTile trackRef={track} className="w-full h-full [&>video]:object-cover" /> : null}
                                <div className="absolute bottom-2 left-2 text-[9px] font-black text-white bg-black/60 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity uppercase truncate max-w-[90%]">
                                    {track?.participant?.isLocal
                                        ? 'Siz'
                                        : getParticipantLabel(track?.participant, `Talaba ${i + 1}`)}
                                </div>
                                {track?.participant?.isLocal && (
                                    <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ) : isMentor && showClassroomLayout ? (
                    // --- MENTOR: asosiy kadr + o‘ngda talabalar; materiallar yopilsa keng strip + 2 ustun ---
                    <div className="flex-1 flex flex-row min-h-0 overflow-hidden w-full">
                        <div className="flex-1 relative overflow-hidden bg-slate-900 group min-h-0 min-w-0">
                            {mainTrack ? (
                                <ParticipantTile trackRef={mainTrack} className="w-full h-full [&>video]:object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#1a1d2e]">
                                    {(() => {
                                        const participant = tracks.find(t => t.participant.isLocal)?.participant;
                                        let avatar = null;
                                        if (participant?.metadata) {
                                            try {
                                                const meta = JSON.parse(participant.metadata);
                                                avatar = meta.avatar_url || meta.avatar;
                                            } catch {
                                                /* ignore */
                                            }
                                        }
                                        return (
                                            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-slate-700/50 shadow-xl">
                                                {avatar ? (
                                                    <img src={getAvatarUrl(avatar)!} className="w-full h-full object-cover" alt="Avatar" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                                                        <VideoIcon className="w-10 h-10 opacity-50" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                    <p className="text-slate-500 font-bold text-sm">Kamerangiz o‘chirilgan</p>
                                </div>
                            )}
                        </div>

                        <div
                            className={`shrink-0 h-full bg-[#11131a] border-l border-white/5 flex flex-col min-h-0 overflow-hidden ${
                                mentorMaterialsPanelOpen
                                    ? 'w-[200px] sm:w-60'
                                    : 'w-[min(31rem,calc(100vw-14rem))] sm:w-[min(31rem,55%)] md:w-[31rem]'
                            }`}
                        >
                            <div className="text-[10px] font-black text-white/45 uppercase tracking-widest px-3 pt-3 pb-2 shrink-0">
                                Talabalar
                            </div>
                            <div
                                className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 pb-3 gap-2.5 ${
                                    mentorMaterialsPanelOpen ? 'flex flex-col' : 'grid grid-cols-2 auto-rows-min content-start'
                                }`}
                            >
                                {gridTracks.length === 0 ? (
                                    <div
                                        className={`rounded-xl bg-slate-800/30 border border-white/5 flex flex-col items-center justify-center gap-2 py-8 px-2 ${
                                            mentorMaterialsPanelOpen ? '' : 'col-span-2'
                                        }`}
                                    >
                                        <Users className="w-5 h-5 text-slate-500" />
                                        <span className="text-[10px] text-slate-500 font-semibold text-center uppercase tracking-wider leading-snug">
                                            Kutilmoqda — ulanish yoki kamera yoqilganda shu yerga chiqadi
                                        </span>
                                    </div>
                                ) : (
                                    gridTracks.map((track, i) => participantThumb(track, i))
                                )}
                            </div>
                        </div>
                    </div>
            ) : mainIsClient ? (
                // --- LEGAL/CONSULT: two equal tiles (client + expert), no duplicates ---
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-[#0d0f1a] min-h-0">
                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-white/10 min-h-[220px]">
                        {mainTrack ? (
                            <ParticipantTile trackRef={mainTrack} className="w-full h-full [&>video]:object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-semibold">
                                Mijoz ulanmoqda...
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 rounded-lg border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                            Mijoz
                        </div>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden bg-slate-900 ring-1 ring-white/10 min-h-[220px]">
                        {localVideoTrack ? (
                            <ParticipantTile trackRef={localVideoTrack} className="w-full h-full [&>video]:object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm font-semibold">
                                Ekspert kamerasi o‘chiq
                            </div>
                        )}
                        <div className="absolute bottom-2 left-2 rounded-lg border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                            Ekspert
                        </div>
                    </div>
                </div>
            ) : (
                // --- CLASSIC GRID (talaba yoki mentor konsultatsiya) ---
                <>
                    <div className="flex-1 relative overflow-hidden bg-slate-900 group min-h-0">
                        {mainTrack ? (
                            <ParticipantTile trackRef={mainTrack} className="w-full h-full [&>video]:object-cover" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[#1a1d2e]">
                                {(() => {
                                    const participant = isMentor
                                        ? tracks.find((t) => t.participant.isLocal)?.participant
                                        : mentorRemoteParticipant ?? undefined;
                                    let avatar = null;
                                    if (participant?.metadata) {
                                        try {
                                            const meta = JSON.parse(participant.metadata);
                                            avatar = meta.avatar_url || meta.avatar;
                                        } catch {
                                            /* ignore */
                                        }
                                    }
                                    return (
                                        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-slate-700/50 shadow-xl">
                                            {avatar ? (
                                                <img src={getAvatarUrl(avatar)!} className="w-full h-full object-cover" alt="Avatar" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                                                    <VideoIcon className="w-10 h-10 opacity-50" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                                <p className="text-slate-500 font-bold text-sm">
                                    {isMentor ? "Kamerangiz o'chirilgan" : "Ustoz ulanishi kutilmoqda / Kamera o'chiq"}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="h-[178px] shrink-0 flex bg-[#0d0f1a] p-3 gap-3 overflow-x-auto custom-scrollbar border-t border-white/5">
                        {gridTracks.length === 0 ? (
                            <div className="h-full px-8 rounded-xl bg-slate-800/30 border border-white/5 flex flex-col items-center justify-center gap-2">
                                <Users className="w-5 h-5 text-slate-500" />
                                <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Talabalar kutilmoqda</span>
                            </div>
                        ) : (
                            gridTracks.map((track, i) => {
                                const hid = track?.participant?.identity;
                                const handUp = hid && handsRaised[hid];
                                const label = getParticipantLabel(track?.participant, `Talaba ${i + 1}`);
                                return (
                                    <div
                                        key={hid || i}
                                        className={`h-full aspect-video rounded-xl overflow-hidden relative bg-slate-800 shrink-0 shadow-lg ${handUp ? 'ring-2 ring-amber-500/60' : 'ring-1 ring-white/10'}`}
                                    >
                                        {track ? <ParticipantTile trackRef={track} className="w-full h-full [&>video]:object-cover" /> : null}
                                        <div className="absolute bottom-2 left-2 right-2 max-w-[calc(100%-1rem)] truncate text-[10px] font-bold text-white bg-black/70 px-2.5 py-1 rounded-lg backdrop-blur-md shadow-sm border border-white/10">
                                            {handUp
                                                ? `✋ ${typeof handUp === 'string' && handUp.length > 1 && !/^[0-9a-f-]{36}$/i.test(handUp) ? handUp : label}`
                                                : label}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}

            {/* Floating Control Bar for generic controls if needed */}
            {!isMentor && !screenShareTrack && !immersive && (
                <div className="absolute top-4 left-4 z-[100] px-4 py-2 bg-black/50 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                    <ControlBar variation="minimal" />
                </div>
            )}
        </div>
    );
}


