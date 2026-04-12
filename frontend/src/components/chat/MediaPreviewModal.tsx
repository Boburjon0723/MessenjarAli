'use client';

import React, { useState, useRef } from 'react';

interface MediaPreviewModalProps {
    file: File;
    onSend: (caption: string) => void;
    onCancel: () => void;
}

export default function MediaPreviewModal({ file, onSend, onCancel }: MediaPreviewModalProps) {
    const [caption, setCaption] = useState('');
    const previewUrl = useRef(URL.createObjectURL(file)).current;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    const handleSend = () => {
        onSend(caption);
        URL.revokeObjectURL(previewUrl);
    };

    const handleCancel = () => {
        onCancel();
        URL.revokeObjectURL(previewUrl);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Blurred dark backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-xl"
                onClick={handleCancel}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                style={{ background: 'rgba(18, 22, 36, 0.92)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <span className="text-white font-semibold text-[15px]">
                        {isVideo ? 'Video yuborish' : 'Rasm yuborish'}
                    </span>
                    <div className="flex items-center gap-2">
                        {/* Rotate & Delete buttons */}
                        {!isVideo && (
                            <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={handleCancel}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Media Preview */}
                <div className="relative bg-black/20 flex items-center justify-center min-h-[280px] max-h-[400px] overflow-hidden">
                    {isVideo ? (
                        <video
                            src={previewUrl}
                            className="w-full max-h-[400px] object-contain"
                            controls
                            playsInline
                            autoPlay
                            muted
                        />
                    ) : isImage ? (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="max-w-full max-h-[400px] object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-3 p-8 text-white/40">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-sm font-medium">{file.name}</span>
                        </div>
                    )}
                </div>

                {/* Caption Input */}
                <div className="px-4 pt-3 pb-1">
                    <input
                        type="text"
                        placeholder="Izoh..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                        className="w-full bg-transparent text-white text-[14px] placeholder-white/30 outline-none border-none"
                        autoFocus
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between px-4 pt-1 pb-4 mt-2">
                    <button className="text-blue-400 text-[13px] font-semibold hover:opacity-80 transition-opacity">
                        + Qo'shish
                    </button>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleCancel}
                            className="text-white/50 text-[13px] font-semibold hover:text-white/80 transition-colors"
                        >
                            Bekor
                        </button>
                        <button
                            onClick={handleSend}
                            className="text-blue-400 text-[13px] font-bold hover:opacity-80 transition-opacity"
                        >
                            Yuborish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
