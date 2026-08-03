"use client";

import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Trash2, Pen, ChevronUp, ChevronRight, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { apiFetch } from '@/lib/api';

interface LiveWhiteboardProps {
    socket: any;
    sessionId: string;
    isMentor: boolean;
    onClose?: () => void;
    isOverlay?: boolean;
}

interface DrawData {
    sessionId: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    color: string;
    lineWidth: number;
}

function normRoomId(s: string | undefined | null) {
    return String(s ?? '').trim().toLowerCase();
}

export function LiveWhiteboard({ socket, sessionId, isMentor, onClose, isOverlay = false }: LiveWhiteboardProps) {
    const { showSuccess } = useNotification();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(3);
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
    const [isToolbarExpanded, setIsToolbarExpanded] = useState(isMentor);
    const [scale, setScale] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [lastPanPos, setLastPanPos] = useState({ x: 0, y: 0 });
    const [isPanMode, setIsPanMode] = useState(false);

    // Initialize Canvas Size and handle Resizing (High-DPI aware)
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const resizeCanvas = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;

            if (width === 0 || height === 0) return;

            const dpr = window.devicePixelRatio || 1;

            // Save current image data to restore after resize
            const ctx = canvas.getContext('2d');
            let imgData: ImageData | null = null;
            if (ctx && canvas.width > 0 && canvas.height > 0) {
                try {
                    imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                } catch (e) {
                    console.warn("Could not save canvas data:", e);
                }
            }

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;

            if (ctx) {
                ctx.scale(dpr, dpr);
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                if (!isOverlay) {
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, 0, width, height);
                } else {
                    ctx.clearRect(0, 0, width, height);
                }
            }
        };

        const resizeObserver = new ResizeObserver(() => {
            // Use requestAnimationFrame to avoid "ResizeObserver loop limit exceeded" error
            window.requestAnimationFrame(resizeCanvas);
        });

        resizeObserver.observe(container);
        resizeCanvas();

        return () => resizeObserver.disconnect();
    }, []);

    const drawLine = React.useCallback((
        ctx: CanvasRenderingContext2D,
        x0Rel: number, y0Rel: number, x1Rel: number, y1Rel: number,
        color: string, width: number,
        emit: boolean
    ) => {
        if (!canvasRef.current) return;
        const dpr = window.devicePixelRatio || 1;
        const w = (canvasRef.current.width / dpr);
        const h = (canvasRef.current.height / dpr);

        ctx.beginPath();
        ctx.moveTo(x0Rel * w, y0Rel * h);
        ctx.lineTo(x1Rel * w, y1Rel * h);

        if (color === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 50; // Larger eraser
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
        }

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.closePath();

        // Reset composite op for future draws
        ctx.globalCompositeOperation = 'source-over';

        if (!emit || !socket) return;

        socket.emit('whiteboard:draw', {
            sessionId,
            x0: x0Rel, y0: y0Rel, x1: x1Rel, y1: y1Rel,
            color,
            lineWidth: width
        });
    }, [socket, sessionId]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleDraw = (data: DrawData | any) => {
            if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            // Handle both segment (x0,x1) and single point (x,y) formats
            const x0 = data.x0 ?? data.x;
            const y0 = data.y0 ?? data.y;
            const x1 = data.x1 ?? data.x;
            const y1 = data.y1 ?? data.y;

            drawLine(ctx, x0, y0, x1, y1, data.color, data.lineWidth || 3, false);
        };

        const handleClear = (data: any) => {
            if (normRoomId(data?.sessionId) !== normRoomId(sessionId)) return;
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            const c = canvasRef.current;
            if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                const lw = c.width / dpr;
                const lh = c.height / dpr;
                if (!isOverlay) {
                    ctx.fillStyle = '#0f172a';
                    ctx.fillRect(0, 0, lw, lh);
                } else {
                    ctx.clearRect(0, 0, lw, lh);
                }
            }
        };

        socket.on('whiteboard:draw', handleDraw);
        socket.on('whiteboard:clear', handleClear);

        return () => {
            socket.off('whiteboard:draw', handleDraw);
            socket.off('whiteboard:clear', handleClear);
        };
    }, [socket, sessionId, drawLine]);

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
        const actualColor = color === 'eraser' ? 'eraser' : color;
        const actualWidth = color === 'eraser' ? 50 : lineWidth;

        drawLine(ctx, currentPos.x, currentPos.y, newPos.x, newPos.y, actualColor, actualWidth, true);
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
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        const c = canvasRef.current;
        if (ctx) {
            const dpr = window.devicePixelRatio || 1;
            const lw = c.width / dpr;
            const lh = c.height / dpr;
            if (!isOverlay) {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, lw, lh);
            } else {
                ctx.clearRect(0, 0, lw, lh);
            }
        }
        if (socket) {
            socket.emit('whiteboard:clear', { sessionId });
        }
    };

    return (
        <div className={`group/board flex flex-col w-full h-full ${isOverlay ? 'bg-transparent' : 'bg-[#0f172a]'} rounded-[2rem] overflow-hidden ${!isOverlay && 'border border-white/5'} relative shadow-2xl`}>

            {/* Floating Toolbar - Collapsible Drawer */}
            <div className={`absolute bottom-28 md:bottom-4 left-4 z-[70] flex items-center gap-1.5 p-2 bg-black/90 backdrop-blur-3xl rounded-2xl border border-white/20 shadow-[0_16px_64px_rgba(0,0,0,0.8)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ring-1 ring-white/10 ${isToolbarExpanded ? 'w-auto max-w-[calc(100vw-3rem)] opacity-100' : 'w-[52px] overflow-hidden opacity-90 hover:opacity-100'}`}>
                
                {/* Toggle Trigger */}
                <button
                    onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
                    className={`w-9 h-9 shrink-0 flex items-center justify-center rounded-xl transition-all duration-300 ${isToolbarExpanded ? 'bg-white/10 text-white rotate-180' : 'text-white/60 hover:text-white'}`}
                    title={isToolbarExpanded ? "Yopish" : "Asboblarni ko'rsatish"}
                >
                    <ChevronUp className={`w-5 h-5 transition-transform duration-500 ${isToolbarExpanded ? 'rotate-0' : 'rotate-0'}`} />
                </button>

                <div className={`flex items-center gap-1.5 transition-all duration-500 ${isToolbarExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
                    <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1">
                        <Pen className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Doska</span>
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
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${color === c.color ? 'bg-white/10 ring-2 ring-white/30 scale-110 shadow-lg' : 'hover:bg-white/5 hover:scale-105'}`}
                                title={c.label}
                            >
                                <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: c.color, border: '1px solid rgba(255,255,255,0.1)' }}></div>
                            </button>
                        ))}

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        <button
                            onClick={() => { setColor('eraser'); }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${color === 'eraser' ? 'bg-white/20 text-white ring-2 ring-white/40 shadow-lg' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                            title="O'chirg'ich"
                        >
                            <Eraser className="w-4.5 h-4.5" />
                        </button>

                        <button
                            onClick={handleClear}
                            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                            title="Tozalash"
                        >
                            <Trash2 className="w-4.5 h-4.5" />
                        </button>

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

                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
                            <button
                                onClick={() => handleZoom(-0.5)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all"
                                title="Kichraytirish"
                            >
                                <ZoomOut className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-bold text-white/50 w-8 text-center">{Math.round(scale * 100)}%</span>
                            <button
                                onClick={() => handleZoom(0.5)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-all"
                                title="Kattalashtirish"
                            >
                                <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsPanMode(!isPanMode)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isPanMode ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
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

            {/* Canvas Area Container - Enforces 16:9 and handles Zoom/Pan */}
            <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair touch-none bg-[#03040a] overflow-hidden flex flex-col items-center justify-center p-2 sm:p-8">
                
                {/* Mobile Orientation Suggestion */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none md:hidden block z-50">
                     <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <p className="text-[9px] text-white/50 font-bold uppercase tracking-[0.15em] whitespace-nowrap">
                           📱 Albom (landscape) rejim tavsiya etiladi
                        </p>
                     </div>
                </div>

                <div 
                    className="relative shadow-2xl transition-transform duration-75 ease-out bg-[#0f172a] border border-white/5 overflow-hidden"
                    style={{ 
                        aspectRatio: '16/9', 
                        width: 'min(100%, calc((100vh - 250px) * 16 / 9))',
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
                        className="absolute top-0 left-0 w-full h-full rounded-lg sm:rounded-xl shadow-inner bg-[radial-gradient(#1a1d2e_1px,transparent_1px)] [background-size:24px_24px]"
                        style={{ cursor: isPanMode ? 'grab' : 'crosshair' }}
                    />
                </div>
            </div>


        </div>
    );
}


