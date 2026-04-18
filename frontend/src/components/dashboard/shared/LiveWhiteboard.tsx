"use client";

import React, { useRef, useState, useEffect } from 'react';
import { X, Eraser, Trash2, Pen } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

interface LiveWhiteboardProps {
    socket: any;
    sessionId: string;
    isMentor: boolean;
    onClose?: () => void;
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

export function LiveWhiteboard({ socket, sessionId, isMentor, onClose }: LiveWhiteboardProps) {
    const { showSuccess } = useNotification();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(3);
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

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

                if (imgData) {
                    // We'll just clear and start fresh for now to avoid scaling artifacts 
                    // unless we want to implement a more complex persistence logic
                    ctx.fillStyle = '#1c1f2b';
                    ctx.fillRect(0, 0, width, height);
                } else {
                    ctx.fillStyle = '#1c1f2b';
                    ctx.fillRect(0, 0, width, height);
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
        x0: number, y0: number, x1: number, y1: number,
        color: string, width: number,
        emit: boolean
    ) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);

        if (color === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 30;
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
            x0, y0, x1, y1,
            color,
            lineWidth: width
        });
    }, [socket, sessionId]);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;

        const handleDraw = (data: DrawData) => {
            if (data.sessionId !== sessionId) return;
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            if (!ctx) return;

            drawLine(ctx, data.x0, data.y0, data.x1, data.y1, data.color, data.lineWidth, false);
        };

        const handleClear = (data: any) => {
            if (data.sessionId !== sessionId) return;
            if (!canvasRef.current) return;
            const ctx = canvasRef.current.getContext('2d');
            const c = canvasRef.current;
            if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                const lw = c.width / dpr;
                const lh = c.height / dpr;
                ctx.fillStyle = '#1c1f2b';
                ctx.fillRect(0, 0, lw, lh);
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
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    };

    const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const pos = getMousePos(e);
        setCurrentPos(pos);
    };

    const onMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const newPos = getMousePos(e);
        const actualColor = color === 'eraser' ? 'eraser' : color;
        const actualWidth = color === 'eraser' ? 30 : lineWidth;

        drawLine(ctx, currentPos.x, currentPos.y, newPos.x, newPos.y, actualColor, actualWidth, true);
        setCurrentPos(newPos);
    };

    const onMouseUp = () => {
        setIsDrawing(false);
    };

    const handleClear = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#1c1f2b';
            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
        if (socket) {
            socket.emit('whiteboard:clear', { sessionId });
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-[#1c1f2b] rounded-xl overflow-hidden border border-white/10 relative">

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#252836] border-b border-white/5">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tracking-wide text-white/50 border-r border-white/10 pr-3 mr-1">Taqdimot Doskasi</span>

                    <button
                        onClick={() => { setColor('#ffffff'); setLineWidth(3); }}
                        className={`p-1.5 rounded-lg transition-all ${color === '#ffffff' ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5'}`}
                        title="Oq qalam"
                    >
                        <div className="w-5 h-5 rounded-full bg-white border border-white/20"></div>
                    </button>
                    <button
                        onClick={() => { setColor('#3b82f6'); setLineWidth(3); }}
                        className={`p-1.5 rounded-lg transition-all ${color === '#3b82f6' ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : 'hover:bg-white/5'}`}
                        title="Ko'k qalam"
                    >
                        <div className="w-5 h-5 rounded-full bg-blue-500 border border-white/20"></div>
                    </button>
                    <button
                        onClick={() => { setColor('#ef4444'); setLineWidth(3); }}
                        className={`p-1.5 rounded-lg transition-all ${color === '#ef4444' ? 'bg-red-500/20 ring-1 ring-red-500/50' : 'hover:bg-white/5'}`}
                        title="Qizil qalam"
                    >
                        <div className="w-5 h-5 rounded-full bg-red-500 border border-white/20"></div>
                    </button>
                    <button
                        onClick={() => { setColor('#22c55e'); setLineWidth(3); }}
                        className={`p-1.5 rounded-lg transition-all ${color === '#22c55e' ? 'bg-green-500/20 ring-1 ring-green-500/50' : 'hover:bg-white/5'}`}
                        title="Yashil qalam"
                    >
                        <div className="w-5 h-5 rounded-full bg-green-500 border border-white/20"></div>
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1"></div>

                    <button
                        onClick={() => { setColor('eraser'); }}
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${color === 'eraser' ? 'bg-white/10 text-white ring-1 ring-white/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        title="O'chirg'ich"
                    >
                        <Eraser className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleClear}
                        className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10`}
                        title="Tozalash"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="w-px h-5 bg-white/10 mx-1"></div>

                    {isMentor && (
                        <button
                            onClick={async () => {
                                if (!canvasRef.current) return;
                                const dataUrl = canvasRef.current.toDataURL('image/png');
                                try {
                                    await fetch('/api/specialists/whiteboard/snapshot', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            session_id: sessionId,
                                            snapshot_data: dataUrl,
                                            chat_id: sessionId
                                        })
                                    });
                                    showSuccess("Doska holati saqlandi!");
                                } catch (e) {
                                    console.error("Snapshot save error:", e);
                                }
                            }}
                            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-bold transition-all"
                        >
                            Saqlash
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (!canvasRef.current) return;
                            const imgData = canvasRef.current.toDataURL('image/png');
                            import('jspdf').then(({ jsPDF }) => {
                                const pdf = new jsPDF('l', 'px', [canvasRef.current!.width, canvasRef.current!.height]);
                                pdf.addImage(imgData, 'PNG', 0, 0, canvasRef.current!.width, canvasRef.current!.height);
                                pdf.save(`whiteboard-${sessionId}.pdf`);
                            });
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"
                    >
                        PDF Yuklash
                    </button>
                </div>

                {onClose && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onClose();
                        }}
                        className="relative z-20 p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all shrink-0"
                        title="Doskani yopish"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Canvas Area */}
            <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onTouchStart={onMouseDown}
                    onTouchMove={onMouseMove}
                    onTouchEnd={onMouseUp}
                    className="absolute top-0 left-0 w-full h-full"
                />
            </div>

        </div>
    );
}


