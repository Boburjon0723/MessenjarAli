'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import { X, Smile, Plus, Trash2, Maximize2, MoreVertical, Check } from 'lucide-react';

interface MediaFile {
    file: File;
    preview: string;
    type: 'image' | 'video' | 'file';
}

interface MediaUploadModalProps {
    open: boolean;
    files: File[];
    onClose: () => void;
    onSend: (files: File[], caption: string, compress: boolean) => void;
}

export default function MediaUploadModal({ open, files: initialFiles, onClose, onSend }: MediaUploadModalProps) {
    const [mediaList, setMediaList] = useState<MediaFile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [caption, setCaption] = useState("");
    const [compress, setCompress] = useState(true);

    useEffect(() => {
        const loadPreviews = async () => {
            const list: MediaFile[] = await Promise.all(
                initialFiles.map(async (file) => ({
                    file,
                    preview: URL.createObjectURL(file),
                    type: file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : 'file')
                }))
            );
            setMediaList(list);
        };
        loadPreviews();

        return () => {
            mediaList.forEach(m => URL.revokeObjectURL(m.preview));
        };
    }, [initialFiles]);

    const activeMedia = mediaList[currentIndex];

    const removeCurrent = () => {
        const newList = mediaList.filter((_, i) => i !== currentIndex);
        if (newList.length === 0) {
            onClose();
        } else {
            setMediaList(newList);
            setCurrentIndex(Math.max(0, currentIndex - 1));
        }
    };

    return (
        <AnimatedModal open={open} zClass="z-[100]" onBackdropClick={onClose} className="bg-black/80 backdrop-blur-md p-4">
            {activeMedia ? (
            <GlassCard className="w-full max-w-[440px] !p-0 !bg-[#1c242f] border border-white/10 shadow-2xl flex flex-col !rounded-[24px] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4">
                    <h2 className="text-white font-bold text-lg">
                        {activeMedia.type === 'image' ? 'Rasm yuborish' : (activeMedia.type === 'video' ? 'Video yuborish' : 'Fayl yuborish')}
                    </h2>
                    <button className="p-1 text-white/40 hover:text-white transition-colors">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>

                {/* Preview Area */}
                <div className="px-6 pb-4">
                    <div className="relative group aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/5 ring-1 ring-white/10">
                        {activeMedia.type === 'image' ? (
                            <img src={activeMedia.preview} className="w-full h-full object-contain" />
                        ) : activeMedia.type === 'video' ? (
                            <video src={activeMedia.preview} className="w-full h-full object-contain" controls />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <span className="text-white text-sm font-medium">{activeMedia.file.name}</span>
                            </div>
                        )}

                        {/* Overlays on Image */}
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-white hover:bg-black/60 transition-colors">
                                <Maximize2 className="h-4 w-4" />
                            </button>
                            <button onClick={removeCurrent} className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-red-400 hover:bg-black/60 transition-colors">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <p className="text-[11px] text-white/30 mt-3 text-center">Tahrirlash uchun media ustiga bosing.</p>
                </div>

                {/* Controls */}
                <div className="px-6 space-y-4 pb-6">
                    {activeMedia.type === 'image' && (
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCompress(!compress)}>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${compress ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                                {compress && <Check className="h-3 w-3 text-white" strokeWidth={4} />}
                            </div>
                            <span className="text-sm text-white/70 group-hover:text-white transition-colors">Rasmni siqish (Compression)</span>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-[11px] text-blue-400 font-bold uppercase tracking-widest ml-1">Izoh (Caption)</label>
                        <div className="relative flex items-center border-b border-blue-500/50 focus-within:border-blue-500 transition-colors py-1">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Izoh qoldiring..."
                                className="w-full bg-transparent border-none outline-none text-white text-[15px] placeholder-white/20"
                                value={caption}
                                onChange={e => setCaption(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && onSend(mediaList.map(m => m.file), caption, compress)}
                            />
                            <Smile className="h-5 w-5 text-white/30 hover:text-white cursor-pointer" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 bg-white/5 backdrop-blur-md">
                    <button className="flex items-center gap-2 text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors">
                        <Plus className="h-5 w-5" />
                        <span>QUO'SHISH</span>
                    </button>
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors uppercase">Bekor qilish</button>
                        <button
                            onClick={() => onSend(mediaList.map(m => m.file), caption, compress)}
                            className="text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors uppercase"
                        >
                            Yuborish
                        </button>
                    </div>
                </div>
            </GlassCard>
            ) : null}
        </AnimatedModal>
    );
}
