"use client";

import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Trash2, Pen, ChevronUp, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';

interface LiveWhiteboardProps {
    socket: any;
    sessionId: string;
    isMentor: boolean;
    onClose?: () => void;
    isOverlay?: boolean;
    /** Chizma muallifi — talaba faqat o‘zinikini o‘chiradi */
    userId?: string;
}

interface DrawData {
    sessionId: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    color: string;
    lineWidth: number;
    authorId?: string;
}

type StrokeSeg = {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    color: string;
    lineWidth: number;
    authorId: string;
};

/** Sessiya davomida chizmalar — panel resize/remount da yo‘qolmasin (faqat tozalash o‘chiradi) */
const whiteboardStrokeCache = new Map<string, StrokeSeg[]>();

function strokesForSession(sessionId: string): StrokeSeg[] {
    const key = normRoomId(sessionId);
    let list = whiteboardStrokeCache.get(key);
    if (!list) {
        list = [];
        whiteboardStrokeCache.set(key, list);
    }
    return list;
}

function setStrokesForSession(sessionId: string, next: StrokeSeg[]) {
    whiteboardStrokeCache.set(normRoomId(sessionId), next);
}

function clearStrokesForSession(sessionId: string) {
    whiteboardStrokeCache.set(normRoomId(sessionId), []);
}

function clearAuthorStrokes(sessionId: string, authorId: string) {
    const aid = String(authorId || '');
    if (!aid) return;
    setStrokesForSession(
        sessionId,
        strokesForSession(sessionId).filter((s) => s.authorId !== aid)
    );
}

/** Doska yopiq bo‘lsa ham cache sinxron qolishi uchun (parentdan chaqiriladi) */
export function bindWhiteboardStrokeCacheSocket(socket: any, sessionId: string) {
    if (!socket || !sessionId) return () => {};

    const onDraw = (data: any) => {
        if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
        if (data?.color === 'eraser') return;
        const x0 = data.x0 ?? data.x;
        const y0 = data.y0 ?? data.y;
        const x1 = data.x1 ?? data.x;
        const y1 = data.y1 ?? data.y;
        if (x0 == null || y0 == null || x1 == null || y1 == null) return;
        strokesForSession(sessionId).push({
            x0: Number(x0),
            y0: Number(y0),
            x1: Number(x1),
            y1: Number(y1),
            color: String(data.color || '#ffffff'),
            lineWidth: Number(data.lineWidth) || 3,
            authorId: data.authorId != null ? String(data.authorId) : '',
        });
    };

    const onClear = (data: any) => {
        if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
        clearStrokesForSession(sessionId);
    };

    const onEraseNear = (data: any) => {
        if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
        const onlyAuthor =
            data?.authorId != null && String(data.authorId) !== ''
                ? String(data.authorId)
                : null;
        eraseNearPoint(
            sessionId,
            Number(data.x),
            Number(data.y),
            Number(data.radius) || ERASE_RADIUS,
            onlyAuthor
        );
    };

    const onClearAuthor = (data: any) => {
        if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
        if (!data?.authorId) return;
        clearAuthorStrokes(sessionId, String(data.authorId));
    };

    socket.on('whiteboard:draw', onDraw);
    socket.on('whiteboard:clear', onClear);
    socket.on('whiteboard:erase_near', onEraseNear);
    socket.on('whiteboard:clear_author', onClearAuthor);

    return () => {
        socket.off('whiteboard:draw', onDraw);
        socket.off('whiteboard:clear', onClear);
        socket.off('whiteboard:erase_near', onEraseNear);
        socket.off('whiteboard:clear_author', onClearAuthor);
    };
}

function normRoomId(s: string | undefined | null) {
    return String(s ?? '').trim().toLowerCase();
}

function distPointToSeg(
    px: number, py: number,
    x0: number, y0: number, x1: number, y1: number
): number {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) {
        return Math.hypot(px - x0, py - y0);
    }
    let t = ((px - x0) * dx + (py - y0) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

/** O‘chirg‘ich radius (nisbiy 0–1, doska bo‘yicha) */
const ERASE_RADIUS = 0.028;

function eraseNearPoint(
    sessionId: string,
    x: number,
    y: number,
    radius: number,
    /** null = hamma (mentor); string = faqat shu muallif (talaba) */
    onlyAuthorId: string | null
): boolean {
    const list = strokesForSession(sessionId);
    const next = list.filter((seg) => {
        if (seg.color === 'eraser') return true;
        if (onlyAuthorId != null && seg.authorId !== onlyAuthorId) return true;
        const d0 = distPointToSeg(x, y, seg.x0, seg.y0, seg.x1, seg.y1);
        return d0 > radius;
    });
    if (next.length === list.length) return false;
    setStrokesForSession(sessionId, next);
    return true;
}

function resolveLocalUserId(): string {
    const u = getUser();
    const id = u?.id != null ? String(u.id) : '';
    return id;
}

export function LiveWhiteboard({ socket, sessionId, isMentor, onClose, isOverlay = false, userId }: LiveWhiteboardProps) {
    const { showSuccess } = useNotification();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const boardSurfaceRef = useRef<HTMLDivElement>(null);
    const myUserIdRef = useRef(String(userId || resolveLocalUserId() || ''));
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(3);
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    /** Talaba ham ranglarni ko‘rsin */
    const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
    const [isPanMode, setIsPanMode] = useState(false);

    useEffect(() => {
        myUserIdRef.current = String(userId || resolveLocalUserId() || '');
    }, [userId]);

    const paintBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        if (!isOverlay) {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
        } else {
            ctx.clearRect(0, 0, width, height);
        }
    };

    const paintStroke = (
        ctx: CanvasRenderingContext2D,
        w: number,
        h: number,
        seg: StrokeSeg
    ) => {
        ctx.beginPath();
        ctx.moveTo(seg.x0 * w, seg.y0 * h);
        ctx.lineTo(seg.x1 * w, seg.y1 * h);
        if (seg.color === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 50;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = seg.color;
            ctx.lineWidth = seg.lineWidth;
        }
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.closePath();
        ctx.globalCompositeOperation = 'source-over';
    };

    const redrawAllStrokes = React.useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        if (w <= 0 || h <= 0) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        paintBackground(ctx, w, h);
        for (const seg of strokesForSession(sessionId)) {
            paintStroke(ctx, w, h, seg);
        }
    }, [sessionId, isOverlay]);

    // Doska har doim 16:9 contain — panel/mobile o‘lchamida cho‘zilmasin / qirqilmasin
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const board = boardSurfaceRef.current;
        if (!canvas || !container || !board) return;

        const BOARD_RATIO = 16 / 9;

        const layoutBoard = () => {
            const style = window.getComputedStyle(container);
            const padX =
                (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
            const padY =
                (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
            const availW = Math.max(0, container.clientWidth - padX);
            const availH = Math.max(0, container.clientHeight - padY);
            if (availW <= 0 || availH <= 0) return;

            let boardW = availW;
            let boardH = boardW / BOARD_RATIO;
            if (boardH > availH) {
                boardH = availH;
                boardW = boardH * BOARD_RATIO;
            }
            boardW = Math.max(1, Math.floor(boardW));
            boardH = Math.max(1, Math.floor(boardH));

            board.style.width = `${boardW}px`;
            board.style.height = `${boardH}px`;

            const dpr = window.devicePixelRatio || 1;
            const nextW = Math.round(boardW * dpr);
            const nextH = Math.round(boardH * dpr);
            if (canvas.width === nextW && canvas.height === nextH && nextW > 0) {
                return;
            }

            canvas.width = nextW;
            canvas.height = nextH;
            canvas.style.width = `${boardW}px`;
            canvas.style.height = `${boardH}px`;
            redrawAllStrokes();
        };

        const resizeObserver = new ResizeObserver(() => {
            window.requestAnimationFrame(layoutBoard);
        });

        resizeObserver.observe(container);
        layoutBoard();

        return () => resizeObserver.disconnect();
    }, [redrawAllStrokes]);

    const drawLine = React.useCallback((
        ctx: CanvasRenderingContext2D,
        x0Rel: number, y0Rel: number, x1Rel: number, y1Rel: number,
        strokeColor: string, width: number,
        emit: boolean,
        record = true,
        authorId?: string
    ) => {
        if (!canvasRef.current) return;
        // Eraser alohida — destination-out ishlatilmaydi (boshqalar chizmasi saqlansin)
        if (strokeColor === 'eraser') return;

        const dpr = window.devicePixelRatio || 1;
        const w = canvasRef.current.width / dpr;
        const h = canvasRef.current.height / dpr;
        const aid = String(authorId || myUserIdRef.current || '');

        const seg: StrokeSeg = {
            x0: x0Rel,
            y0: y0Rel,
            x1: x1Rel,
            y1: y1Rel,
            color: strokeColor,
            lineWidth: width,
            authorId: aid,
        };
        if (record) {
            strokesForSession(sessionId).push(seg);
        }
        paintStroke(ctx, w, h, seg);

        if (!emit || !socket) return;

        socket.emit('whiteboard:draw', {
            sessionId,
            x0: x0Rel, y0: y0Rel, x1: x1Rel, y1: y1Rel,
            color: strokeColor,
            lineWidth: width,
            authorId: aid,
        });
    }, [socket, sessionId]);

    const applyEraseNear = React.useCallback((
        x: number,
        y: number,
        emit: boolean,
        onlyAuthorId: string | null
    ) => {
        const changed = eraseNearPoint(sessionId, x, y, ERASE_RADIUS, onlyAuthorId);
        if (!changed) return;
        redrawAllStrokes();
        if (emit && socket) {
            socket.emit('whiteboard:erase_near', {
                sessionId,
                x,
                y,
                radius: ERASE_RADIUS,
                authorId: onlyAuthorId,
            });
        }
    }, [sessionId, socket, redrawAllStrokes]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleDraw = (data: DrawData | any) => {
            if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
            if (!canvasRef.current) return;
            if (data?.color === 'eraser') return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            const x0 = data.x0 ?? data.x;
            const y0 = data.y0 ?? data.y;
            const x1 = data.x1 ?? data.x;
            const y1 = data.y1 ?? data.y;

            drawLine(
                ctx, x0, y0, x1, y1,
                data.color, data.lineWidth || 3,
                false, true,
                data.authorId != null ? String(data.authorId) : ''
            );
        };

        const handleClearRemote = (data: any) => {
            if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
            clearStrokesForSession(sessionId);
            redrawAllStrokes();
        };

        const handleEraseNear = (data: any) => {
            if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
            const onlyAuthor =
                data?.authorId != null && String(data.authorId) !== ''
                    ? String(data.authorId)
                    : null;
            eraseNearPoint(
                sessionId,
                Number(data.x),
                Number(data.y),
                Number(data.radius) || ERASE_RADIUS,
                onlyAuthor
            );
            redrawAllStrokes();
        };

        const handleClearAuthor = (data: any) => {
            if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
            if (!data?.authorId) return;
            clearAuthorStrokes(sessionId, String(data.authorId));
            redrawAllStrokes();
        };

        socket.on('whiteboard:draw', handleDraw);
        socket.on('whiteboard:clear', handleClearRemote);
        socket.on('whiteboard:erase_near', handleEraseNear);
        socket.on('whiteboard:clear_author', handleClearAuthor);

        return () => {
            socket.off('whiteboard:draw', handleDraw);
            socket.off('whiteboard:clear', handleClearRemote);
            socket.off('whiteboard:erase_near', handleEraseNear);
            socket.off('whiteboard:clear_author', handleClearAuthor);
        };
    }, [socket, sessionId, drawLine, redrawAllStrokes]);

    /** Koordinatalar CSS pixels — ctx.scale(dpr,dpr) dan keyin to'g'ri chiziladi */
    const getMousePos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();

        let clientX: number;
        let clientY: number;
        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('changedTouches' in e && (e as TouchEvent).changedTouches?.length) {
            clientX = (e as TouchEvent).changedTouches[0].clientX;
            clientY = (e as TouchEvent).changedTouches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return {
            x: (clientX - rect.left) / rect.width,
            y: (clientY - rect.top) / rect.height,
        };
    };

    const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        if (isPanMode) {
            setIsPanning(true);
            setLastPanPos({ x: clientX, y: clientY });
            return;
        }

        const pos = getMousePos(e);
        setCurrentPos(pos);
        setIsDrawing(true);
        if (color === 'eraser') {
            const onlyMine = isMentor ? null : (myUserIdRef.current || '__none__');
            applyEraseNear(pos.x, pos.y, true, onlyMine);
        }
    };

    const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? (e.touches[0] || e.changedTouches[0]).clientX : e.clientX;
        const clientY = 'touches' in e ? (e.touches[0] || e.changedTouches[0]).clientY : e.clientY;

        if (isPanning) {
            const dx = clientX - lastPanPos.x;
            const dy = clientY - lastPanPos.y;
            setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
            setLastPanPos({ x: clientX, y: clientY });
            return;
        }

        if (!isDrawing || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const newPos = getMousePos(e);

        if (color === 'eraser') {
            // Talaba: faqat o‘z chizmasi; mentor: hammasi
            const onlyMine = isMentor ? null : (myUserIdRef.current || '__none__');
            applyEraseNear(newPos.x, newPos.y, true, onlyMine);
            setCurrentPos(newPos);
            return;
        }

        drawLine(ctx, currentPos.x, currentPos.y, newPos.x, newPos.y, color, lineWidth, true);
        setCurrentPos(newPos);
    };

    const onMouseUp = () => {
        setIsDrawing(false);
        setIsPanning(false);
    };

    const handleZoom = (delta: number) => {
        setScale(prev => {
            const next = Math.max(1, Math.min(prev + delta, 5));
            if (next === 1) setPanOffset({ x: 0, y: 0 });
            return next;
        });
    };

    const handleClear = () => {
        if (!isMentor) return;
        clearStrokesForSession(sessionId);
        redrawAllStrokes();
        if (socket) {
            socket.emit('whiteboard:clear', { sessionId });
        }
    };

    const handleClearMyStrokes = () => {
        const aid = myUserIdRef.current;
        if (!aid) return;
        clearAuthorStrokes(sessionId, aid);
        redrawAllStrokes();
        if (socket) {
            socket.emit('whiteboard:clear_author', { sessionId, authorId: aid });
        }
    };

    return (
        <div className={`group/board flex flex-col w-full h-full min-h-0 min-w-0 ${isOverlay ? 'bg-transparent' : 'bg-[#0f172a]'} rounded-[2rem] overflow-hidden ${!isOverlay && 'border border-white/5'} relative shadow-2xl`}>

            {/* Floating Toolbar - Collapsible Drawer */}
            <div className={`absolute bottom-4 left-4 z-[80] flex items-center gap-1.5 p-2 rounded-2xl border shadow-[0_16px_64px_rgba(0,0,0,0.55)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isMentor ? 'bg-black/90 border-white/20 ring-1 ring-white/10 backdrop-blur-3xl' : 'bg-[#1e2640] border-white/30 ring-1 ring-white/20'} ${isToolbarExpanded ? 'w-auto max-w-[calc(100vw-3rem)] opacity-100' : 'w-[52px] overflow-hidden opacity-100'}`}>
                
                {/* Toggle Trigger */}
                <button
                    onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
                    className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 ${isToolbarExpanded ? 'bg-white/20 text-white rotate-180' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    title={isToolbarExpanded ? "Yopish" : "Asboblarni ko'rsatish"}
                >
                    <ChevronUp className={`w-5 h-5 transition-transform duration-500 ${isToolbarExpanded ? 'rotate-0' : 'rotate-0'}`} />
                </button>

                <div className={`flex items-center gap-1.5 transition-all duration-500 ${isToolbarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                    <div className="flex items-center gap-1 px-2 border-r border-white/20 mr-1">
                        <Pen className={`w-3.5 h-3.5 ${isMentor ? 'text-white/40' : 'text-white/80'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isMentor ? 'text-white/40' : 'text-white/85'}`}>Doska</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {[
                            { color: '#ffffff', label: 'Oq' },
                            { color: '#3b82f6', label: 'Ko\'k' },
                            { color: '#ef4444', label: 'Qizil' },
                            { color: '#22c55e', label: 'Yashil' },
                            { color: '#eab308', label: 'Sariq' },
                            { color: '#a855f7', label: 'Binafsha' }
                        ].map((c) => (
                            <button
                                key={c.color}
                                onClick={() => { setColor(c.color); setLineWidth(3); }}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${color === c.color ? 'bg-white/25 ring-2 ring-white/60 scale-110 shadow-lg' : 'bg-white/10 hover:bg-white/20 hover:scale-105'}`}
                                title={c.label}
                            >
                                <div className="w-4 h-4 rounded-full shadow-md" style={{ backgroundColor: c.color, border: '1px solid rgba(255,255,255,0.35)' }}></div>
                            </button>
                        ))}

                        <div className="w-px h-6 bg-white/20 mx-1"></div>

                        <button
                            onClick={() => { setColor('eraser'); }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${color === 'eraser' ? 'bg-white/25 text-white ring-2 ring-white/50 shadow-lg' : 'bg-white/10 text-white/90 hover:bg-white/20 hover:text-white'}`}
                            title={isMentor ? "O'chirg'ich (hamma)" : "O'chirg'ich (faqat o'zingizniki)"}
                        >
                            <Eraser className="w-4.5 h-4.5" />
                        </button>

                        {isMentor ? (
                            <button
                                onClick={handleClear}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                                title="Butun doskani tozalash"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleClearMyStrokes}
                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                                title="Faqat o'z chizmalarimni tozalash"
                            >
                                <Trash2 className="w-4.5 h-4.5" />
                            </button>
                        )}

                        {isMentor && (
                            <>
                                <div className="w-px h-6 bg-white/10 mx-1"></div>
                                <button
                                    onClick={async () => {
                                        if (!canvasRef.current) return;
                                        const dataUrl = canvasRef.current.toDataURL('image/png');
                                        try {
                                            await apiFetch('/api/specialists/whiteboard/snapshot', {
                                                method: 'POST',
                                                body: JSON.stringify({
                                                    session_id: sessionId,
                                                    snapshot_data: dataUrl,
                                                    chat_id: sessionId
                                                })
                                            });
                                            showSuccess("Saqlandi!");
                                        } catch (e) {
                                            console.error("Snapshot save error:", e);
                                        }
                                    }}
                                    className="px-3 h-8 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-200 hover:text-white border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg"
                                >
                                    Saqlash
                                </button>
                            </>
                        )}

                        <div className="w-px h-6 bg-white/10 mx-1"></div>
                                                <button
                            onClick={() => {
                                if (!canvasRef.current) return;
                                const imgData = canvasRef.current.toDataURL('image/png');
                                import('jspdf').then(({jsPDF}) => {
                                    const pdf = new jsPDF('l', 'px', [canvasRef.current!.width, canvasRef.current!.height]);
                                    pdf.addImage(imgData, 'PNG', 0, 0, canvasRef.current!.width, canvasRef.current!.height);
                                    pdf.save(`whiteboard-${sessionId}.pdf`);
                                });
                            }}
                            className="px-3 h-8 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-sky-500/20"
                        >
                            PDF
                        </button>

                        <div className="w-px h-6 bg-white/20 mx-1"></div>

                        <div className="flex items-center gap-1 bg-white/15 rounded-xl p-1">
                            <button
                                onClick={() => handleZoom(-0.5)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-white hover:text-white transition-all"
                                title="Kichraytirish"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-bold text-white/80 w-8 text-center">{Math.round(scale * 100)}%</span>
                            <button
                                onClick={() => handleZoom(0.5)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/20 text-white hover:text-white transition-all"
                                title="Kattalashtirish"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsPanMode(!isPanMode)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isPanMode ? 'bg-amber-500/30 text-amber-300 ring-2 ring-amber-400/50' : 'bg-white/10 text-white/90 hover:bg-white/20 hover:text-white'}`}
                            title="Pan (Sujish)"
                        >
                            <Move className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Close Button Overlay */}
            {onClose && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                    }}
                    className="absolute top-4 right-4 z-[70] w-10 h-10 flex items-center justify-center rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg border border-red-500/20 active:scale-95"
                    title="Doskani yopish"
                >
                    <X className="w-5 h-5" />
                </button>
            )}

            {/* Canvas Area — mavjud joyga 16:9 contain */}
            <div ref={containerRef} className="flex-1 w-full h-full min-h-0 relative cursor-crosshair touch-none bg-[#03040a] overflow-hidden flex items-center justify-center p-1 sm:p-4">
                
                {/* Mobile Orientation Suggestion */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none md:hidden block z-50">
                     <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <p className="text-[9px] text-white/50 font-bold uppercase tracking-[0.15em] whitespace-nowrap">
                           📱 Albom (landscape) rejim tavsiya etiladi
                        </p>
                     </div>
                </div>

                <div 
                    ref={boardSurfaceRef}
                    className="relative shadow-2xl transition-transform duration-75 ease-out bg-[#0f172a] border border-white/5 overflow-hidden rounded-lg sm:rounded-xl shrink-0"
                    style={{ 
                        transform: `scale(${scale}) translate(${panOffset.x / scale}px, ${panOffset.y / scale}px)`,
                        transformOrigin: 'center center'
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        onTouchStart={onMouseDown}
                        onTouchMove={onMouseMove}
                        onTouchEnd={onMouseUp}
                        className="block touch-none shadow-inner bg-[radial-gradient(#1a1d2e_1px,transparent_1px)] [background-size:24px_24px]"
                        style={{ cursor: isPanMode ? 'grab' : 'crosshair' }}
                    />
                </div>
            </div>


        </div>
    );
}


