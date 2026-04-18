'use client';

import React from 'react';
import { X, Download, Maximize2, RotateCw } from 'lucide-react';

interface MediaViewerOverlayProps {
    url: string;
    type: 'image' | 'video' | 'file';
    onClose: () => void;
}

export default function MediaViewerOverlay({ url, type, onClose }: MediaViewerOverlayProps) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app';
    const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in" onClick={onClose}>
            {/* Header Controls */}
            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                <div className="text-white/70 text-sm font-medium">
                    {type === 'image' ? 'Rasm' : 'Video'}
                </div>
                <div className="flex items-center gap-4">
                    <a
                        href={fullUrl}
                        download
                        onClick={e => e.stopPropagation()}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
                        title="Yuklab olish"
                    >
                        <Download className="h-5 w-5" />
                    </a>
                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* Media Content */}
            <div className="relative w-full h-full flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                {type === 'image' ? (
                    <img
                        src={fullUrl}
                        alt="Full view"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scale-in select-none"
                    />
                ) : type === 'video' ? (
                    <video
                        src={fullUrl}
                        controls
                        autoPlay
                        className="max-w-full max-h-full rounded-lg shadow-2xl animate-scale-in"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-4 text-white">
                        <div className="w-20 h-20 rounded-3xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <span className="text-lg font-bold">{url.split('/').pop()}</span>
                        <a
                            href={fullUrl}
                            download
                            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
                        >
                            Yuklab olish
                        </a>
                    </div>
                )}
            </div>

            {/* Bottom Actions (Optional) */}
            <div className="absolute bottom-6 flex gap-4">
                {type === 'image' && (
                    <button className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10 backdrop-blur-md">
                        <RotateCw className="h-5 w-5" />
                    </button>
                )}
                <button className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10 backdrop-blur-md">
                    <Maximize2 className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}


