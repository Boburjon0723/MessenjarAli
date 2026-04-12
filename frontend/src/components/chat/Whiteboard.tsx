"use client";

import React, { useRef, useEffect, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Eraser, Pencil, Trash2, Download, Square, Circle, Minus } from 'lucide-react';

interface WhiteboardProps {
    sessionId: string;
    className?: string;
}

export default function Whiteboard({ sessionId, className = "" }: WhiteboardProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const { socket } = useSocket();
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ffffff');
    const [lineWidth, setLineWidth] = useState(3);
    const [tool, setTool] = useState<'pencil' | 'eraser' | 'rect' | 'circle'>('pencil');
    const [currentPos, setCurrentPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Scale for high DPI displays
        const scale = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * scale;
        canvas.height = canvas.offsetHeight * scale;

        const context = canvas.getContext('2d');
        if (context) {
            context.scale(scale, scale);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            contextRef.current = context;
        }

        // Socket listeners
        if (socket) {
            socket.on('whiteboard:draw', (data: any) => {
                if (data.sessionId !== sessionId) return;
                drawRemote(data);
            });

            socket.on('whiteboard:clear', (data: any) => {
                if (data.sessionId !== sessionId) return;
                clearLocal();
            });
        }

        return () => {
            if (socket) {
                socket.off('whiteboard:draw');
                socket.off('whiteboard:clear');
            }
        };
    }, [socket, sessionId]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const pos = getCoordinates(e);
        setCurrentPos(pos);
        setIsDrawing(true);
    };

    const finishDrawing = () => {
        setIsDrawing(false);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const newPos = getCoordinates(e);

        const ctx = contextRef.current;
        if (!ctx) return;

        ctx.save();
        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 20;
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
        }

        ctx.beginPath();
        ctx.moveTo(currentPos.x, currentPos.y);
        ctx.lineTo(newPos.x, newPos.y);
        ctx.stroke();
        ctx.restore();

        // Emit drawing data
        if (socket) {
            socket.emit('whiteboard:draw', {
                sessionId,
                x0: currentPos.x,
                y0: currentPos.y,
                x1: newPos.x,
                y1: newPos.y,
                color: tool === 'eraser' ? 'transparent' : color,
                lineWidth: tool === 'eraser' ? 20 : lineWidth
            });
        }
        setCurrentPos(newPos);
    };

    const drawRemote = (data: any) => {
        const ctx = contextRef.current;
        if (!ctx) return;

        ctx.save();
        if (data.color === 'transparent') {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = data.color;
        }
        ctx.lineWidth = data.lineWidth;

        ctx.beginPath();
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();
        ctx.restore();
    };

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.nativeEvent.offsetX,
                y: e.nativeEvent.offsetY
            };
        }
    };

    const clearCanvas = () => {
        clearLocal();
        if (socket) {
            socket.emit('whiteboard:clear', { sessionId });
        }
    };

    const clearLocal = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const downloadImage = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `whiteboard-${sessionId}.png`;
        link.href = canvas.toDataURL();
        link.click();
    };

    return (
        <div className={`relative flex flex-col bg-[#161821] rounded-2xl border border-white/5 shadow-2xl overflow-hidden ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 bg-[#1c1f2b] border-b border-white/5">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setTool('pencil')}
                        className={`p-2 rounded-lg transition-all ${tool === 'pencil' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                        title="Qalam"
                    >
                        <Pencil size={18} />
                    </button>
                    <button
                        onClick={() => setTool('eraser')}
                        className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:bg-white/5'}`}
                        title="O'chirg'ich"
                    >
                        <Eraser size={18} />
                    </button>
                    <div className="w-[1px] h-6 bg-white/10 mx-1" />
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer bg-transparent border-none overflow-hidden"
                    />
                    <select
                        value={lineWidth}
                        onChange={(e) => setLineWidth(parseInt(e.target.value))}
                        className="bg-[#161821] text-white text-xs px-2 py-1 rounded border border-white/10 outline-none"
                    >
                        <option value="1">1px</option>
                        <option value="3">3px</option>
                        <option value="5">5px</option>
                        <option value="10">10px</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={downloadImage}
                        className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        title="Yuklab olish"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={clearCanvas}
                        className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Tozalash"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative cursor-crosshair touch-none">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseMove={draw}
                    onMouseLeave={finishDrawing}
                    onTouchStart={startDrawing}
                    onTouchEnd={finishDrawing}
                    onTouchMove={draw}
                    className="absolute inset-0 w-full h-full"
                />
            </div>

            {/* Hint Overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10 pointer-events-none">
                <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest">
                    Jonli doska • Barcha ishtirokchilar ko'ra oladi
                </p>
            </div>
        </div>
    );
}
