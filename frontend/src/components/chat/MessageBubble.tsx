'use client';

import React, { useState, useRef, useEffect, useMemo, useSyncExternalStore } from 'react';
import MediaContextMenu from './MediaContextMenu';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import type { ChatMessage, ChatMessageMetadata } from '@/types/chat-message';
import { getDisplayTimeForMessage, normalizeMessageType } from '@/lib/chat-message-cache';
import { downloadChatFile } from '@/lib/download-file';
import { classifyTelegramMessage, describeDocumentKind } from '@/lib/telegram-message-kind';
import { formatPhoneCallLabel, parsePhoneCallMeta } from '@/lib/phone-call-message';
import { songPlayer } from '@/lib/song-player-store';
import { apiFetch } from '@/lib/api';
import { useConfirm } from '@/context/ConfirmContext';

const DEFAULT_MONTHLY_MALI = 100;

interface MessageBubbleProps {
    message: ChatMessage;
    /** lesson_start uchun: guruh chat ID (metadata yo'q bo'lsa shu ishlatiladi) */
    chatId?: string;
    chatType?: string;
    groupCreatorId?: string | null;
    currentUserId?: string | null;
    mentorSubStatus?: { active: boolean; expired: boolean } | null;
    onReply?: (message: ChatMessage) => void;
    isSelecting?: boolean;
    isSelected?: boolean;
    onSelect?: () => void;
    uploadProgress?: number;
    onMediaClick?: (url: string, type: 'image' | 'video' | 'file') => void;
    onForward?: (message: ChatMessage) => void;
    onDelete?: (message: ChatMessage) => void;
    onEdit?: (message: ChatMessage) => void;
    onPin?: (message: ChatMessage) => void;
    isContinuation?: boolean;
    onReplyClick?: (parentId: string) => void;
    activeAudioId?: string | null;
    onAudioPlay?: (id: string | null) => void;
    songPlaylist?: import('@/lib/song-player-store').SongTrack[];
    onImageLoad?: (e?: React.SyntheticEvent<HTMLImageElement>) => void;
    /** Guruh/kanalda avatar; shaxsiy chatda Telegram kabi yo‘q */
    showPeerAvatar?: boolean;
    /** Dars yakunlangan yoki yangi taklif chiqqan — qo‘shilish tugmasi o‘chiq */
    inviteJoinExpired?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
    message, chatId, chatType, groupCreatorId, currentUserId, mentorSubStatus,
    onReply, isSelecting, isSelected, onSelect,
    uploadProgress, onMediaClick, onForward, onDelete, onEdit, onPin,
    isContinuation, onReplyClick, activeAudioId, onAudioPlay, onImageLoad, showPeerAvatar = false, songPlaylist,
    inviteJoinExpired = false,
}) => {
    const { t, language } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const { confirm } = useConfirm();
    const [payLoading, setPayLoading] = useState(false);
    const [groupJoinLoading, setGroupJoinLoading] = useState(false);
    const [paidPanelOpen, setPaidPanelOpen] = useState(false);
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

    const inviteKind = paidPanelOpen ? 'panel_open' : String(fileMeta.kind ?? '');

    useEffect(() => {
        setPaidPanelOpen(false);
    }, [message.id, fileMeta.kind]);

    const openConsultSession = () => {
        if (inviteJoinExpired || fileMeta.invite_status === 'expired' || fileMeta.status === 'expired') {
            showError(t('invite_expired') as string);
            return;
        }
        if (messageType === 'lesson_start' && mentorSubStatus && !mentorSubStatus.active) {
            showError(
                mentorSubStatus.expired
                    ? (t('subscription_expired_lesson') as string)
                    : (t('subscription_pay_via_invite') as string)
            );
            return;
        }
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
    };

    const handleGroupJoinInvite = async () => {
        const groupId = fileMeta.groupId != null ? String(fileMeta.groupId) : '';
        const mentorId = fileMeta.mentorId != null ? String(fileMeta.mentorId) : '';
        if (!groupId || !mentorId) {
            showError(t('server_error') as string);
            return;
        }
        setGroupJoinLoading(true);
        try {
            const statusRes = await apiFetch(
                `/api/wallet/subscription-status?mentorId=${encodeURIComponent(mentorId)}`
            );
            const statusData = await statusRes.json().catch(() => ({}));
            const hasActiveSub = statusRes.ok && !!statusData.active;

            if (!hasActiveSub) {
                const ok = await confirm({
                    title: t('top_up') as any,
                    description: `${DEFAULT_MONTHLY_MALI} MALI — 1 oylik obuna`,
                    confirmLabel: t('group_join_pay_btn') as any,
                });
                if (!ok) return;
                const subRes = await apiFetch('/api/wallet/subscribe-to-mentor', {
                    method: 'POST',
                    body: JSON.stringify({ mentorId }),
                });
                const subData = await subRes.json().catch(() => ({}));
                if (!subRes.ok) {
                    throw new Error(typeof subData?.message === 'string' ? subData.message : t('server_error'));
                }
            }

            const joinRes = await apiFetch(`/api/chats/${encodeURIComponent(groupId)}/join-with-subscription`, {
                method: 'POST',
            });
            const joinData = await joinRes.json().catch(() => ({}));
            if (!joinRes.ok) {
                throw new Error(typeof joinData?.message === 'string' ? joinData.message : t('server_error'));
            }
            showSuccess(t('group_join_success') as string);
            window.location.href = `/messages?openChat=${encodeURIComponent(groupId)}`;
        } catch (e) {
            showError(e instanceof Error ? e.message : (t('server_error') as string));
        } finally {
            setGroupJoinLoading(false);
        }
    };

    /** Faqat UI tarmoq tanlash: `img` → `image` (cache/legacy); shartlar message.text ga bog‘lanmaydi */
    const messageType = useMemo(() => normalizeMessageType(message.type), [message.type]);

    /** Rasm/video/audio src: normalizeChatMessage allaqachon metadata dan to‘ldirgan message.text */
    const mediaSrc = useMemo(() => {
        const raw = (message.text || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
        return `${base}${raw.startsWith('/') ? '' : '/'}${raw}`;
    }, [message.text]);

    const kind = useMemo(
        () =>
            classifyTelegramMessage({
                type: message.type,
                mime: typeof fileMeta.mimetype === 'string' ? fileMeta.mimetype : '',
                filename: `${fileMeta.name || ''} ${fileMeta.file_name || ''} ${message.text || ''}`,
            }),
        [message.type, fileMeta.mimetype, fileMeta.name, fileMeta.file_name, message.text]
    );
    const isMusic = kind === 'song';
    const isVoiceBubble = kind === 'voice';
    const [localPlaying, setLocalPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [mediaLoaded, setMediaLoaded] = useState(false);
    const songState = useSyncExternalStore(songPlayer.subscribe, songPlayer.getSnapshot, songPlayer.getSnapshot);
    const songActive = isMusic && songState.track?.id === message.id;
    const isPlaying = isMusic ? (songActive && songState.playing) : localPlaying;
    const songTime = songActive ? songState.currentTime : 0;
    const metaDuration = typeof (fileMeta as { duration?: unknown }).duration === 'number'
        ? Number((fileMeta as { duration?: number }).duration)
        : 0;
    const songDur = (songActive && songState.duration ? songState.duration : 0) || metaDuration || duration;

    const parentPreviewType = message.parentMessage
        ? normalizeMessageType(message.parentMessage.type ?? 'text')
        : 'text';

    const displayTime = useMemo(() => {
        const loc = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
        return getDisplayTimeForMessage(message, loc);
    }, [message.time, message.created_at, message.createdAt, language]);

    useEffect(() => {
        setMediaLoaded(false);
    }, [message.id, message.text]);

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

    const musicTitle = useMemo(() => {
        const raw = String(fileMeta.name || fileMeta.file_name || '').trim();
        if (raw) return raw.replace(/\.[^.]+$/, '') || raw;
        const fromUrl = (mediaSrc || message.text || '').split('/').pop() || '';
        try {
            const decoded = decodeURIComponent(fromUrl.split('?')[0]);
            return decoded.replace(/\.[^.]+$/, '') || decoded || t('file');
        } catch {
            return fromUrl.replace(/\.[^.]+$/, '') || t('file');
        }
    }, [fileMeta.name, fileMeta.file_name, mediaSrc, message.text, t]);

    const fileName = useMemo(() => {
        return (
            (typeof fileMeta.name === 'string' && fileMeta.name) ||
            (typeof fileMeta.file_name === 'string' && fileMeta.file_name) ||
            (mediaSrc && mediaSrc.split('/').pop()) ||
            (messageType === 'voice' ? t('voice_message') : t('file'))
        );
    }, [fileMeta.name, fileMeta.file_name, mediaSrc, messageType, t]);

    const fileKind = useMemo(
        () => describeDocumentKind(fileName, String(fileMeta.mimetype || '')).label,
        [fileMeta.mimetype, fileName]
    );
    const fileTone = useMemo(
        () => describeDocumentKind(fileName, String(fileMeta.mimetype || '')).tone,
        [fileMeta.mimetype, fileName]
    );

    const handleDownload = async () => {
        if (!mediaSrc) return;
        try {
            await downloadChatFile(mediaSrc, fileName || 'file');
        } catch {
            showError(t('upload_error') || 'Download failed');
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => setLocalPlaying(false);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

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
        if (isMusic) return;
        if (activeAudioId && activeAudioId !== message.id && localPlaying) {
            setLocalPlaying(false);
            if (audioRef.current) audioRef.current.pause();
        }
    }, [activeAudioId, message.id, localPlaying, isMusic]);

    const handlePlayPause = () => {
        if (isMusic) {
            if (!mediaSrc) return;
            try { audioRef.current?.pause(); } catch { /* ignore */ }
            songPlayer.play(
                { id: message.id, url: mediaSrc, title: musicTitle, filename: fileName || `${musicTitle}.mp3` },
                songPlaylist && songPlaylist.length ? songPlaylist : undefined
            );
            onAudioPlay?.(message.id);
            return;
        }
        if (songPlayer.getSnapshot().playing) songPlayer.pause();
        if (!audioRef.current) return;
        if (localPlaying) {
            audioRef.current.pause();
            setLocalPlaying(false);
            onAudioPlay?.(null);
        } else {
            void audioRef.current.play();
            setLocalPlaying(true);
            onAudioPlay?.(message.id);
        }
    };

    const isService =
        messageType === 'lesson_end' ||
        messageType === 'lesson_start' ||
        messageType === 'consult_panel_invite' ||
        messageType === 'group_join_invite' ||
        messageType === 'phone_call';

    const isMentorStyle =
        String(fileMeta.sessionStyle ?? '') === 'mentor' ||
        messageType === 'group_join_invite';

    if (isService) {
        const isConsult =
            messageType === 'consult_panel_invite' ||
            String(fileMeta.sessionStyle ?? '') === 'consult' ||
            /\bkonsultatsiy/i.test(message.text || '');

        if (messageType === 'phone_call') {
            const phoneMeta = parsePhoneCallMeta(fileMeta);
            const label = formatPhoneCallLabel(phoneMeta, isOwn, t as unknown as (key: string) => string);
            const isMissedOrCancelled =
                phoneMeta.status === 'missed' && !isOwn;
            return (
                <div id={`msg-${message.id}`} className="message-row items-center my-2">
                    <div
                        className={`inline-flex max-w-[85%] items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[13px] leading-[18px] ${
                            isMissedOrCancelled && !isOwn
                                ? 'bg-[#e53935]/20 text-[#ff8a80]'
                                : 'bg-black/35 text-white/80'
                        }`}
                    >
                        {phoneMeta.callType === 'video' ? (
                            <svg className="h-3.5 w-3.5 shrink-0 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        ) : (
                            <svg className="h-3.5 w-3.5 shrink-0 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                        )}
                        <span>{label}</span>
                        <span className="text-[11px] text-white/45 tabular-nums">{displayTime}</span>
                    </div>
                </div>
            );
        }

        return (
            <div id={`msg-${message.id}`} className="message-row items-center my-2">
                <div className="max-w-[85%] rounded-[14px] bg-black/35 px-2.5 py-1.5 text-center text-[13px] leading-[18px] text-white">
                    {renderText()}
                </div>
                {messageType === 'consult_panel_invite' &&
                    inviteKind === 'panel_open' &&
                    !isMentorStyle && (
                        <div className="mt-2 w-full max-w-[280px] rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3 shadow-lg">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-[13px] font-bold text-emerald-300 uppercase tracking-wide">
                                    {t('consult_paid_badge')}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={openConsultSession}
                                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-semibold flex items-center justify-center gap-2"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                {t('consult_join_session_btn')}
                            </button>
                        </div>
                    )}
                {messageType === 'consult_panel_invite' &&
                    (inviteKind === 'payment_request' || !!fileMeta.serviceAmountMali) &&
                    inviteKind !== 'panel_open' &&
                    !isOwn &&
                    !isMentorStyle ? (
                        <div className="mt-2 w-full max-w-[280px] rounded-2xl border border-blue-500/30 bg-blue-950/40 p-3 shadow-lg">
                            <p className="text-[13px] font-semibold text-blue-200 mb-2">
                                {t('consult_payment_title')}
                            </p>
                            <p className="text-[15px] font-bold text-white tabular-nums mb-3">
                                {Number(fileMeta.serviceAmountMali) || 0} MALI
                            </p>
                            <button
                                type="button"
                                disabled={payLoading}
                                onClick={async () => {
                                    const amount = Number(fileMeta.serviceAmountMali) || 0;
                                    const expertId =
                                        message.sender_id ||
                                        (message as any).senderId;
                                    if (!expertId || !chatId || amount <= 0) {
                                        showError(t('server_error') as string);
                                        return;
                                    }
                                    const ok = await confirm({
                                        title: t('consult_payment_title') as any,
                                        description: `${amount} MALI`,
                                        confirmLabel: t('consult_pay_now_btn') as any,
                                    });
                                    if (!ok) return;
                                    setPayLoading(true);
                                    try {
                                        const res = await apiFetch('/api/service/initiate', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                                expert_id: String(expertId),
                                                amount_mali: amount,
                                                chat_id: String(chatId),
                                            }),
                                        });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) {
                                            throw new Error(
                                                typeof data?.message === 'string'
                                                    ? data.message
                                                    : t('server_error')
                                            );
                                        }
                                        showSuccess(t('success_update') as string);
                                        setPaidPanelOpen(true);
                                    } catch (e) {
                                        showError(
                                            e instanceof Error ? e.message : (t('server_error') as string)
                                        );
                                    } finally {
                                        setPayLoading(false);
                                    }
                                }}
                                className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-semibold disabled:opacity-50"
                            >
                                {payLoading ? '...' : t('consult_pay_now_btn')}
                            </button>
                        </div>
                    ) : null}
                {messageType === 'group_join_invite' && !isOwn && (
                    <div className="mt-2 w-full max-w-[280px] rounded-2xl border border-[#8774e1]/30 bg-[#8774e1]/10 p-3 shadow-lg">
                        <p className="text-[13px] font-semibold text-[#c4b5fd] mb-1">
                            {String(fileMeta.groupName || t('group_label'))}
                        </p>
                        <p className="text-[15px] font-bold text-white tabular-nums mb-3">
                            {DEFAULT_MONTHLY_MALI} MALI / oy
                        </p>
                        <button
                            type="button"
                            disabled={groupJoinLoading}
                            onClick={() => void handleGroupJoinInvite()}
                            className="w-full py-2 rounded-xl bg-[#8774e1] hover:bg-[#7b68d9] text-white text-[13px] font-semibold disabled:opacity-50"
                        >
                            {groupJoinLoading ? '...' : t('group_join_pay_btn')}
                        </button>
                    </div>
                )}
                {(messageType === 'lesson_start' || messageType === 'consult_panel_invite') && (() => {
                    if (isMentorStyle && messageType === 'consult_panel_invite') return null;
                    const inviteExpired =
                        inviteJoinExpired ||
                        fileMeta.invite_status === 'expired' ||
                        fileMeta.status === 'expired';
                    const hideJoinForPayment =
                        messageType === 'consult_panel_invite' &&
                        (inviteKind === 'panel_open' ||
                            inviteKind === 'payment_request' ||
                            (Boolean(fileMeta.serviceAmountMali) && inviteKind !== 'panel_open' && !isOwn));
                    if (hideJoinForPayment && !inviteExpired) return null;
                    const lessonSubBlocked =
                        messageType === 'lesson_start' &&
                        !isOwn &&
                        chatType === 'group' &&
                        !!groupCreatorId &&
                        String(groupCreatorId) !== String(currentUserId ?? '') &&
                        (!mentorSubStatus || !mentorSubStatus.active);
                    if (inviteExpired || lessonSubBlocked) {
                        return (
                            <div className="mt-1.5 flex flex-col items-center gap-0.5">
                                <button
                                    type="button"
                                    disabled
                                    className="rounded-full bg-[#212121]/60 px-4 py-1.5 text-[14px] font-medium text-white/35 cursor-not-allowed"
                                >
                                    {lessonSubBlocked && mentorSubStatus?.expired
                                        ? t('subscription_expired_lesson')
                                        : t('invite_expired')}
                                </button>
                                <span className="text-[11px] text-white/40 max-w-[240px] text-center leading-snug">
                                    {lessonSubBlocked && mentorSubStatus?.expired
                                        ? t('subscription_expired_hint')
                                        : t('invite_expired_hint')}
                                </span>
                            </div>
                        );
                    }
                    return (
                    <button
                        type="button"
                        onClick={openConsultSession}
                        className="mt-1.5 rounded-full bg-[#212121] px-4 py-1.5 text-[14px] font-medium text-[#8774e1] shadow-[0_1px_8px_rgba(0,0,0,0.25)]"
                    >
                        {isConsult ? t('joined_meeting') : t('joined_lesson')}
                    </button>
                    );
                })()}
            </div>
        );
    }

    return (
        <div
            id={`msg-${message.id}`}
            className={`message-row select-none ${isOwn ? 'items-end' : 'items-start'} ${isContinuation ? 'mt-0.5' : 'mt-2'} ${isSelecting ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[#8774e1]/[0.08]' : ''}`}
            onClick={isSelecting ? onSelect : undefined}
        >
            <div className={`relative flex items-end gap-1.5 max-w-[min(85%,30rem)] min-w-0 group ${isSelecting ? 'pointer-events-none' : ''}`}>
                {isSelecting && (
                    <div className={`absolute ${isOwn ? '-left-8' : '-left-8'} top-1/2 -translate-y-1/2 z-10 pointer-events-auto`}>
                        <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                            isSelected
                                ? 'bg-[#8774e1] border-[#8774e1] scale-100'
                                : 'border-white/40 bg-transparent scale-90'
                        }`}>
                            {isSelected && (
                                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none">
                                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                    </div>
                )}

                {showPeerAvatar && !isOwn && (
                    !isContinuation ? (
                        <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#8774e1] flex items-center justify-center overflow-hidden text-[12px] font-medium text-white">
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
                            <span>{(message.senderName || "?")[0].toUpperCase()}</span>
                        </div>
                    ) : (
                        <div className="w-8 flex-shrink-0" />
                    )
                )}

                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
                    {showPeerAvatar && !isOwn && !isContinuation && message.senderName && (
                        <span className="px-2 pb-0.5 text-[13px] font-medium text-[#8774e1]">{message.senderName}</span>
                    )}

                    {messageType === 'sticker' ? (
                        <div className="relative" onContextMenu={isSelecting ? undefined : handleMediaContextMenu}>
                            {!mediaLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                                </div>
                            )}
                            <img
                                src={mediaSrc || message.text}
                                alt=""
                                className={`w-[150px] h-[150px] object-contain drop-shadow-lg ${mediaLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                                loading="lazy"
                                onLoad={() => setMediaLoaded(true)}
                                onError={() => setMediaLoaded(true)}
                            />
                            <div className="absolute bottom-[2px] right-[2px] flex items-center gap-0.5 rounded px-1 bg-black/35">
                                <span className="text-[11px] text-white/90 leading-none whitespace-nowrap">{displayTime}</span>
                                {isOwn && (
                                    message.isPending ? (
                                        <svg className="h-3.5 w-3.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : message.is_read ? (
                                        <svg className="h-4 w-4 text-white" viewBox="0 0 18 18" fill="none">
                                            <path d="M3.5 9.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M7 12.5l7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4 text-white/85" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )
                                )}
                            </div>
                        </div>
                    ) : (
                    <div className={`message-bubble relative min-w-[56px] min-w-0 shadow-[0_1px_2px_rgba(16,35,47,0.3)]
                        ${messageType === 'image' || messageType === 'video' ? 'overflow-hidden' : 'px-2 pt-1 pb-[18px]'}
                        ${isOwn
                            ? 'bg-[#8774e1] text-white rounded-[16px] rounded-br-[4px]'
                            : 'bg-[#212121] text-white rounded-[16px] rounded-bl-[4px]'}
                    `} onContextMenu={isSelecting ? undefined : handleMediaContextMenu}>

                        {message.parentMessage && (
                            <div className="mb-1.5 px-2 py-1 bg-black/15 border-l-2 border-white/80 rounded-r cursor-pointer hover:bg-black/25 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const rid =
                                        message.parent_id ?? message.parentId ?? message.parentMessage?.id;
                                    if (rid) onReplyClick?.(String(rid));
                                }}>
                                <p className="text-[13px] font-medium text-white/90 truncate">
                                    {message.parentMessage.sender === (isOwn ? 'me' : 'them') ? t('me') : (message.parentMessage.senderName || t('interlocutor'))}
                                </p>
                                <p className="text-[13px] text-white/70 truncate">
                                    {parentPreviewType === 'text'
                                        ? message.parentMessage.text
                                        : parentPreviewType === 'image'
                                          ? `🖼 ${t('image')}`
                                          : parentPreviewType === 'video'
                                            ? `🎥 ${t('video')}`
                                            : parentPreviewType === 'voice'
                                              ? `🎤 ${t('voice_message')}`
                                              : parentPreviewType === 'sticker'
                                                ? `✨ ${t('sticker') || 'Sticker'}`
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
                                    className="image-wrapper relative group/img cursor-pointer min-h-[80px]"
                                    onClick={() => onMediaClick?.(mediaSrc, 'image')}
                                >
                                    {!mediaLoaded && (
                                        <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/20 min-h-[120px]">
                                            <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />
                                        </div>
                                    )}
                                    {mediaSrc ? (
                                        <img
                                            src={mediaSrc}
                                            alt=""
                                            className="bg-white/5"
                                            decoding="async"
                                            onLoad={(e) => { setMediaLoaded(true); onImageLoad?.(e); }}
                                            onError={() => setMediaLoaded(true)}
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
                        ) : isMusic ? (
                            <div className="message-bubble-body flex items-center gap-3 w-full py-1 px-0.5 min-w-[240px]">
                                <button
                                    type="button"
                                    onClick={handlePlayPause}
                                    className={`relative w-12 h-12 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-colors ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-[#8774e1] hover:bg-[#7b68d9] text-white'}`}
                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                >
                                    {isPlaying && songDur > 0 && (
                                        <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                                            <circle cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
                                            <circle
                                                cx="24" cy="24" r="22" fill="none" stroke="currentColor" strokeWidth="2.5"
                                                strokeDasharray={`${2 * Math.PI * 22}`}
                                                strokeDashoffset={`${2 * Math.PI * 22 * (1 - songTime / songDur)}`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    )}
                                    {isPlaying ? (
                                        <svg className="h-5 w-5 relative" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    ) : (
                                        <svg className="h-6 w-6 ml-0.5 relative" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    )}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[16px] leading-[21px] font-medium text-white truncate">{musicTitle}</p>
                                    <p className={`text-[14px] leading-[18px] truncate ${isOwn ? 'text-white/70' : 'text-[#aaaaaa]'}`}>
                                        {formatDuration(isPlaying ? songTime : songDur)}
                                        {typeof fileMeta.size === 'number' && fileMeta.size > 0 ? ` • ${formatFileSize(fileMeta.size)}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); void handleDownload(); }}
                                    className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isOwn ? 'text-white/80 hover:bg-white/10' : 'text-[#aaaaaa] hover:bg-white/10'}`}
                                    title={t('save') as string}
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                            </div>
                        ) : isVoiceBubble ? (
                            <div className="message-bubble-body flex items-center gap-3 w-full py-1.5 px-0.5 min-w-[200px]">
                                <button
                                    type="button"
                                    onClick={handlePlayPause}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 active:scale-95 transition-colors ${isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-[#8774e1] hover:bg-[#7b68d9]'}`}
                                >
                                    {isPlaying ? (
                                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                                    ) : (
                                        <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    )}
                                </button>
                                <div className="flex-1 min-w-0 flex flex-col justify-center pr-10">
                                    <div className="flex items-end gap-[2px] h-[22px] cursor-pointer" onClick={handleProgressClick}>
                                        {Array.from({ length: 28 }, (_, i) => {
                                            const seed = (message.id.charCodeAt(i % message.id.length) || 7) + i * 13;
                                            const h = 4 + (seed % 18);
                                            const filled = duration ? (i / 28) <= (currentTime / duration) : false;
                                            const active = !isPlaying || filled;
                                            return (
                                                <span
                                                    key={i}
                                                    className={`w-[3px] rounded-full ${active ? (isOwn ? 'bg-white/90' : 'bg-[#8774e1]') : (isOwn ? 'bg-white/30' : 'bg-white/25')}`}
                                                    style={{ height: `${h}px` }}
                                                />
                                            );
                                        })}
                                    </div>
                                    <span className="text-[12px] mt-0.5 tabular-nums text-white/70">
                                        {formatDuration(isPlaying ? currentTime : duration)}
                                    </span>
                                </div>
                                <audio preload="metadata" ref={audioRef} src={mediaSrc || undefined} className="hidden" />
                            </div>
                        ) : messageType === 'file' || kind === 'file' ? (
                            <div className="message-bubble-body flex items-center gap-4 w-full py-2 px-1 min-w-0 cursor-pointer group/file" onClick={() => {
                                if (!message.isUploading) {
                                    void handleDownload();
                                }
                            }}>
                                <div className={`w-12 h-12 rounded-2xl border border-white/5 transition-colors flex items-center justify-center relative ${
                                    fileTone === 'pdf'
                                        ? 'bg-red-500/20 text-red-300 group-hover/file:bg-red-500/30'
                                        : fileTone === 'doc'
                                            ? 'bg-sky-500/20 text-sky-300 group-hover/file:bg-sky-500/30'
                                            : fileTone === 'sheet'
                                                ? 'bg-emerald-500/20 text-emerald-300 group-hover/file:bg-emerald-500/30'
                                                : fileTone === 'archive'
                                                    ? 'bg-amber-500/20 text-amber-300 group-hover/file:bg-amber-500/30'
                                                    : 'bg-white/10 text-blue-400 group-hover/file:bg-blue-500/20'
                                }`}>
                                    <span className="text-[10px] font-black tracking-wide">{fileKind}</span>
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
                                            {t('save')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="message-bubble-body flex flex-col gap-0.5 w-full min-w-0">
                                <p className="pr-12 text-[16px] leading-[21px]">{renderText()}</p>
                            </div>
                        )}
                    <div className={`absolute bottom-[3px] right-[6px] flex items-center gap-0.5 ${messageType === 'image' || messageType === 'video' ? 'rounded px-1 bg-black/35' : ''}`}>
                        {message.e2e && (
                            <svg className="h-2.5 w-2.5 text-white/70" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                <path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 016 0v3H9z" />
                            </svg>
                        )}
                        <span className={`text-[11px] leading-4 ${isOwn ? 'text-white/80' : 'text-[#aaaaaa]'}`}>{displayTime}</span>
                        {isOwn && (
                            message.isPending ? (
                                <svg className="h-3.5 w-3.5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : message.is_read ? (
                                <svg className="h-4 w-4 text-white" viewBox="0 0 18 18" fill="none">
                                    <path d="M3.5 9.5l3 3 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M7 12.5l7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                <svg className="h-4 w-4 text-white/85" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" />
                                </svg>
                            )
                        )}
                    </div>
                    </div>
                    )}
                </div>
            </div>

            {contextMenu && (
                <MediaContextMenu
                    x={contextMenu.x} y={contextMenu.y}
                    message={message}
                    isOwn={isOwn}
                    onClose={() => setContextMenu(null)}
                    onReply={() => onReply?.(message)}
                    onEdit={() => onEdit?.(message)}
                    onForward={() => onForward?.(message)}
                    onDelete={() => onDelete?.(message)}
                    onSelect={onSelect}
                    onPin={() => onPin?.(message)}
                />
            )}
        </div>
    );
};


