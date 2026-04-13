'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import MediaContextMenu from './MediaContextMenu';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ChatMessage, ChatMessageMetadata } from '@/types/chat-message';
import { getDisplayTimeForMessage, normalizeMessageType } from '@/lib/chat-message-cache';

interface MessageBubbleProps {
    message: ChatMessage;
    /** lesson_start uchun: guruh chat ID (metadata yo'q bo'lsa shu ishlatiladi) */
    chatId?: string;
    onReply?: (message: ChatMessage) => void;
    isSelecting?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
    uploadProgress?: number;
    onMediaClick?: (url: string, type: 'image' | 'video' | 'file') => void;
    onForward?: (message: ChatMessage) => void;
    onDelete?: (message: ChatMessage) => void;
    isContinuation?: boolean;
    onReplyClick?: (parentId: string) => void;
    activeAudioId?: string | null;
    onAudioPlay?: (id: string | null) => void;
    /** Rasm yuklanganda scroll saqlash (chat oxirida bo‘lsa) */
    onImageLoad?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message, chatId, onReply, isSelecting, isSelected, onSelect,
    uploadProgress, onMediaClick, onForward, onDelete,
    isContinuation, onReplyClick, activeAudioId, onAudioPlay, onImageLoad
}) => {
    const { t, language } = useLanguage();
    const { showError } = useNotification();
    const isOwn = message.sender === 'me';
    const fileMeta: ChatMessageMetadata = useMemo(() => {
        const md = message.metadata;
        if (md == null) return {};
        if (typeof md === 'string') {
            try {
                return JSON.parse(md) as ChatMessageMetadata;
            } catch {
                return {};
            }
        }
        return md;
    }, [message.metadata]);

    /** Faqat UI tarmoq tanlash: `img` → `image` (cache/legacy); shartlar message.text ga bog‘lanmaydi */
    const messageType = useMemo(() => normalizeMessageType(message.type), [message.type]);

    /** Rasm/video/audio src: normalizeChatMessage allaqachon metadata dan to‘ldirgan message.text */
    const mediaSrc = useMemo(() => {
        const raw = (message.text || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = (process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app').replace(/\/$/, '');
        return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
    }, [message.text]);

    /**
     * Audio UI faqat `voice` yoki `file` + audio mimetype/uzantisi.
     * Eski xato: `message.text` faqat .mp3 bilan tekshirilgan — `image` ham audio bo‘lib qolishi mumkin edi.
     */
    const isAudioFile = useMemo(() => {
        if (messageType === 'voice') return true;
        if (messageType === 'image' || messageType === 'video') return false;
        if (messageType === 'file') {
            if (typeof fileMeta.mimetype === 'string' && fileMeta.mimetype.startsWith('audio/')) return true;
            if (message.text && /\.(mp3|wav|m4a|ogg)$/i.test(message.text)) return true;
        }
        return false;
    }, [messageType, fileMeta.mimetype, message.text]);

    const parentPreviewType = message.parentMessage
        ? normalizeMessageType(message.parentMessage.type ?? 'text')
        : 'text';

    /** Vaqt: avvalo `created_at` / `createdAt` (getDisplayTimeForMessage), keyin legacy `time` */
    const displayTime = useMemo(() => {
        const loc = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
        return getDisplayTimeForMessage(message, loc);
    }, [message.time, message.created_at, message.createdAt, language]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    const handleMediaContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    };

    const fileName = useMemo(() => {
        return (
            (typeof fileMeta.name === 'string' && fileMeta.name) ||
            (typeof fileMeta.file_name === 'string' && fileMeta.file_name) ||
            (mediaSrc && mediaSrc.split('/').pop()) ||
            (messageType === 'voice' ? t('voice_message') : t('file'))
        );
    }, [fileMeta.name, fileMeta.file_name, mediaSrc, messageType, t]);

    const fileKind = useMemo(() => {
        const mime = String(fileMeta.mimetype || '').toLowerCase();
        const ext = (fileName.split('.').pop() || '').toLowerCase();
        if (mime.startsWith('audio/') || /^(mp3|wav|ogg|m4a|aac|flac|opus|weba)$/.test(ext)) return 'AUDIO';
        if (mime.startsWith('video/') || /^(mp4|mov|webm|mkv|avi|m4v)$/.test(ext)) return 'VIDEO';
        if (mime.startsWith('image/') || /^(png|jpe?g|gif|webp|bmp|svg|heic|heif)$/.test(ext)) return 'IMAGE';
        if (mime.includes('pdf') || ext === 'pdf') return 'PDF';
        if (/word|officedocument|msword/.test(mime) || /^(doc|docx|rtf)$/.test(ext)) return 'DOC';
        if (/sheet|excel|spreadsheet/.test(mime) || /^(xls|xlsx|csv)$/.test(ext)) return 'SHEET';
        if (/zip|rar|7z|tar|gzip/.test(mime) || /^(zip|rar|7z|tar|gz)$/.test(ext)) return 'ARCHIVE';
        return ext ? ext.toUpperCase() : 'FILE';
    }, [fileMeta.mimetype, fileName]);

    const handleDownload = async () => {
        if (!mediaSrc) return;
        try {
            const res = await fetch(mediaSrc);
            const blob = await res.blob();
            const u = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = u;
            a.download = fileName || 'file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(u);
        } catch {
            window.open(mediaSrc, '_blank');
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
        setIsPlaying(!isPlaying);
    };

    const formatDuration = (seconds: number) => {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audioRef.current.currentTime = percentage * duration;
    };

    const renderText = () => {
        const text = message.text || "";
        const query = (typeof window !== 'undefined' ? window.currentSearchQuery : '') || '';

        const highlightQuery = (segment: string, keyPrefix: string) => {
            if (!query.trim()) return segment;
            const regex = new RegExp(`(${query})`, 'gi');
            const parts = segment.split(regex);
            return parts.map((part, idx) =>
                part.toLowerCase() === query.toLowerCase()
                    ? (
                        <mark
                            key={`${keyPrefix}-h-${idx}`}
                            className="bg-yellow-400/80 text-black rounded-[2px] px-0.5"
                        >
                            {part}
                        </mark>
                    )
                    : <React.Fragment key={`${keyPrefix}-t-${idx}`}>{part}</React.Fragment>
            );
        };

        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const segments = text.split(urlRegex);

        return (
            <span>
                {segments.map((segment, i) => {
                    const isUrl = /^https?:\/\//i.test(segment);
                    if (isUrl) {
                        const url = segment;
                        return (
                            <a
                                key={`url-${i}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-300 underline hover:text-blue-100 break-all"
                            >
                                {url}
                            </a>
                        );
                    }
                    return (
                        <React.Fragment key={`seg-${i}`}>
                            {highlightQuery(segment, `seg-${i}`)}
                        </React.Fragment>
                    );
                })}
            </span>
        );
    };

    useEffect(() => {
        if (activeAudioId && activeAudioId !== message.id && isPlaying) {
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.pause();
        }
    }, [activeAudioId, message.id, isPlaying]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
            onAudioPlay?.(null);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
            onAudioPlay?.(message.id);
        }
    };

    return (
        <div id={`msg-${message.id}`} className={`message-row ${isOwn ? 'items-end' : 'items-start'} ${isContinuation ? 'mt-1' : 'mt-2'}`}>
            <div className={`relative flex items-end gap-1 max-w-[92%] sm:max-w-[70%] min-w-0 group`}>
                {isSelecting && (
                    <div
                        className={`absolute inset-0 z-10 flex items-center ${isOwn ? 'justify-start pl-4' : 'justify-end pr-4'} bg-black/0 hover:bg-white/5 transition-colors rounded-xl cursor-pointer`}
                        onClick={onSelect}
                    >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/20'}`}>
                            {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                    </div>
                )}

                {!isOwn && (
                    !isContinuation ? (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 bg-blue-500/20 border border-white/10 flex items-center justify-center overflow-hidden text-[10px] font-bold">
                            {message.senderAvatar || message.sender_avatar || message.avatar ? (
                                <img
                                    src={message.senderAvatar || message.sender_avatar || message.avatar}
                                    alt={message.senderName || "User"}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            ) : null}
                            <span className="text-blue-400">{(message.senderName || "?")[0].toUpperCase()}</span>
                        </div>
                    ) : (
                        <div className="w-7 sm:w-8 flex-shrink-0" />
                    )
                )}

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} gap-1 min-w-0 flex-1`}>
                    {!isOwn && !isContinuation && message.senderName && (
                        <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider px-2">{message.senderName}</span>
                    )}

                    <div className={`message-bubble relative shadow-sm overflow-hidden min-w-0
                        ${messageType === 'image' || messageType === 'video' ? 'rounded-2xl' : 'px-4 py-3 rounded-2xl'}
                        ${isOwn ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white/10 backdrop-blur-xl text-white border border-white/5 rounded-bl-sm'}
                    `} onContextMenu={isSelecting ? undefined : handleMediaContextMenu}>

                        {message.parentMessage && (
                            <div className="mb-2 px-3 py-1.5 bg-black/10 border-l-2 border-blue-400 rounded-lg cursor-pointer hover:bg-black/20 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rid =
                                        message.parent_id ?? message.parentId ?? message.parentMessage?.id;
                                    if (rid) onReplyClick?.(String(rid));
                                }}>
                                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider truncate">
                                    {message.parentMessage.sender === (isOwn ? 'me' : 'them') ? t('me') : (message.parentMessage.senderName || t('interlocutor'))} {t('reply_to')}
                                </p>
                                <p className="text-[11px] text-white/60 truncate italic">
                                    {parentPreviewType === 'text'
                                        ? message.parentMessage.text
                                        : parentPreviewType === 'image'
                                          ? `🖼️ ${t('image')}`
                                          : parentPreviewType === 'video'
                                            ? `🎥 ${t('video')}`
                                            : `📄 ${t('file')}`}
                                </p>
                            </div>
                        )}

                        {message.isUploading && (
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4">
                                {message.error ? (
                                    <div className="text-red-400 text-center">
                                        <svg className="h-8 w-8 mx-auto mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        <span className="text-[10px] font-bold uppercase">{message.error}</span>
                                    </div>
                                ) : (
                                    <div className="w-full max-w-[120px]">
                                        <div className="flex justify-between text-[10px] text-white font-bold mb-1">
                                            <span>{t('loading')}</span>
                                            <span>{uploadProgress || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: `${uploadProgress || 0}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {messageType === 'image' ? (
                            <div className="message-bubble-body">
                                <div
                                    className="image-wrapper relative group/img cursor-pointer"
                                    onClick={() => onMediaClick?.(mediaSrc, 'image')}
                                >
                                    {mediaSrc ? (
                                        <img
                                            src={mediaSrc}
                                            alt=""
                                            className="bg-white/5"
                                            decoding="async"
                                            onLoad={onImageLoad}
                                        />
                                    ) : (
                                        <div className="min-h-[120px] flex items-center justify-center bg-white/5 text-white/45 text-xs px-4">
                                            {t('image') || 'Image'}
                                        </div>
                                    )}
                                </div>
                                {fileMeta.caption != null && String(fileMeta.caption) !== '' && (
                                    <div className="px-4 py-2 text-sm text-white/90 border-t border-white/5">{String(fileMeta.caption)}</div>
                                )}
                            </div>
                        ) : messageType === 'video' ? (
                            <div className="message-bubble-body">
                                <div
                                    className="video-wrapper relative cursor-pointer group/video"
                                    onClick={() => onMediaClick?.(mediaSrc, 'video')}
                                >
                                    <video preload="metadata" src={mediaSrc || undefined} className="pointer-events-none" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity bg-black/20 pointer-events-none rounded-[inherit]">
                                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 pointer-events-auto">
                                            <svg className="h-6 w-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    </div>
                                </div>
                                {fileMeta.caption != null && String(fileMeta.caption) !== '' && (
                                    <div className="px-4 py-2 text-sm text-white/90 border-t border-white/5">{String(fileMeta.caption)}</div>
                                )}
                            </div>
                        ) : isAudioFile ? (
                            <div className="message-bubble-body flex items-center gap-3 w-full py-2 px-1 min-w-0">
                                <button onClick={handlePlayPause} className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all ${isPlaying ? 'bg-blue-600 shadow-blue-500/50' : 'bg-blue-500 hover:bg-blue-400'}`}>
                                    {isPlaying ? (
                                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    ) : (
                                        <svg className="h-6 w-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    )}
                                </button>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <p className="text-[13px] font-bold text-white truncate min-w-0">
                                            {fileName}
                                        </p>
                                        <span className="text-[11px] font-bold text-white/60 tabular-nums flex-shrink-0">
                                            {formatDuration(isPlaying ? currentTime : duration)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={handleProgressClick}>
                                        <div className="flex-1 h-1.5 bg-white/20 hover:bg-white/30 rounded-full overflow-hidden transition-colors relative">
                                            <div className="absolute top-0 left-0 h-full bg-blue-400" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] font-bold text-white/50">{formatDuration(isPlaying ? currentTime : duration)}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-white/30 uppercase">
                                                {messageType === 'voice' ? t('active') : formatFileSize(typeof fileMeta.size === 'number' ? fileMeta.size : undefined)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    void handleDownload();
                                                }}
                                                className="text-[9px] font-bold uppercase text-blue-300 hover:text-blue-200"
                                            >
                                                {t('download')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <audio preload="metadata" ref={audioRef} src={mediaSrc || undefined} className="hidden" />
                            </div>
                        ) : messageType === 'file' ? (
                            <div className="message-bubble-body flex items-center gap-4 w-full py-2 px-1 min-w-0 cursor-pointer group/file" onClick={() => {
                                if (!message.isUploading) {
                                    onMediaClick?.(mediaSrc, 'file');
                                }
                            }}>
                                <div className="w-12 h-12 rounded-2xl bg-white/10 group-hover/file:bg-blue-500/20 border border-white/5 transition-colors flex items-center justify-center text-blue-400 relative">
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    {!message.isUploading && (
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#0d0d0f]">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-white truncate mb-0.5 group-hover/file:text-blue-400 transition-colors">{fileName}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-bold text-white/40 uppercase bg-black/20 px-1.5 py-0.5 rounded-md">{fileKind}</p>
                                        <p className="text-[10px] font-bold text-white/40 uppercase">
                                            {formatFileSize(typeof fileMeta.size === 'number' ? fileMeta.size : undefined)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                void handleDownload();
                                            }}
                                            className="text-[10px] font-bold uppercase text-blue-300 hover:text-blue-200"
                                        >
                                            {t('download')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : messageType === 'lesson_start' || messageType === 'consult_panel_invite' ? (
                            <div className="message-bubble-body flex flex-col gap-2 w-full min-w-0">
                                <p className="text-sm leading-relaxed font-semibold text-white">
                                    {renderText()}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const sessionId =
                                            (fileMeta.sessionId != null && String(fileMeta.sessionId) !== ''
                                                ? String(fileMeta.sessionId)
                                                : null) ||
                                            (fileMeta.chatId != null && String(fileMeta.chatId) !== ''
                                                ? String(fileMeta.chatId)
                                                : null) ||
                                            (chatId ? String(chatId) : '');
                                        if (!sessionId) {
                                            showError("Xona ID topilmadi. Sahifani yangilab qayta urinib ko'ring.");
                                            return;
                                        }
                                        const rawStyle = fileMeta.sessionStyle;
                                        const styleStr = rawStyle != null ? String(rawStyle) : '';
                                        const styleQs =
                                            styleStr.trim() !== '' && styleStr.toLowerCase() !== 'mentor'
                                                ? `&style=${encodeURIComponent(styleStr.trim())}`
                                                : '';
                                        window.location.href = `/messages?room=${encodeURIComponent(sessionId)}${styleQs}`;
                                    }}
                                    className="mt-2 w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {(() => {
                                        const isConsult =
                                            messageType === 'consult_panel_invite' ||
                                            String(fileMeta.sessionStyle ?? '') === 'consult' ||
                                            /\bkonsultatsiy/i.test(message.text || '');
                                        return isConsult ? t('joined_meeting') : t('joined_lesson');
                                    })()}
                                </button>
                            </div>
                        ) : messageType === 'lesson_end' ? (
                            <div className="message-bubble-body w-full min-w-0 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2.5">
                                <p className="text-sm font-semibold leading-relaxed text-white">{renderText()}</p>
                            </div>
                        ) : (
                            <div className="message-bubble-body flex flex-col gap-1 w-full min-w-0">
                                <p className="text-sm leading-relaxed">{renderText()}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 px-1 mt-0.5">
                        <span className="text-[9px] text-white/30 font-bold">{displayTime}</span>
                        {isOwn && (
                            message.isPending ? (
                                <svg
                                    className="h-3 w-3 text-white/40"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : message.is_read ? (
                                <div className="flex -space-x-1.5 opacity-90">
                                    <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            ) : (
                                <svg
                                    className="h-3 w-3 text-white/50"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            )
                        )}
                    </div>
                </div>
            </div>

            {contextMenu && (
                <MediaContextMenu
                    x={contextMenu.x} y={contextMenu.y}
                    message={message}
                    onClose={() => setContextMenu(null)}
                    onReply={() => onReply?.(message)}
                    onForward={() => onForward?.(message)}
                    onDelete={() => onDelete?.(message)}
                />
            )}
        </div>
    );
};
