"use client";

import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { apiFetch } from "@/lib/api";
import {
    useLocalParticipant,
    useRemoteParticipants,
    useTracks,
    useConnectionState,
} from "@livekit/components-react";
import { Track, ConnectionState } from "livekit-client";
import { LiveVideoFrame } from "../shared/LiveVideoFrame";
import RecordingPlaybackModal from "../shared/RecordingPlaybackModal";
import {
    FileText,
    Video as VideoIcon,
    Link as LinkIcon,
    Mic,
    Camera,
    Circle,
    Volume2,
    Edit2,
    MessageSquare,
    Send,
    Plus,
    Users,
    User,
    Monitor,
    Clock,
    Signal,
    Bell,
    Check,
    CheckCircle,
    Upload,
    ClipboardList,
    BookOpen,
    HelpCircle,
    AlignLeft,
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    UserPlus,
    MicOff,
    VideoOff,
    MonitorUp,
    LogOut,
    Settings,
    Maximize2,
    PenTool,
    MonitorOff,
    Trash2,
    Globe,
    ExternalLink,
    History,
    Phone,
} from "lucide-react";
import { getConsultPanelInviteSessionStyle } from "@/lib/expert-roles";
import { isExpertListingChat } from "@/lib/listing-chat";
import { getExpertComplianceNotice } from "@/lib/expert-compliance-copy";
import { getPublicApiUrl } from "@/lib/public-origin";
import { useLanguage } from "@/context/LanguageContext";
import { TabItem } from "./TabItem";
import DashboardQuizModal from "./DashboardQuizModal";
import DashboardTopBar from "./DashboardTopBar";
import {
    stripHtmlLite,
    flattenDdgRelatedTopics,
    formatMaliUi,
    type ConsultChatFinancialPrep,
} from "./specialistHelpers";

/** Huquqshunos chap panel: sudrab kengaytirish */
const CONSULT_LEFT_PANEL_MIN_PX = 220;
const CONSULT_LEFT_PANEL_MAX_PX = 640;
const CONSULT_LEFT_PANEL_DEFAULT_PX = 288;
export function DashboardContent({
    user, sessionId, socket, onBack,
    isLessonStarted, setIsLessonStarted, handleStartLesson,
    showStartLessonModal, setShowStartLessonModal,
    lessonPickGroupId, setLessonPickGroupId,
    executeLessonStart,
    activeTab, setActiveTab,
    sessionNotes, setSessionNotes,
    savingNote,
    chatInput, setChatInput,
    materials, setMaterials,
    isUploading, setIsUploading,
    fileInputRef,
    quizzes, setQuizzes,
    activeQuiz, setActiveQuiz,
    quizResults, setQuizResults,
    quickPollStats,
    handsRaised, setHandsRaised,
    isCreatingQuiz, setIsCreatingQuiz,
    newQuizTitle, setNewQuizTitle,
    newQuestions, setNewQuestions,
    sessionNoticeToasts,
    chatMessages, setChatMessages,
    isMicOn, setIsMicOn,
    isCamOn, setIsCamOn,
    isScreenSharing, setIsScreenSharing,
    isRecording, setIsRecording,
    isUploadingRecording,
    recordingUploadError,
    retryRecordingUpload,
    dismissRecordingUploadError,
    handleGroupSelectChange,
    mentorNoGroupsHint,
    mentorNeedsRealRoomHint,
    isWhiteboardOpen, setIsWhiteboardOpen,
    isSettingsOpen, setIsSettingsOpen,
    pastSessions, setPastSessions,
    playbackSession, setPlaybackSession,
    attendees, setAttendees,
    handleCreateQuiz,
    handleBroadcastQuiz,
    handleDeleteQuiz,
    handleQuickPoll,
    handleFileUpload,
    handleEndSession,
    handleToggleScreenShare,
    handleToggleWhiteboard,
    handleToggleRecording,
    handleForceMuteStudent,
    handleRequestStudentUnmute,
    handleMentorDismissHand,
    handleRemoveStudent,
    handleSendMessage,
    handleSaveNote,
    handleCreateGroup,
    groups, setGroups,
    selectedGroupId, setSelectedGroupId,
    showNewGroupPrompt, setShowNewGroupPrompt,
    newGroupName, setNewGroupName,
    newGroupTime, setNewGroupTime,
    getAvatarUrl,
    expertPanelMode,
    panelLabels,
    showMentorClassroomTools,
    endSessionButtonLabel,
    activeRoomSelectLabel,
    waitAttendeesEmpty,
    participantFallback,
    kickParticipantTitle,
    historySectionTitle,
    historyEmptyHint,
    historyRecordingFallbackTitle,
    lessonPickModalTitle,
    lessonPickModalHint,
    sessionResourcesNote,
    onConsultSessionChat,
    onConsultClientEnded,
}: any) {
    const { t, tLines, language } = useLanguage();
    const { showSuccess, showError } = useNotification();
    const { confirm: notifyConfirm } = useConfirm();
    const expertComplianceBlock = getExpertComplianceNotice(expertPanelMode, 'expert', t, tLines);
    const complianceNoticeStorageKey =
        expertComplianceBlock != null ? `expert_compliance_notice_v1_${expertPanelMode}` : '';
    const [complianceNoticeDismissed, setComplianceNoticeDismissed] = React.useState(false);

    React.useLayoutEffect(() => {
        if (!complianceNoticeStorageKey) {
            setComplianceNoticeDismissed(false);
            return;
        }
        try {
            setComplianceNoticeDismissed(
                typeof window !== 'undefined' &&
                window.localStorage.getItem(complianceNoticeStorageKey) === '1'
            );
        } catch {
            setComplianceNoticeDismissed(false);
        }
    }, [complianceNoticeStorageKey]);

    const dismissExpertComplianceNotice = React.useCallback(() => {
        setComplianceNoticeDismissed(true);
        try {
            if (complianceNoticeStorageKey && typeof window !== 'undefined') {
                window.localStorage.setItem(complianceNoticeStorageKey, '1');
            }
        } catch {
            /* ignore */
        }
    }, [complianceNoticeStorageKey]);

    const sessionTimerHeading = showMentorClassroomTools
        ? t('session_timer_label_mentor')
        : panelLabels.sessionTimerLabel || t('session_timer_label_general');
    const manageSessionSectionTitle = panelLabels.manageSessionTitle || t('manage_session_title_general');
    const mentorRoomReady = Boolean(
        selectedGroupId && String(selectedGroupId) !== 'demo-session-id'
    );
    const { localParticipant } = useLocalParticipant();
    const roomRemoteParticipants = useRemoteParticipants();
    const lkVideoRoomPeerCount = roomRemoteParticipants.length;
    const chatScrollRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const id = requestAnimationFrame(() => {
            const el = chatScrollRef.current;
            if (!el) return;
            el.scrollTop = el.scrollHeight;
        });
        return () => cancelAnimationFrame(id);
    }, [chatMessages]);

    const [sessionElapsedSec, setSessionElapsedSec] = React.useState(0);
    React.useEffect(() => {
        if (!isLessonStarted) {
            setSessionElapsedSec(0);
            return;
        }
        const t0 = Date.now();
        const id = window.setInterval(() => {
            setSessionElapsedSec(Math.floor((Date.now() - t0) / 1000));
        }, 1000);
        return () => window.clearInterval(id);
    }, [isLessonStarted]);
    const sessionTimeDisplay = isLessonStarted
        ? `${String(Math.floor(sessionElapsedSec / 60)).padStart(2, '0')}:${String(sessionElapsedSec % 60).padStart(2, '0')}`
        : '00:00';

    const [mentorRightPanelOpen, setMentorRightPanelOpen] = React.useState(true);
    /** Konsultatsiya / huquqshunos: o‘ng hujjatlar paneli (mentor `mentorRightPanelOpen` bilan alohida) */
    const [consultRightPanelOpen, setConsultRightPanelOpen] = React.useState(true);
    const [consultLeftPanelOpen, setConsultLeftPanelOpen] = React.useState(true);
    const [consultLeftPanelWidthPx, setConsultLeftPanelWidthPx] = React.useState(CONSULT_LEFT_PANEL_DEFAULT_PX);
    const consultLeftDragRef = React.useRef<{ active: boolean; startX: number; startW: number }>({
        active: false,
        startX: 0,
        startW: CONSULT_LEFT_PANEL_DEFAULT_PX,
    });
    const consultLeftWidthLiveRef = React.useRef(CONSULT_LEFT_PANEL_DEFAULT_PX);
    consultLeftWidthLiveRef.current = consultLeftPanelWidthPx;

    React.useEffect(() => {
        setMentorRightPanelOpen(true);
        setConsultRightPanelOpen(true);
        setConsultLeftPanelOpen(true);
    }, [selectedGroupId]);

    const materialsSidePanelOpen = showMentorClassroomTools ? mentorRightPanelOpen : consultRightPanelOpen;
    const rightPanelOpenWidthClass = showMentorClassroomTools
        ? 'w-64 max-w-[16rem]'
        : expertPanelMode === 'legal'
            ? 'w-80 max-w-[20rem]'
            : 'w-72 max-w-[18rem]';

    /** Konsultatsiya chap panel: qidiruv (DDG API) yoki chatdagi mijozlar */
    const [consultSideTab, setConsultSideTab] = useState<'search' | 'clients'>('clients');
    const [consultSearchInput, setConsultSearchInput] = useState('');

    const [consultSearchLoading, setConsultSearchLoading] = useState(false);
    const [consultDdgResult, setConsultDdgResult] = useState<any>(null);
    const [consultSearchError, setConsultSearchError] = useState<string | null>(null);
    const [consultClientChats, setConsultClientChats] = useState<any[]>([]);
    const [consultClientsLoading, setConsultClientsLoading] = useState(false);
    const [consultAcceptSendingId, setConsultAcceptSendingId] = useState<string | null>(null);
    const [consultAcceptModal, setConsultAcceptModal] = React.useState<{
        chatId: string;
        displayName: string;
        loading: boolean;
        error: string | null;
        prep: ConsultChatFinancialPrep | null;
    } | null>(null);

    const sendConsultAcceptNotice = useCallback(
        async (chatId: string, isPaymentRequest = false) => {
            const id = String(chatId || '').trim();
            if (!id) return;
            const expertName =
                [user?.name, user?.surname].filter(Boolean).join(' ').trim() ||
                user?.name ||
                t('expert_role_consult');
            setConsultAcceptSendingId(id);
            try {
                /** HTTP asosiy yo‘l — Socket CORS uzilsa ham xabar DB ga yoziladi */
                const res = await apiFetch('/api/specialists/consult/panel-invite', {
                    method: 'POST',
                    body: JSON.stringify({
                        chatId: id,
                        expertName,
                        sessionStyle: getConsultPanelInviteSessionStyle(expertPanelMode),
                        isPaymentRequest,
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    showError(data?.message || t('network_error'));
                    return;
                }
                showSuccess(t('invite_sent_success'));
                onConsultSessionChat?.(id);
            } catch (e) {
                console.error('consult_panel_invite', e);
                showError(t('network_error'));
            } finally {
                window.setTimeout(() => setConsultAcceptSendingId((cur) => (cur === id ? null : cur)), 800);
            }
        },
        [onConsultSessionChat, user?.name, user?.surname, expertPanelMode, showError, showSuccess, t]
    );

    const openConsultAcceptFinancialModal = useCallback(
        async (chatId: string, displayName: string) => {
            const id = String(chatId || '').trim();
            if (!id) return;
            setConsultAcceptModal({
                chatId: id,
                displayName,
                loading: true,
                error: null,
                prep: null,
            });
            try {
                const res = await apiFetch(
                    `/api/specialists/consult/chat-financial-prep?chatId=${encodeURIComponent(id)}`
                );
                const data = (await res.json().catch(() => ({}))) as ConsultChatFinancialPrep & { message?: string };
                if (!res.ok) {
                    setConsultAcceptModal((m) =>
                        m && m.chatId === id
                            ? {
                                ...m,
                                loading: false,
                                error: data?.message || `${t('check_failed_prefix')} (${res.status})`,
                            }
                            : m
                    );
                    return;
                }
                setConsultAcceptModal((m) =>
                    m && m.chatId === id
                        ? {
                            ...m,
                            loading: false,
                            prep: {
                                clientUserId: String(data.clientUserId || ''),
                                clientName: data.clientName ?? null,
                                clientLockedBalance: Number(data.clientLockedBalance) || 0,
                                expertServicePrice:
                                    data.expertServicePrice != null ? Number(data.expertServicePrice) : null,
                                session: data.session
                                    ? {
                                        id: String(data.session.id),
                                        status: String(data.session.status),
                                        amountMali: Number(data.session.amountMali) || 0,
                                    }
                                    : null,
                            },
                        }
                        : m
                );
            } catch {
                setConsultAcceptModal((m) =>
                    m && m.chatId === id ? { ...m, loading: false, error: t('network_error_retry') } : m
                );
            }
        },
        []
    );

    const finishConsultWithClient = useCallback(
        async (chatId: string) => {
            const id = String(chatId || '').trim();
            if (!id) return;
            const ok = await notifyConfirm({
                title: t('finish_session_title'),
                description: panelLabels.consultFinishConfirm || t('finish_session_fallback_hint'),
                variant: 'danger',
                confirmLabel: t('finish_btn')
            });
            if (!ok) return;
            try {
                setConsultClientChats((prev: any[]) =>
                    prev.filter((c) => String(c.id || c._id) !== id)
                );
                if (String(selectedGroupId) === id) {
                    setIsLessonStarted(false);
                    const fallback = String(sessionId || '').trim();
                    if (fallback) setSelectedGroupId(fallback);
                }

                /** Chat o‘chirilmaydi — faqat sessiya tugaganini signal beramiz. */
                const expertName =
                    [user?.name, user?.surname].filter(Boolean).join(' ').trim() ||
                    user?.name ||
                    t('expert_role_consult');
                if (socket) {
                    socket.emit('lesson_end', {
                        sessionId: id,
                        mentorName: expertName,
                        sessionStyle: 'consult',
                    });
                }

                onConsultClientEnded?.(id);
            } catch (e) {
                console.error(e);
                showError(t('finish_error'));
            }
        },
        [
            selectedGroupId,
            sessionId,
            setSelectedGroupId,
            setIsLessonStarted,
            onConsultClientEnded,
            panelLabels.consultFinishConfirm,
            socket,
            user?.name,
            user?.surname,
            notifyConfirm,
            showError,
        ]
    );

    const buildConsultNewTabUrl = useCallback((query: string) => {
        const q = query.trim();
        if (!q) return '';
        return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
    }, []);

    React.useEffect(() => {
        try {
            const raw = sessionStorage.getItem('consult_left_panel_w');
            const v = raw ? parseInt(raw, 10) : NaN;
            if (Number.isFinite(v) && v >= CONSULT_LEFT_PANEL_MIN_PX && v <= CONSULT_LEFT_PANEL_MAX_PX) {
                setConsultLeftPanelWidthPx(v);
            }
        } catch {
            /* ignore */
        }
    }, []);

    React.useEffect(() => {
        const onMove = (e: MouseEvent) => {
            const d = consultLeftDragRef.current;
            if (!d.active) return;
            const dx = e.clientX - d.startX;
            let w = d.startW + dx;
            w = Math.min(CONSULT_LEFT_PANEL_MAX_PX, Math.max(CONSULT_LEFT_PANEL_MIN_PX, w));
            setConsultLeftPanelWidthPx(w);
        };
        const onUp = () => {
            const d = consultLeftDragRef.current;
            if (!d.active) return;
            d.active = false;
            try {
                sessionStorage.setItem('consult_left_panel_w', String(consultLeftWidthLiveRef.current));
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const runConsultSearch = useCallback(async () => {
        const q = consultSearchInput.trim();
        if (!q) {
            setConsultDdgResult(null);
            setConsultSearchError(null);
            return;
        }
        setConsultSearchLoading(true);
        setConsultSearchError(null);
        setConsultDdgResult(null);
        try {
            const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
            const res = await fetch(
                `${apiBase}/api/consult-search?q=${encodeURIComponent(q)}`
            );
            const data = await res.json();
            if (!res.ok) {
                setConsultSearchError(
                    typeof data?.error === 'string'
                        ? data.error
                        : t('search_failed_error')
                );
                setConsultDdgResult(null);
                return;
            }
            setConsultDdgResult(data);
        } catch {
            setConsultSearchError(t('search_failed_error'));
            setConsultDdgResult(null);
        } finally {
            setConsultSearchLoading(false);
        }
    }, [consultSearchInput]);

    const openConsultSearchInNewTab = useCallback(() => {
        const url = buildConsultNewTabUrl(consultSearchInput);
        if (!url) return;
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [buildConsultNewTabUrl, consultSearchInput]);

    React.useEffect(() => {
        if (showMentorClassroomTools || consultSideTab !== 'clients') return;
        let cancelled = false;
        (async () => {
            setConsultClientsLoading(true);
            try {
                const res = await apiFetch('/api/chats?refresh=1');
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (!Array.isArray(data) || cancelled) return;
                let priv = data.filter(
                    (c: any) => (c.type === 'private' || !c.type) && c.otherUser?.id
                );
                if (expertPanelMode === 'legal') {
                    priv = priv.filter((c: any) => isExpertListingChat(c));
                }
                setConsultClientChats(priv);
            } catch {
                if (!cancelled) setConsultClientChats([]);
            } finally {
                if (!cancelled) setConsultClientsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [showMentorClassroomTools, consultSideTab, expertPanelMode]);
    const connectionState = useConnectionState();
    const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare]);
    const remoteParticipants = tracks.filter(t => !t.participant.isLocal);
    const localVideoTrack = tracks.find(t => t.participant.isLocal && t.source === Track.Source.Camera);

    // Auto-enable media once connected with a slight delay to ensure engine stability
    React.useEffect(() => {
        if (connectionState === ConnectionState.Connected) {
            const timer = setTimeout(() => {
                setIsMicOn(true);
                setIsCamOn(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [connectionState]);

    // Sync hardware state with UI state - Only when connected to avoid timeout/engine-not-ready
    React.useEffect(() => {
        if (localParticipant && connectionState === ConnectionState.Connected) {
            localParticipant.setMicrophoneEnabled(isMicOn).catch(err => {
                console.warn("Manual microphone sync failed:", err);
            });
        }
    }, [isMicOn, localParticipant, connectionState]);

    React.useEffect(() => {
        if (localParticipant && connectionState === ConnectionState.Connected) {
            localParticipant.setCameraEnabled(isCamOn).catch(err => {
                console.warn("Manual camera sync failed:", err);
            });
        }
    }, [isCamOn, localParticipant, connectionState]);

    // Override toggle handlers to directly call LiveKit API
    const handleLocalToggleMic = async () => {
        if (!localParticipant) return;
        const next = !isMicOn;
        try {
            await localParticipant.setMicrophoneEnabled(next);
            setIsMicOn(next);
            if (socket && selectedGroupId && String(selectedGroupId) !== 'demo-session-id') {
                socket.emit('media_state_change', { sessionId: selectedGroupId, type: 'audio', enabled: next });
            }
        } catch (e) {
            console.error('Mic toggle failed:', e);
        }
    };

    const handleLocalToggleCam = async () => {
        if (!localParticipant) return;
        const next = !isCamOn;
        try {
            await localParticipant.setCameraEnabled(next);
            setIsCamOn(next);
            if (socket && selectedGroupId && String(selectedGroupId) !== 'demo-session-id') {
                socket.emit('media_state_change', { sessionId: selectedGroupId, type: 'video', enabled: next });
            }
        } catch (e) {
            console.error('Camera toggle failed:', e);
        }
    };

    const mentorMediaUiRef = React.useRef({ mic: isMicOn, cam: isCamOn });
    mentorMediaUiRef.current = { mic: isMicOn, cam: isCamOn };

    /** Talabaga boshlang‘ich mikrofon/kamera holati (LiveKit avtouloqdan keyin) */
    React.useEffect(() => {
        if (connectionState !== ConnectionState.Connected || !socket || !selectedGroupId || String(selectedGroupId) === 'demo-session-id') {
            return;
        }
        const rid = String(selectedGroupId);
        const initTimer = window.setTimeout(() => {
            const { mic, cam } = mentorMediaUiRef.current;
            socket.emit('media_state_change', { sessionId: rid, type: 'audio', enabled: mic });
            socket.emit('media_state_change', { sessionId: rid, type: 'video', enabled: cam });
        }, 1500);
        return () => window.clearTimeout(initTimer);
    }, [connectionState, socket, selectedGroupId]);

    React.useEffect(() => {
        if (localParticipant && connectionState === ConnectionState.Connected) {
            localParticipant.setScreenShareEnabled(isScreenSharing).catch(err => {
                console.warn("Manual screen sharing sync failed:", err);
                setIsScreenSharing(false);
            });
        }
    }, [isScreenSharing, localParticipant, connectionState]);

    return (
        <div className="mentor-dashboard relative flex flex-col h-full min-h-0 text-slate-200 font-sans overflow-hidden bg-white/[0.02] backdrop-blur-[2px]">
            {/* Orqa fon (sahifa gradienti) ustida yengil shaffof qatlam */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-indigo-950/25 via-slate-900/20 to-cyan-950/15" />
            {/* Yengil grid texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />

            {Array.isArray(sessionNoticeToasts) && sessionNoticeToasts.length > 0 ? (
                <div className="relative z-[120] flex flex-col gap-2 px-3 mt-2 pointer-events-none">
                    {sessionNoticeToasts.map((t) => (
                        <div
                            key={t.id}
                            className="rounded-xl border border-emerald-500/35 bg-emerald-950/85 px-3 py-2 text-[11px] font-semibold text-emerald-50 shadow-lg backdrop-blur-sm"
                        >
                            {t.text}
                        </div>
                    ))}
                </div>
            ) : null}

            {expertComplianceBlock && !complianceNoticeDismissed && (
                <div className="relative z-10 shrink-0 mx-3 mt-2 rounded-xl border border-amber-400/35 bg-amber-500/[0.12] px-3 py-2.5 text-[11px] text-amber-50/95 leading-snug flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-amber-100 mb-1">{expertComplianceBlock.title}</p>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-50/90">
                            {expertComplianceBlock.lines.map((ln, i) => (
                                <li key={i}>{ln}</li>
                            ))}
                        </ul>
                    </div>
                    <button
                        type="button"
                        onClick={dismissExpertComplianceNotice}
                        className="shrink-0 self-stretch sm:self-center rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/45 px-3 py-2 text-[10px] font-bold text-amber-50 tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                    >
                        {t('i_have_read')}
                    </button>
                </div>
            )}

            {recordingUploadError && (
                <div className="relative z-10 shrink-0 mx-3 mt-2 rounded-xl border border-red-500/40 bg-red-950/40 px-3 py-2.5 text-[11px] text-red-100/95 leading-snug flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold min-w-0 flex-1">
                        <span className="text-red-300 font-black uppercase tracking-wider mr-2">{t('upload_error_label')}</span>
                        {recordingUploadError}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => void retryRecordingUpload()}
                            disabled={isUploadingRecording}
                            className="px-3 py-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/45 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-50"
                        >
                            {t('retry_btn')}
                        </button>
                        <button
                            type="button"
                            onClick={dismissRecordingUploadError}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-bold"
                        >
                            {t('cancel_btn')}
                        </button>
                    </div>
                </div>
            )}

            {mentorNoGroupsHint && (
                <div className="relative z-10 shrink-0 mx-3 mt-2 rounded-xl border border-cyan-500/30 bg-cyan-950/25 px-3 py-2 text-[11px] text-cyan-50/90 leading-snug">
                    <span className="font-bold text-cyan-200">{t('mentor_mode_label')}: </span>
                    {t('no_groups_hint')}
                </div>
            )}
            {!mentorNoGroupsHint && mentorNeedsRealRoomHint && (
                <div className="relative z-10 shrink-0 mx-3 mt-2 rounded-xl border border-indigo-500/35 bg-indigo-950/30 px-3 py-2 text-[11px] text-indigo-50/90 leading-snug">
                    <span className="font-bold text-indigo-200">{t('select_group_label')}: </span>
                    {t('select_real_group_hint')}
                </div>
            )}

            <DashboardTopBar
                t={t}
                onBack={onBack}
                user={user}
                getAvatarUrl={getAvatarUrl}
                panelHeader={panelLabels.header}
                sessionTimerHeading={sessionTimerHeading}
                sessionTimeDisplay={sessionTimeDisplay}
                isLessonStarted={isLessonStarted}
                attendeesCount={attendees.length}
                lkVideoRoomPeerCount={lkVideoRoomPeerCount}
                isRecording={isRecording}
                isUploadingRecording={isUploadingRecording}
                recordingUploadError={recordingUploadError}
            />

            {/* ─── MAIN CONTENT ─── */}
            <div className="flex-1 flex overflow-hidden">



                {/* ═══ LEFT PANEL ═══ */}
                <div
                    className={`relative z-10 flex flex-col mentor-glass-surface overflow-hidden shadow-2xl shadow-black/25 transition-[width,max-width,opacity] duration-300 ease-out ${showMentorClassroomTools
                            ? 'w-72 shrink-0'
                            : consultLeftPanelOpen
                                ? `shrink-0 opacity-100 ${expertPanelMode === 'legal'
                                    ? 'border-r border-amber-500/20'
                                    : 'border-r border-white/10'
                                }`
                                : 'w-0 max-w-0 shrink-0 opacity-0 pointer-events-none border-r-0'
                        }`}
                    style={
                        !showMentorClassroomTools && consultLeftPanelOpen
                            ? { width: consultLeftPanelWidthPx, maxWidth: CONSULT_LEFT_PANEL_MAX_PX }
                            : undefined
                    }
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-indigo-500/[0.06] pointer-events-none" />
                    {/* Manage Session */}
                    <div className="relative px-4 pt-4 pb-2 flex items-center justify-between border-b border-white/5">
                        <span className="text-sm font-bold text-white uppercase tracking-widest opacity-80">{manageSessionSectionTitle}</span>
                        <div className="flex items-center gap-2">
                            {showMentorClassroomTools && (
                                <button
                                    onClick={() => setShowNewGroupPrompt(true)}
                                    className="text-slate-500 hover:text-white transition-colors"
                                    title={t('create_group') as string}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                            <button onClick={() => setIsSettingsOpen(true)} className="text-slate-500 hover:text-white transition-colors" title={t('settings_label')}>
                                <Settings className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {groups.length > 0 && (
                        <div className="relative px-4 pt-3 pb-1 border-b border-white/5">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{activeRoomSelectLabel}</label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => handleGroupSelectChange(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                            >
                                {groups.map((g: any) => (
                                    <option key={g.id || g.chatId} value={g.id || g.chatId}>
                                        {g.name || t('group_label')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {showMentorClassroomTools ? (
                        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
                            {/* Tabs for extra tools */}
                            <div className="flex border-b border-white/5 mx-2 mb-3 mt-2 shrink-0">
                                <TabItem
                                    active={activeTab === 'attendees'}
                                    onClick={() => setActiveTab('attendees')}
                                    icon={<Users className="w-4 h-4" />}
                                    label={t('attendees_label')}
                                />
                                <TabItem
                                    active={activeTab === 'materials'}
                                    onClick={() => setActiveTab('materials')}
                                    icon={<FileText className="w-4 h-4" />}
                                    label={t('materials_label')}
                                />
                                <TabItem
                                    active={activeTab === 'history'}
                                    onClick={() => setActiveTab('history')}
                                    icon={<History className="w-4 h-4" />}
                                    label={t('history_label')}
                                />
                            </div>
                            {activeTab === 'attendees' && (
                                <div className="flex flex-col flex-1 min-h-0">
                                    <div className="px-4 py-2 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5 mb-2">
                                        <span>{t('participants_count', { count: attendees.length })}</span>
                                    </div>

                                    {/* Attendees List */}
                                    <div className="px-3 space-y-2 overflow-y-auto no-scrollbar flex-1 min-h-0">
                                        {attendees.length === 0 ? (
                                            <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-20 border-2 border-dashed border-white/5 rounded-2xl mx-1">
                                                <Users className="w-8 h-8" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-center px-4">{waitAttendeesEmpty}</span>
                                            </div>
                                        ) : (
                                            attendees.map((student: any, i: number) => {
                                                const sid = String(student.id ?? '');
                                                const hasHand = Boolean(handsRaised?.[sid]);
                                                const lkParticipant = roomRemoteParticipants.find(
                                                    (p) => String(p.identity) === sid
                                                );
                                                const diceSeed = encodeURIComponent(String(student.name || student.id || 'user'));
                                                const primaryAvatar =
                                                    getAvatarUrl(student.avatar_url || student.avatar) ||
                                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${diceSeed}&backgroundColor=1e293b`;
                                                return (
                                                    <div key={student.id || i} className={`flex items-center justify-between py-2.5 px-3 rounded-xl transition-all group/item shadow-sm gap-2 ${showMentorClassroomTools && hasHand ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/5 border border-white/5 hover:bg-white/10'}`}>
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="relative shrink-0">
                                                                <div className="w-9 h-9 rounded-full bg-slate-700 overflow-hidden border border-white/10 shadow-inner">
                                                                    <img
                                                                        src={primaryAvatar}
                                                                        alt=""
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                                                            const el = e.currentTarget;
                                                                            el.onerror = null;
                                                                            el.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(sid || 'u')}&backgroundColor=1e293b`;
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161927] shadow-sm" />
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[11px] font-bold text-white truncate">
                                                                    {student.name?.trim() || `${participantFallback} ${String(student.id).slice(0, 8)}`}
                                                                </span>
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    {showMentorClassroomTools && hasHand ? (
                                                                        <span className="text-[8px] text-amber-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                                                            <span>✋</span> {t('hand_raised_label')}
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                                            <span className="text-[8px] text-green-400/70 font-bold uppercase tracking-widest">
                                                                                {expertPanelMode === 'mentor' ? t('in_lesson_label') : t('online_label')}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {lkParticipant ? (
                                                                        <span
                                                                            className="flex items-center gap-0.5"
                                                                            title={t('lk_media_title')}
                                                                        >
                                                                            {lkParticipant.isMicrophoneEnabled ? (
                                                                                <Mic className="w-3 h-3 text-emerald-400" aria-hidden />
                                                                            ) : (
                                                                                <MicOff className="w-3 h-3 text-slate-500" aria-hidden />
                                                                            )}
                                                                            {lkParticipant.isCameraEnabled ? (
                                                                                <VideoIcon className="w-3 h-3 text-emerald-400" aria-hidden />
                                                                            ) : (
                                                                                <VideoOff className="w-3 h-3 text-slate-500" aria-hidden />
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span
                                                                            className="text-[8px] text-slate-500 font-semibold"
                                                                            title={t('lk_not_joined_title')}
                                                                        >
                                                                            LK —
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {showMentorClassroomTools && hasHand ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMentorDismissHand(sid)}
                                                                    title={t('dismiss_hand_title')}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                                </button>
                                                            ) : null}
                                                            {lkParticipant?.isMicrophoneEnabled ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleForceMuteStudent(sid)}
                                                                    title={t('mute_student_title')}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                                >
                                                                    <MicOff className="w-3.5 h-3.5" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRequestStudentUnmute(sid)}
                                                                    title={
                                                                        lkParticipant
                                                                            ? t('unmute_student_title')
                                                                            : t('request_unmute_title')
                                                                    }
                                                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${lkParticipant
                                                                        ? 'bg-sky-500/10 text-sky-400 hover:bg-sky-500/20'
                                                                        : 'bg-slate-600/20 text-slate-500 hover:bg-slate-600/30'
                                                                        }`}
                                                                >
                                                                    <Mic className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveStudent(sid)}
                                                                title={kickParticipantTitle}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 transition-colors"
                                                            >
                                                                <LogOut className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}


                {/* MATERIALS tab */}
                {activeTab === 'materials' && (
                    <div className="flex flex-col flex-1 pb-4 animate-fade-in overflow-hidden">
                        {sessionResourcesNote && (
                            <div className="mx-3 mb-2 rounded-lg border border-sky-400/35 bg-sky-500/10 px-3 py-2 text-[10px] text-sky-100/95 leading-snug">
                                {sessionResourcesNote}
                            </div>
                        )}
                        {/* Upload Action */}
                        <div className="px-3 mb-3">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="w-full py-3 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                            >
                                {isUploading ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {isUploading ? t('uploading_label') : t('upload_material_label')}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <p className="mt-2 text-[9px] text-slate-500 text-center font-medium italic">
                                {showMentorClassroomTools
                                    ? t('material_upload_hint_mentor')
                                    : t('material_upload_hint_consult')}
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-2">
                            {materials.length === 0 ? (
                                <div className="py-8 flex flex-col items-center justify-center gap-3 opacity-20 border-2 border-dashed border-white/5 rounded-2xl">
                                    <FileText className="w-8 h-8" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">{t('no_materials_label')}</span>
                                </div>
                            ) : (
                                materials.map((mat: any) => {
                                    const isVideo = mat.file_type?.includes('video');
                                    const isImage = mat.file_type?.includes('image');
                                    const isPdf = mat.file_type?.includes('pdf');

                                    return (
                                        <div key={mat.id} className="group relative bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all p-3 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-inner ${isVideo ? 'bg-blue-500/20 text-blue-400' :
                                                    isImage ? 'bg-emerald-500/20 text-emerald-400' :
                                                        isPdf ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                    {isVideo ? <VideoIcon className="w-5 h-5" /> :
                                                        isImage ? <Camera className="w-5 h-5" /> :
                                                            <FileText className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] font-bold text-white truncate mb-0.5">{mat.title}</div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase">{mat.file_type?.split('/')[1] || 'FILE'}</span>
                                                        <span className="w-1 h-1 rounded-full bg-white/10" />
                                                        <div className="flex items-center gap-1 text-blue-400">
                                                            <Check className="w-2.5 h-2.5" />
                                                            <span className="text-[8px] font-black uppercase tracking-tighter">{t('shared_in_chat_label')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <a
                                                    href={`${getPublicApiUrl()}${mat.file_url.startsWith('/') ? '' : '/'}${mat.file_url}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white transition-all"
                                                >
                                                    <Maximize2 className="w-3.5 h-3.5" />
                                                </a>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}


                {/* HISTORY tab */}
                {activeTab === 'history' && (
                    <div className="flex-1 p-3 space-y-2 overflow-y-auto no-scrollbar">
                        <div className="text-xs font-bold text-slate-300 mb-2 px-1">{historySectionTitle}</div>
                        {pastSessions.length === 0 ? (
                            <div className="text-[10px] text-slate-500 italic px-1">{historyEmptyHint}</div>
                        ) : (
                            pastSessions.map((session: any) => (
                                <div key={session.id} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h4 className="text-xs font-bold text-white truncate">{session.title || historyRecordingFallbackTitle}</h4>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{new Date(session.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {session.recording_url && (
                                        <button
                                            onClick={() => setPlaybackSession(session)}
                                            className="w-full py-1.5 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <VideoIcon className="w-3 h-3" />
                                            {t('view_recording_btn')}
                                        </button>
                                    )}
                                    {!session.recording_url && (
                                        <div className="text-[9px] text-slate-500 italic flex items-center gap-1">
                                            <MonitorOff className="w-3 h-3" /> {t('no_recording_label')}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex border-b border-white/5 mx-2 mb-2 mt-2 shrink-0 gap-1">
                    <button
                        type="button"
                        onClick={() => setConsultSideTab('search')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-t-lg text-[10px] font-black uppercase tracking-wider transition-all ${consultSideTab === 'search'
                                ? 'text-white border-b-2 border-cyan-400 bg-white/5'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <Globe className="w-3.5 h-3.5 opacity-90" />
                        {t('search_tab_label')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setConsultSideTab('clients')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-t-lg text-[10px] font-black uppercase tracking-wider transition-all ${consultSideTab === 'clients'
                                ? 'text-white border-b-2 border-blue-500 bg-white/5'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                            }`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {t('clients_tab_label')}
                    </button>
                </div>
                {consultSideTab === 'search' && (
                    <div className="flex-1 flex flex-col min-h-0 px-2 pb-3 gap-2">
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <input
                                type="search"
                                value={consultSearchInput}
                                onChange={(e) => setConsultSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') runConsultSearch();
                                }}
                                placeholder={`${t('search_internet_label')}...`}
                                className="flex-1 min-w-[100px] rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                            />
                            <button
                                type="button"
                                onClick={runConsultSearch}
                                className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-2.5 py-1.5 text-[10px] font-bold text-white"
                            >
                                {t('search_btn')}
                            </button>
                            <button
                                type="button"
                                onClick={openConsultSearchInNewTab}
                                disabled={!consultSearchInput.trim()}
                                className="p-1.5 rounded-lg border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40"
                                title={t('open_in_new_tab')}
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <p className="text-[8px] text-slate-500 leading-snug px-0.5 shrink-0">
                            {t('search_disclaimer')}
                        </p>
                        <div className="flex-1 min-h-[160px] overflow-y-auto custom-scrollbar rounded-lg border border-white/10 bg-[#0a0c12]/90 p-2.5 space-y-2.5">
                            {consultSearchLoading ? (
                                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                                    <div className="w-7 h-7 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                                    <span className="text-[10px] font-semibold">{t('searching_label')}</span>
                                </div>
                            ) : consultSearchError ? (
                                <div className="text-[11px] text-amber-200/90 leading-snug">{consultSearchError}</div>
                            ) : consultDdgResult ? (
                                <>
                                    {consultDdgResult.Redirect ? (
                                        <a
                                            href={String(consultDdgResult.Redirect)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-[11px] font-bold text-cyan-300 hover:underline break-all"
                                        >
                                            {String(consultDdgResult.Redirect)}
                                        </a>
                                    ) : null}
                                    {consultDdgResult.Heading ? (
                                        <h3 className="text-xs font-bold text-white leading-snug">
                                            {stripHtmlLite(String(consultDdgResult.Heading))}
                                        </h3>
                                    ) : null}
                                    {consultDdgResult.Answer ? (
                                        <p className="text-[11px] text-sky-100/95 leading-relaxed">
                                            {stripHtmlLite(String(consultDdgResult.Answer))}
                                        </p>
                                    ) : null}
                                    {consultDdgResult.AbstractText ? (
                                        <p className="text-[11px] text-white/88 leading-relaxed">
                                            {stripHtmlLite(String(consultDdgResult.AbstractText))}
                                        </p>
                                    ) : null}
                                    {consultDdgResult.AbstractURL ? (
                                        <a
                                            href={String(consultDdgResult.AbstractURL)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
                                        >
                                            <LinkIcon className="w-3 h-3" />
                                            {t('go_to_source_label')}
                                        </a>
                                    ) : null}
                                    {flattenDdgRelatedTopics(consultDdgResult.RelatedTopics).length > 0 ? (
                                        <div className="pt-1 border-t border-white/10 space-y-1.5">
                                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                                                {t('related_links_label')}
                                            </div>
                                            <ul className="space-y-1.5">
                                                {flattenDdgRelatedTopics(consultDdgResult.RelatedTopics).map(
                                                    (item, idx) => (
                                                        <li key={`${item.url}-${idx}`}>
                                                            <a
                                                                href={item.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-[10px] text-cyan-200/90 hover:text-cyan-100 leading-snug block [overflow-wrap:anywhere]"
                                                            >
                                                                {item.title}
                                                            </a>
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    ) : null}
                                    {!consultDdgResult.AbstractText &&
                                        !consultDdgResult.Answer &&
                                        !consultDdgResult.Redirect &&
                                        flattenDdgRelatedTopics(consultDdgResult.RelatedTopics).length === 0 ? (
                                        <p className="text-[10px] text-slate-500 leading-relaxed">
                                            {t('no_search_results_label')}
                                        </p>
                                    ) : null}
                                </>
                            ) : (
                                <div className="py-10 text-center text-[10px] text-slate-500 leading-relaxed px-2">
                                    {t('search_placeholder_label')}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {consultSideTab === 'clients' && (
                    <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-3 space-y-1.5 min-h-0">
                        {consultClientsLoading ? (
                            <div className="py-8 flex justify-center">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : consultClientChats.length === 0 ? (
                            <div className="py-10 px-2 text-center text-[10px] text-slate-500 leading-relaxed">
                                {panelLabels.consultClientsEmptyHint ||
                                    t('no_clients_hint')}
                            </div>
                        ) : (
                            consultClientChats.map((c: any) => {
                                const chatId = String(c.id || c._id || '');
                                const ou = c.otherUser || {};
                                const displayName =
                                    [ou.name, ou.surname].filter(Boolean).join(' ').trim() ||
                                    ou.username ||
                                    t('client_label');
                                const av = ou.avatar || ou.avatar_url;
                                return (
                                    <div
                                        key={chatId || ou.id}
                                        className="rounded-xl bg-white/5 border border-white/10 p-2 space-y-2"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/10 bg-slate-800">
                                                {getAvatarUrl(av) ? (
                                                    <img src={getAvatarUrl(av)!} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/70">
                                                        {displayName[0] || '?'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-bold text-white truncate">{displayName}</div>
                                                {c.lastMessage ? (
                                                    <div className="text-[9px] text-slate-500 truncate">{c.lastMessage}</div>
                                                ) : null}
                                            </div>
                                            {(c.unread || 0) > 0 ? (
                                                <span className="shrink-0 min-w-[1.25rem] h-5 px-1 rounded-full bg-blue-500 text-[9px] font-bold text-white flex items-center justify-center">
                                                    {c.unread > 9 ? '9+' : c.unread}
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => openConsultAcceptFinancialModal(chatId, displayName)}
                                                disabled={!chatId || consultAcceptSendingId === chatId}
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-[9px] font-bold text-white disabled:opacity-50 transition-colors"
                                                title={
                                                    panelLabels.consultInviteTooltip ||
                                                    t('send_invite_tooltip')
                                                }
                                            >
                                                <Send className="w-3 h-3 shrink-0" />
                                                {consultAcceptSendingId === chatId ? t('sending_label') : t('accept_invite_btn')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => finishConsultWithClient(chatId)}
                                                className="px-2.5 py-1.5 rounded-lg border border-orange-500/40 bg-orange-500/15 text-[9px] font-semibold text-orange-200 hover:bg-orange-500/25 shrink-0"
                                                title={t('finish_session_title')}
                                            >
                                                {t('finish_btn')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
                    )}

            {/* In-meeting chat — faqat ustoz (dars) rejimida; advokat/psixologda alohida chatdan foydalaniladi */}
            {showMentorClassroomTools && (
                <div className="h-[310px] shrink-0 flex flex-col border-t border-white/10 bg-white/[0.03] backdrop-blur-md">
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/5 bg-white/[0.04] backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{t('in_meeting_chat_label')}</span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{t('messages_count', { count: chatMessages.length })}</span>
                    </div>

                    <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 min-h-0">
                        {chatMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-2">
                                <MessageSquare className="w-10 h-10" />
                                <span className="text-xs uppercase font-black tracking-tighter">{t('no_messages_label')}</span>
                            </div>
                        ) : (
                            chatMessages.map((m: any, i: number) => {
                                const senderName = m.sender_name || m.sender || t('user_label');
                                const senderAvatar = m.sender_avatar || m.avatar;

                                return (
                                    <div key={m.id || i} className="flex gap-2.5 animate-slide-up group/msg">
                                        <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 border border-white/5">
                                            <img
                                                src={getAvatarUrl(senderAvatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName}&backgroundColor=1e293b`}
                                                alt="avatar"
                                                className="w-full h-full object-cover"
                                                onError={(e: any) => { e.target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=User&backgroundColor=1e293b" }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <span className="text-[10px] font-black text-white/50 truncate uppercase tracking-tighter group-hover/msg:text-blue-400 transition-colors">{senderName}</span>
                                            </div>
                                            <p className="text-[11px] text-white/90 leading-snug break-words bg-white/5 px-2.5 py-1.5 rounded-xl rounded-tl-none border border-white/5 inline-block max-w-full">
                                                {m.text || m.message || m.content}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <div className="p-3 bg-white/[0.03] backdrop-blur-sm border-t border-white/10">
                        <form className="relative flex gap-2" onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                            <input
                                type="text"
                                placeholder={t('chat_input_placeholder')}
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                aria-label={t('chat_input_label')}
                                className="flex-1 bg-white/5 rounded-xl py-2 px-3.5 text-[11px] text-white placeholder-white/25 border border-white/10 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all font-medium"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim()}
                                aria-label={t('send_btn')}
                                className="p-2 aspect-square rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 transition-all shadow-lg shadow-blue-500/20 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                                <Send className="w-3.5 h-3.5" aria-hidden />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {!showMentorClassroomTools && consultLeftPanelOpen ? (
                <button
                    type="button"
                    aria-label={t('resize_panel_label')}
                    title={t('resize_panel_title')}
                    className={`absolute right-0 top-0 bottom-0 z-[19] w-2 cursor-col-resize border-0 bg-transparent p-0 ${expertPanelMode === 'legal' ? 'hover:bg-amber-400/20' : 'hover:bg-cyan-400/20'
                        }`}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        consultLeftDragRef.current = {
                            active: true,
                            startX: e.clientX,
                            startW: consultLeftPanelWidthPx,
                        };
                    }}
                />
            ) : null}
        </div>

                {/* ═══ CENTER PANEL (VIDEO) ═══ */ }
    <div className="flex-1 flex flex-col relative z-10 overflow-hidden bg-slate-950/35 backdrop-blur-sm border-x border-white/[0.06] min-w-0">
        {showMentorClassroomTools ? (
            <button
                type="button"
                onClick={() => setMentorRightPanelOpen((v) => !v)}
                aria-expanded={mentorRightPanelOpen}
                aria-label={
                    mentorRightPanelOpen
                        ? t('close_materials_panel_label')
                        : t('open_materials_panel_label')
                }
                className="absolute right-0 top-1/2 z-[25] -translate-y-1/2 flex items-center justify-center w-8 h-24 rounded-l-xl bg-[#1a1d2e]/95 border border-white/10 border-r-0 text-white/90 hover:bg-[#232636] hover:text-white shadow-lg pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f1a] transition-colors"
                title={mentorRightPanelOpen ? t('hide_materials_panel_title') : t('show_materials_panel_title')}
            >
                {mentorRightPanelOpen ? (
                    <ChevronRight className="w-5 h-5 shrink-0" aria-hidden />
                ) : (
                    <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden />
                )}
            </button>
        ) : (
            <>
                <button
                    type="button"
                    onClick={() => setConsultLeftPanelOpen((v) => !v)}
                    aria-expanded={consultLeftPanelOpen}
                    aria-label={
                        consultLeftPanelOpen
                            ? t('close_left_panel_label')
                            : t('open_left_panel_label')
                    }
                    className={`absolute left-0 top-1/2 z-[25] -translate-y-1/2 flex items-center justify-center w-8 h-24 rounded-r-xl border shadow-lg pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f1a] transition-colors border-l-0 ${expertPanelMode === 'legal'
                            ? 'bg-[#1e1812]/95 border-amber-500/25 text-amber-100/95 hover:bg-[#2a2218] hover:text-amber-50 focus-visible:ring-amber-500/60'
                            : 'bg-[#1a1d2e]/95 border-white/10 text-white/90 hover:bg-[#232636] hover:text-white focus-visible:ring-blue-500/70'
                        }`}
                    title={consultLeftPanelOpen ? t('close_left_panel_title') : t('open_left_panel_title')}
                >
                    {consultLeftPanelOpen ? (
                        <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden />
                    ) : (
                        <ChevronRight className="w-5 h-5 shrink-0" aria-hidden />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setConsultRightPanelOpen((v) => !v)}
                    aria-expanded={consultRightPanelOpen}
                    aria-label={
                        consultRightPanelOpen
                            ? panelLabels.rightPanelToggleCloseLabel || t('close_materials_panel_label')
                            : panelLabels.rightPanelToggleOpenLabel || t('open_materials_panel_label')
                    }
                    className={`absolute right-0 top-1/2 z-[25] -translate-y-1/2 flex items-center justify-center w-8 h-24 rounded-l-xl border border-r-0 shadow-lg pointer-events-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0f1a] transition-colors ${expertPanelMode === 'legal'
                            ? 'bg-[#1e1812]/95 border-amber-500/25 text-amber-100/95 hover:bg-[#2a2218] hover:text-amber-50 focus-visible:ring-amber-500/60'
                            : 'bg-[#1a1d2e]/95 border-white/10 text-white/90 hover:bg-[#232636] hover:text-white focus-visible:ring-blue-500/70'
                        }`}
                    title={
                        consultRightPanelOpen
                            ? panelLabels.rightPanelToggleCloseLabel || t('hide_panel_title')
                            : panelLabels.rightPanelToggleOpenLabel || t('show_panel_title')
                    }
                >
                    {consultRightPanelOpen ? (
                        <ChevronRight className="w-5 h-5 shrink-0" aria-hidden />
                    ) : (
                        <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden />
                    )}
                </button>
            </>
        )}

        {/* Shared Video Frame Component */}
        <LiveVideoFrame
            isMentor={true}
            showClassroomLayout={showMentorClassroomTools}
            swapMainWithClient={expertPanelMode === 'legal' || expertPanelMode === 'psychology'}
            isWhiteboardOpen={isWhiteboardOpen}
            socket={socket}
            sessionId={sessionId}
            onCloseWhiteboard={handleToggleWhiteboard}
            handsRaised={handsRaised}
            mentorMaterialsPanelOpen={mentorRightPanelOpen}
        />

        {/* Pastki boshqaruv: qatnashchilar / layout / sozlamalar chap panelda */}
        <div className="h-[76px] shrink-0 flex items-center gap-3 px-4 sm:px-6 mentor-glass-bar border-t border-white/10 relative z-10 w-full min-w-0">
            {showMentorClassroomTools ? (
                <>
                    <div className="flex items-center gap-2.5 min-w-0 shrink-0 max-w-[38%] sm:max-w-none">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {getAvatarUrl(user?.avatar_url || user?.avatar) ? (
                                <img src={getAvatarUrl(user?.avatar_url || user?.avatar)!} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5 text-white/40" />
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h3 className="text-white font-bold text-sm truncate">{user?.name || 'Tessa Walker'}</h3>
                            <p className="text-white/40 text-[11px] text-left leading-snug truncate">{panelLabels.roleLine}</p>
                        </div>
                    </div>

                    <div className="flex-1 flex justify-center min-w-0">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center rounded-2xl bg-white/[0.06] border border-white/10 px-1.5 py-1.5 shadow-inner shadow-black/20">
                            <button
                                type="button"
                                onClick={handleLocalToggleMic}
                                title={isMicOn ? t('mute_mic_title') : t('mic_off_title')}
                                className={`flex items-center justify-center shrink-0 rounded-xl transition-all gap-1.5 h-10 px-3 sm:px-4 font-semibold text-xs sm:text-sm ${isMicOn ? 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5' : 'bg-red-500 text-white hover:bg-red-600'}`}
                            >
                                {isMicOn ? <Mic className="w-4 h-4 shrink-0" /> : <MicOff className="w-4 h-4 shrink-0" />}
                                <span className="hidden lg:inline">{isMicOn ? t('mic_label') : t('off_label')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleLocalToggleCam}
                                title={isCamOn ? t('mute_cam_title') : t('cam_off_title')}
                                className={`flex items-center justify-center shrink-0 rounded-xl transition-all gap-1.5 h-10 px-3 sm:px-4 font-semibold text-xs sm:text-sm ${isCamOn ? 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5' : 'bg-red-500/80 text-white hover:bg-red-600 border border-red-500/30'}`}
                            >
                                {isCamOn ? <VideoIcon className="w-4 h-4 shrink-0" /> : <VideoOff className="w-4 h-4 shrink-0" />}
                                <span className="hidden lg:inline">{t('camera_label')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleToggleScreenShare}
                                title={isScreenSharing ? t('stop_screen_share_title') : t('start_screen_share_title')}
                                className={`flex items-center justify-center shrink-0 rounded-xl transition-all gap-1.5 h-10 px-3 sm:px-4 font-bold text-xs sm:text-sm ${isScreenSharing ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5'}`}
                            >
                                <Monitor className="w-4 h-4 shrink-0" />
                                <span className="hidden sm:inline">{isScreenSharing ? t('stop_label') : t('screen_label')}</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleToggleWhiteboard}
                                title={isWhiteboardOpen ? t('close_whiteboard_title') : t('open_whiteboard_title')}
                                className={`flex items-center justify-center shrink-0 rounded-xl transition-all gap-1.5 h-10 px-3 sm:px-4 font-bold text-xs sm:text-sm ${isWhiteboardOpen ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5'}`}
                            >
                                <PenTool className="w-4 h-4 shrink-0" />
                                <span className="hidden sm:inline">{t('whiteboard_label')}</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0">
                        <button
                            type="button"
                            onClick={handleToggleRecording}
                            disabled={isUploadingRecording}
                            className={`flex items-center justify-center gap-2 h-10 px-3 sm:px-4 rounded-xl transition-all font-bold text-xs border ${isRecording ? 'bg-red-500 text-white border-red-400/40 shadow-lg shadow-red-500/25' : 'bg-white/[0.06] text-white/70 border-white/10 hover:bg-white/10'} ${isUploadingRecording ? 'opacity-70 cursor-wait' : ''}`}
                            title={isUploadingRecording ? t('uploading_label') : isRecording ? t('stop_recording_title') : t('start_recording_title')}
                        >
                            {isUploadingRecording ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                            ) : (
                                <Circle className={`w-4 h-4 shrink-0 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
                            )}
                            <span className="hidden sm:inline">{isRecording ? t('recording_label') : t('record_label')}</span>
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={handleLocalToggleMic}
                            title={isMicOn ? t('mute_mic_title') : t('mic_off_title')}
                            className={`flex items-center justify-center shrink-0 w-11 h-11 rounded-xl transition-all shadow-sm ${isMicOn ? 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5' : 'bg-red-500 text-white hover:bg-red-600'}`}
                        >
                            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleLocalToggleCam}
                            title={isCamOn ? t('mute_cam_title') : t('cam_off_title')}
                            className={`flex items-center justify-center shrink-0 w-11 h-11 rounded-xl transition-all shadow-sm ${isCamOn ? 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5' : 'bg-red-500/80 text-white hover:bg-red-600 border border-red-500/30'}`}
                        >
                            {isCamOn ? <VideoIcon className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleScreenShare}
                            title={isScreenSharing ? t('stop_screen_share_title') : t('start_screen_share_title')}
                            className={`flex items-center justify-center shrink-0 w-11 h-11 rounded-xl transition-all shadow-md ${isScreenSharing ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5'}`}
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleToggleWhiteboard}
                            title={isWhiteboardOpen ? t('close_whiteboard_title') : t('open_whiteboard_title')}
                            className={`flex items-center justify-center shrink-0 w-11 h-11 rounded-xl transition-all shadow-md ${isWhiteboardOpen ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-[#2a2d3e] text-white/90 hover:bg-[#32364a] border border-white/5'}`}
                        >
                            <PenTool className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center justify-end flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={handleToggleRecording}
                            disabled={isUploadingRecording}
                            className={`flex items-center justify-center gap-2 h-10 px-3 rounded-xl transition-all font-bold text-xs border ${isRecording ? 'bg-red-500 text-white border-red-400/40' : 'bg-white/[0.06] text-white/70 border-white/10 hover:bg-white/10'} ${isUploadingRecording ? 'opacity-70' : ''}`}
                            title={isUploadingRecording ? t('uploading_label') : isRecording ? t('stop_recording_title') : t('start_recording_title')}
                        >
                            {isUploadingRecording ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                            ) : (
                                <Circle className={`w-4 h-4 shrink-0 ${isRecording ? 'fill-current animate-pulse' : ''}`} />
                            )}
                            <span className="hidden sm:inline">{t('recording_label')}</span>
                        </button>
                    </div>
                </>
            )}
        </div>
    </div>

    {/* ═══ RIGHT PANEL (yig‘iladigan, silliq animatsiya) ═══ */ }
    <div
        className={`relative z-10 shrink-0 flex flex-col min-h-0 h-full mentor-glass-surface shadow-2xl shadow-black/25 overflow-hidden transition-[width,max-width,opacity] duration-300 ease-out ${expertPanelMode === 'legal' && materialsSidePanelOpen
                ? 'border-l border-amber-500/20'
                : 'border-l border-white/5'
            } ${materialsSidePanelOpen
                ? `${rightPanelOpenWidthClass} opacity-100`
                : 'w-0 max-w-0 opacity-0 pointer-events-none border-l-0'
            }`}
    >
        <div
            className={`absolute inset-0 pointer-events-none bg-gradient-to-t ${expertPanelMode === 'legal'
                    ? 'from-amber-950/[0.12] via-transparent to-transparent'
                    : 'from-white/[0.03] to-transparent'
                }`}
        />

        <div className="relative flex-1 min-h-0 min-w-0 overflow-y-auto no-scrollbar flex flex-col pb-2">
            {/* Materiallar (mentor: viktorina ham) */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between shrink-0">
                <span className="text-sm font-bold text-white leading-tight">{panelLabels.rightPanelMaterialsTitle}</span>
            </div>

            {/* Yuklash / Viktorina yaratish */}
            <div className={`px-3 mb-3 grid gap-2 shrink-0 ${showMentorClassroomTools ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || !mentorRoomReady}
                    title={!mentorRoomReady ? t('select_group_first') : undefined}
                    className={`group flex flex-col items-stretch gap-1 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${isUploading || !mentorRoomReady
                            ? 'cursor-not-allowed border-white/5 bg-white/[0.03] opacity-50'
                            : expertPanelMode === 'legal'
                                ? 'border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-white/[0.02] hover:border-amber-400/45 hover:from-amber-500/16 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]'
                                : 'border-white/12 bg-gradient-to-br from-white/[0.07] to-white/[0.02] hover:border-sky-400/40 hover:from-sky-500/12 hover:shadow-[0_0_20px_rgba(56,189,248,0.08)]'
                        }`}
                >
                    <span className="flex items-center gap-2 min-w-0">
                        <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg group-hover:opacity-95 ${expertPanelMode === 'legal'
                                    ? 'bg-amber-500/25 text-amber-100 group-hover:bg-amber-500/35'
                                    : 'bg-sky-500/20 text-sky-200 group-hover:bg-sky-500/30'
                                }`}
                        >
                            {isUploading ? (
                                <span
                                    className={`h-3.5 w-3.5 border-2 rounded-full animate-spin ${expertPanelMode === 'legal'
                                            ? 'border-amber-300/40 border-t-amber-100'
                                            : 'border-sky-300/40 border-t-sky-200'
                                        }`}
                                />
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                        </span>
                        <span className="text-[11px] font-bold text-white leading-tight truncate">
                            {isUploading
                                ? t('uploading_label')
                                : panelLabels.rightPanelUploadLabel || t('upload_material_label')}
                        </span>
                    </span>
                    <span className="text-[9px] text-slate-500 leading-snug pl-10">
                        {panelLabels.rightPanelUploadHint ||
                            (showMentorClassroomTools
                                ? t('material_upload_hint_mentor')
                                : t('material_upload_hint_consult'))}
                    </span>
                </button>
                {showMentorClassroomTools && (
                    <button
                        type="button"
                        onClick={() => mentorRoomReady && setIsCreatingQuiz(true)}
                        disabled={!mentorRoomReady}
                        title={!mentorRoomReady ? t('select_group_first') : undefined}
                        className={`group flex flex-col items-stretch gap-1 rounded-xl border px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${!mentorRoomReady
                                ? 'cursor-not-allowed border-white/5 bg-white/[0.03] opacity-50'
                                : 'border-white/12 bg-gradient-to-br from-violet-500/10 to-white/[0.02] hover:border-violet-400/40 hover:from-violet-500/18 hover:shadow-[0_0_20px_rgba(167,139,250,0.1)]'
                            }`}
                    >
                        <span className="flex items-center gap-2 min-w-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/25 text-violet-100 group-hover:bg-violet-500/35">
                                <ClipboardList className="w-4 h-4" />
                            </span>
                            <span className="text-[11px] font-bold text-white leading-tight truncate">{t('create_quiz_label')}</span>
                        </span>
                        <span className="text-[9px] text-slate-500 leading-snug pl-10">{t('quiz_save_hint')}</span>
                    </button>
                )}
            </div>

            {/* Quiz yakunlangan badge */}
            {showMentorClassroomTools && activeQuiz && (
                <div className="mx-3 mb-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                    <div>
                        <div className="text-xs font-bold text-white">{activeQuiz.title}</div>
                        <div className="text-[10px] text-green-400">
                            {activeQuiz.isQuickPoll
                                ? t('poll_responses_count', { count: Object.keys(quickPollStats?.byStudent ?? {}).length })
                                : t('quiz_responses_count', { count: Object.keys(quizResults).length })}
                        </div>
                    </div>
                </div>
            )}

            {/* Tezkor so‘rov: Ha / Yo‘q sonlari */}
            {showMentorClassroomTools &&
                activeQuiz?.isQuickPoll &&
                quickPollStats &&
                (activeQuiz.questions?.[0]?.options?.length ?? 0) > 0 && (
                    <div className="px-3 mb-3">
                        <div className="mb-2 text-xs font-bold text-slate-400">{t('poll_distribution_label')}</div>
                        <div className="space-y-2">
                            {(activeQuiz.questions[0].options || []).map((opt: any) => {
                                const oid = String(opt.id ?? '');
                                const n = quickPollStats.counts[oid] ?? 0;
                                const total = Object.keys(quickPollStats.byStudent).length || 1;
                                const pct = Math.round((n / total) * 100);
                                return (
                                    <div key={oid || opt.text} className="rounded-xl bg-white/5 px-2.5 py-2">
                                        <div className="flex items-center justify-between gap-2 text-xs">
                                            <span className="min-w-0 flex-1 truncate font-medium text-slate-200">
                                                {opt.text || opt.label || oid}
                                            </span>
                                            <span className="shrink-0 font-black text-sky-300">{t('responses_count', { count: n })}</span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/40">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-[width]"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500">
                            {t('total_responses_label', { count: Object.keys(quickPollStats.byStudent).length })}
                        </p>
                    </div>
                )}

            {/* Viktorina: kim qancha ball */}
            {showMentorClassroomTools &&
                activeQuiz &&
                !activeQuiz.isQuickPoll &&
                Object.keys(quizResults).length > 0 && (
                    <div className="px-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-400">{t('quiz_results_label')}</span>
                        </div>
                        <div className="space-y-1 max-h-28 overflow-y-auto no-scrollbar">
                            {Object.entries(quizResults)
                                .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
                                .map(([studentId, score], idx) => {
                                    const att = attendees.find((a: any) => a.id === studentId);
                                    const name = att?.name || att?.username || `${t('student_label')} ${String(studentId).slice(0, 6)}`;
                                    return (
                                        <div key={studentId} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-white/5 text-xs">
                                            <span className="text-slate-300 font-medium truncate flex-1">{idx + 1}. {name}</span>
                                            <span className="text-emerald-400 font-bold shrink-0 ml-2">{t('score_label', { score: Number(score) || 0 })}</span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

            {/* Kurs materiallari */}
            <div className="px-3 mb-3">
                {sessionResourcesNote && (
                    <div className="mb-2 rounded-lg border border-sky-400/30 bg-sky-500/10 px-2 py-1.5 text-[9px] text-sky-100/95 leading-snug">
                        {sessionResourcesNote}
                    </div>
                )}
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">
                        {panelLabels.rightPanelListSectionTitle || t('course_materials_label')}
                    </span>
                </div>
                <div className="space-y-1.5">
                    {materials.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2">{t('no_materials_label')}</div>
                    ) : (
                        materials.map((mat: any) => {
                            const isVideo = mat.file_type?.includes('video');
                            return (
                                <a href={`${getPublicApiUrl()}${mat.file_url.startsWith('/') ? '' : '/'}${mat.file_url}`} target="_blank" rel="noreferrer" key={mat.id} className="w-full flex items-center gap-2.5 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left group">

                                    {isVideo ? (
                                        <div className="w-3.5 h-3.5 rounded bg-blue-500 flex items-center justify-center shrink-0"><VideoIcon className="w-2 h-2 text-white" /></div>
                                    ) : (
                                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-xs font-medium text-slate-300 group-hover:text-white flex-1 truncate">{mat.title}</span>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-500 opacity-60 group-hover:opacity-100 shrink-0" aria-hidden />
                                </a>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Saqlangan savollar */}
            {showMentorClassroomTools && (
                <div className="px-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">{t('saved_quizzes_label')}</span>
                    </div>
                    {quizzes.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2 px-1 leading-relaxed">
                            {t('no_quizzes_hint')}
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            {quizzes.map((q: any) => (
                                <div key={q.id} className="flex items-center gap-2 py-2 px-3 rounded-xl bg-white/5 border border-white/10 group">
                                    <span className="text-xs font-medium text-slate-300 truncate flex-1 min-w-0">{q.title}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleBroadcastQuiz(q)}
                                        disabled={!mentorRoomReady || !socket}
                                        className="shrink-0 py-1 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-[10px] font-bold transition-all"
                                    >
                                        {t('send_btn')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteQuiz(q.id)}
                                        className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        title={t('delete_btn')}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="mx-3 h-px bg-white/5 mb-3 shrink-0" />

            {/* Tezkor so'rov — faqat mentor rejimi */}
            {showMentorClassroomTools && (
                <div className="px-3 mb-2 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400">{t('quick_poll_label')}</span>
                    </div>
                    <button
                        type="button"
                        onClick={handleQuickPoll}
                        disabled={!mentorRoomReady || !socket}
                        className="w-full flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-200 group-hover:text-white">{t('is_topic_clear_label')}</span>
                    </button>
                    <p className="text-[10px] text-slate-500 mt-1.5 px-0.5">{t('quick_poll_hint')}</p>
                </div>
            )}

        </div>

        {/* Pastki blok: sessiya qaydlari + dars tugmalari (har doim pastda) */}
        <div className="relative shrink-0 border-t border-white/10 bg-[#0a0c12]/90 backdrop-blur-md px-3 pt-3 pb-3 space-y-3">
            <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">{t('session_notes_label')}</span>
                </div>
                <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder={t('session_notes_placeholder')}
                    disabled={!mentorRoomReady || savingNote}
                    className="w-full h-24 bg-white/5 border border-white/5 rounded-xl p-3 text-xs text-white resize-none focus:outline-none focus:border-white/20 transition-colors placeholder:text-slate-600 disabled:opacity-50"
                />
                <button
                    type="button"
                    onClick={handleSaveNote}
                    disabled={!mentorRoomReady || savingNote || !sessionNotes.trim()}
                    className="w-full mt-2 py-2.5 bg-white/10 hover:bg-white/15 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all border border-white/10"
                >
                    {savingNote ? t('saving_label') : t('save_note_btn')}
                </button>
                {!mentorRoomReady ? (
                    <p className="text-[9px] text-slate-500 mt-1.5">{t('select_group_note_hint')}</p>
                ) : null}
            </div>

            <div className="flex items-stretch gap-2">
                <button
                    type="button"
                    onClick={handleStartLesson}
                    disabled={isLessonStarted}
                    className={`flex-1 min-w-0 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all ${isLessonStarted ? 'bg-blue-600/40 cursor-not-allowed border border-blue-500/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 active:scale-95'}`}
                >
                    {isLessonStarted ? panelLabels.primaryStartedLabel : panelLabels.primaryStartLabel}
                </button>
                <button
                    type="button"
                    onClick={handleEndSession}
                    className="flex-1 min-w-0 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-xs sm:text-sm font-bold shadow-lg transition-all bg-red-500/90 hover:bg-red-600 border border-red-500/40 active:scale-95"
                >
                    {showMentorClassroomTools ? t('end_lesson_btn') : endSessionButtonLabel}
                </button>
            </div>
        </div>
    </div>

</div>
            {showMentorClassroomTools && (
                <DashboardQuizModal
                    t={t}
                    open={isCreatingQuiz}
                    newQuizTitle={newQuizTitle}
                    setNewQuizTitle={setNewQuizTitle}
                    newQuestions={newQuestions}
                    setNewQuestions={setNewQuestions}
                    onClose={() => setIsCreatingQuiz(false)}
                    onSave={handleCreateQuiz}
                />
            )}

            {consultAcceptModal ? (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12151e] p-4 shadow-2xl space-y-3">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-white">{t('accept_invite_btn')}</h3>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    {t('consult_accept_modal_client')}{' '}
                                    <span className="text-white font-semibold">
                                        {consultAcceptModal.displayName}
                                    </span>
                                </p>
                            </div>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-white text-xs"
                                onClick={() => setConsultAcceptModal(null)}
                            >
                                {t('cancel')}
                            </button>
                        </div>

                        {consultAcceptModal.loading ? (
                            <div className="py-8 flex justify-center">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : consultAcceptModal.error ? (
                            <p className="text-xs text-red-300">{consultAcceptModal.error}</p>
                        ) : consultAcceptModal.prep ? (
                            <div className="space-y-2 text-[11px] text-slate-300">
                                <div className="rounded-xl bg-white/5 border border-white/10 p-3 space-y-1.5">
                                    <div className="flex justify-between gap-2">
                                        <span className="text-slate-500">{t('consult_accept_modal_locked_balance')}</span>
                                        <span className="font-bold text-white">
                                            {formatMaliUi(consultAcceptModal.prep.clientLockedBalance, language)} MALI
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-2">
                                        <span className="text-slate-500">{t('consult_accept_modal_your_listing_price')}</span>
                                        <span className="font-bold text-white">
                                            {consultAcceptModal.prep.expertServicePrice != null
                                                ? `${formatMaliUi(consultAcceptModal.prep.expertServicePrice, language)} MALI`
                                                : '—'}
                                        </span>
                                    </div>
                                    {consultAcceptModal.prep.session ? (
                                        <div className="flex justify-between gap-2">
                                            <span className="text-slate-500">{t('status_ongoing')}</span>
                                            <span className="font-bold text-emerald-300">
                                                {consultAcceptModal.prep.session.status} ·{' '}
                                                {formatMaliUi(consultAcceptModal.prep.session.amountMali, language)} MALI
                                            </span>
                                        </div>
                                    ) : null}
                                </div>
                                <p className="text-slate-500 leading-relaxed">
                                    {panelLabels.consultInviteTooltip || t('send_invite_tooltip')}
                                </p>
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-2 pt-1">
                            <button
                                type="button"
                                disabled={
                                    !!consultAcceptModal.loading ||
                                    !!consultAcceptModal.error ||
                                    consultAcceptSendingId === consultAcceptModal.chatId
                                }
                                onClick={async () => {
                                    const id = consultAcceptModal.chatId;
                                    setConsultAcceptModal(null);
                                    await sendConsultAcceptNotice(id, false);
                                }}
                                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white disabled:opacity-50"
                            >
                                {t('accept_invite_btn')}
                            </button>
                            <button
                                type="button"
                                disabled={
                                    !!consultAcceptModal.loading ||
                                    !!consultAcceptModal.error ||
                                    consultAcceptSendingId === consultAcceptModal.chatId
                                }
                                onClick={async () => {
                                    const id = consultAcceptModal.chatId;
                                    setConsultAcceptModal(null);
                                    await sendConsultAcceptNotice(id, true);
                                }}
                                className="w-full py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-xs font-bold text-amber-100 disabled:opacity-50"
                            >
                                {t('request_payment')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}

export default DashboardContent;
