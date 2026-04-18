"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { GlassCard } from '../ui/GlassCard';
import { LiveVideoFrame } from './shared/LiveVideoFrame';
import { LiveChatPanel } from './shared/LiveChatPanel';
import { LiveWhiteboard } from './shared/LiveWhiteboard';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useRemoteParticipants,
    useLocalParticipant,
    useConnectionState
} from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
import '@livekit/components-styles';
import {
    FileText,
    Video,
    VideoOff,
    Mic,
    MicOff,
    Link as LinkIcon,
    PenTool,
    MessageSquare,
    LogOut,
    X,
    Hand
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { ExpertPanelMode } from '@/lib/expert-roles';
import { getStudentPanelExpertLabel, getStudentSelfRoleLabel } from '@/lib/expert-roles';
import { getExpertComplianceNotice } from '@/lib/expert-compliance-copy';

interface StudentDashboardProps {
    user: { name?: string; id?: string; avatar_url?: string; avatar?: string } | null;
    sessionId: string;
    /** `?style=legal|consult|psychology|mentor` — konsultatsiya matnlari va «dars» UI filtari */
    sessionStyle?: ExpertPanelMode;
    onLeave: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app';
const getAvatarUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

/** Savol matni: yangi qator, `**qalin**` */
function FormattedQuizText({ text }: { text: string }) {
    if (!text?.trim()) return null;
    const lines = text.split('\n');
    return (
        <div className="space-y-1 text-[15px] sm:text-sm font-medium text-white/92 leading-relaxed">
            {lines.map((line, li) => {
                const segments = line.split(/(\*\*[^*]+\*\*)/g).filter((s) => s !== '');
                return (
                    <p key={li} className="whitespace-pre-wrap break-words">
                        {segments.map((part, pi) => {
                            const bold = part.match(/^\*\*([^*]+)\*\*$/);
                            if (bold) {
                                return (
                                    <strong key={pi} className="font-semibold text-white">
                                        {bold[1]}
                                    </strong>
                                );
                            }
                            return <span key={pi}>{part}</span>;
                        })}
                    </p>
                );
            })}
        </div>
    );
}

function parseLkRole(metadata: string | undefined): 'mentor' | 'student' | null {
    if (!metadata) return null;
    try {
        const m = JSON.parse(metadata) as { lkRole?: string };
        if (m.lkRole === 'mentor') return 'mentor';
        if (m.lkRole === 'student') return 'student';
    } catch {
        /* ignore */
    }
    return null;
}

function MentorProfileHeader({
    mentorAudioOn = true,
    mentorVideoOn = true,
    className = '',
    panelMode = 'mentor',
}: {
    mentorAudioOn?: boolean;
    mentorVideoOn?: boolean;
    className?: string;
    panelMode?: ExpertPanelMode;
}) {
    const { t } = useLanguage();
    const expertRoleLabel = getStudentPanelExpertLabel(panelMode, t);
    const participants = useRemoteParticipants();
    const mentor =
        participants.find((p) => parseLkRole(p.metadata) === 'mentor') ??
        (participants.length > 0 ? participants[0] : null);

    let mentorAvatar: string | null = null;
    if (mentor?.metadata) {
        try {
            const meta = JSON.parse(mentor.metadata);
            mentorAvatar = meta.avatar_url || meta.avatar;
        } catch (_e) {
            /* ignore */
        }
    }

    return (
        <div
            className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 bg-white/[0.07] backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg ${className}`}
        >
            <div className="flex flex-col items-end min-w-0">
                <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">{expertRoleLabel}</span>
                <span className="text-xs font-bold text-white whitespace-nowrap truncate max-w-[120px] sm:max-w-[180px]">
                    {mentor?.identity || t('waiting_dots')}
                </span>
            </div>
            <div
                className="flex items-center gap-1 shrink-0 rounded-lg bg-black/35 border border-white/10 px-1.5 py-1"
                title={t('expert_mic_cam_socket')}
            >
                {mentorAudioOn ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
                ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-400" aria-hidden />
                )}
                {mentorVideoOn ? (
                    <Video className="w-3.5 h-3.5 text-emerald-400" aria-hidden />
                ) : (
                    <VideoOff className="w-3.5 h-3.5 text-red-400" aria-hidden />
                )}
            </div>
            <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-white text-xs border border-white/20 shadow-xl shadow-indigo-500/20 overflow-hidden">
                    {mentorAvatar ? (
                        <img src={getAvatarUrl(mentorAvatar)!} alt={expertRoleLabel} className="w-full h-full object-cover" />
                    ) : mentor ? (
                        mentor.identity?.[0]?.toUpperCase() || 'U'
                    ) : (
                        '?'
                    )}
                </div>
                {mentor && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#11131a]" />}
            </div>
        </div>
    );
}

export default function StudentDashboard({ user, sessionId, sessionStyle = 'mentor', onLeave }: StudentDashboardProps) {
    const style: ExpertPanelMode = sessionStyle;
    const { t, tLines } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const isClassroomMentor = style === 'mentor';
    const expertRoleLabel = getStudentPanelExpertLabel(style, t);
    const selfRoleLabel = getStudentSelfRoleLabel(style, t);

    const { socket } = useSocket();
    const [token, setToken] = useState<string>('');
    const [wsUrl, setWsUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [materials, setMaterials] = useState<Array<{ id?: string; url: string; title: string; type?: string }>>([]);
    const [quizzes, setQuizzes] = useState<Array<{ id: number; title: string; questions?: Array<{ text: string; options?: Array<{ id: string; label?: string; text?: string }> }> }>>([]);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, Record<number, string>>>({});
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
    const [activePoll, setActivePoll] = useState<{ id: string; questions?: Array<{ text: string; options?: Array<{ id: string; text: string }> }> } | null>(null);

    const [showChat, setShowChat] = useState(false);
    /** Konsultatsiya (mijoz): doska paneli qo'lda ochiladi (avtomatik emas) */
    const [showWhiteboardPanel, setShowWhiteboardPanel] = useState(false);
    const [showMaterials, setShowMaterials] = useState(false);
    const [showQuizzes, setShowQuizzes] = useState(false);
    const [handRaised, setHandRaised] = useState(false);
    const [mentorMediaHints, setMentorMediaHints] = useState({ audio: true, video: true });
    const [studentBanner, setStudentBanner] = useState<string | null>(null);
    const [quizPanelHighlight, setQuizPanelHighlight] = useState(false);
    /** Faqat dars rejimi: mentor sessiya chatiga yozganda */
    const [mentorChatNotice, setMentorChatNotice] = useState(false);
    const showChatRef = useRef(false);
    showChatRef.current = showChat;

    const complianceBlock = getExpertComplianceNotice(style, 'client', t, tLines);
    const complianceStorageKey =
        sessionId && complianceBlock ? `student_compliance_dismiss_${sessionId}_${style}` : '';
    const [complianceVisible, setComplianceVisible] = useState(false);

    const loadSessionResources = React.useCallback(async () => {
        if (!sessionId || sessionId === 'demo-session-id') return;
        try {
            const resMat = await apiFetch(`/api/sessions/${sessionId}/materials`);
            if (resMat.ok) {
                const data = await resMat.json();
                setMaterials(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('fetch materials', e);
        }

        if (isClassroomMentor) {
            try {
                const resQz = await apiFetch(`/api/sessions/${sessionId}/quizzes`);
                if (resQz.ok) {
                    const data = await resQz.json();
                    setQuizzes(Array.isArray(data) ? data.map((q: any) => ({
                        ...q,
                        questions: (q.questions || []).map((qq: any) => ({
                            ...qq,
                            text: qq.text ?? qq.question_text ?? '',
                            options: (qq.options || []).map((o: any) => ({
                                ...o,
                                id: o.id != null ? String(o.id) : '',
                                text: o.text ?? o.option_text ?? '',
                                label: o.option_text ?? o.text ?? '',
                                isCorrect: Boolean(o.is_correct ?? o.isCorrect),
                            })),
                        })),
                    })) : []);
                }
            } catch (e) {
                console.error('fetch quizzes', e);
            }
        }
    }, [sessionId, isClassroomMentor]);

    useEffect(() => {
        loadSessionResources();
    }, [loadSessionResources]);

    useEffect(() => {
        if (!complianceBlock || !complianceStorageKey) {
            setComplianceVisible(false);
            return;
        }
        try {
            setComplianceVisible(sessionStorage.getItem(complianceStorageKey) !== '1');
        } catch {
            setComplianceVisible(true);
        }
    }, [complianceBlock, complianceStorageKey]);

    useEffect(() => {
        if (isClassroomMentor) return;
        setActivePoll(null);
        setQuizzes([]);
        setShowQuizzes(false);
        setQuizPanelHighlight(false);
    }, [isClassroomMentor]);

    useEffect(() => {
        if (!studentBanner) return;
        const t = window.setTimeout(() => setStudentBanner(null), 9000);
        return () => window.clearTimeout(t);
    }, [studentBanner]);

    useEffect(() => {
        if (showQuizzes) setQuizPanelHighlight(false);
    }, [showQuizzes]);

    useEffect(() => {
        if (showChat) setMentorChatNotice(false);
    }, [showChat]);

    useEffect(() => {
        if (!socket || !sessionId) return;
        const onMentorMedia = (p: { sessionId?: string; type?: string; enabled?: boolean }) => {
            if (String(p.sessionId) !== String(sessionId)) return;
            if (p.type === 'video') setMentorMediaHints((m) => ({ ...m, video: !!p.enabled }));
            else setMentorMediaHints((m) => ({ ...m, audio: !!p.enabled }));
        };
        socket.on('mentor_media_state', onMentorMedia);
        return () => {
            socket.off('mentor_media_state', onMentorMedia);
        };
    }, [socket, sessionId]);

    useEffect(() => {
        if (!socket || !sessionId) return;
        const sid = String(sessionId);
        const myId = user?.id != null ? String(user.id) : '';
        const roomOk = (msg: any) => {
            const ids = [
                msg.session_id,
                msg.sessionId,
                msg.roomId,
                msg.chat_id,
                msg.chatId,
            ].filter((v) => v != null);
            return ids.some((v) => String(v) === sid);
        };
        const onChatLike = (msg: any) => {
            if (!roomOk(msg)) return;
            const text = String(msg.content || msg.text || '');
            const senderRaw = msg.sender_id ?? msg.senderId ?? msg.from;
            const senderId = senderRaw != null ? String(senderRaw) : '';
            const isFromMentorOrOther = myId && senderId && senderId !== myId;

            if (isClassroomMentor && /📝|Viktorina|\*\*Viktorina/i.test(text)) {
                setShowQuizzes(true);
                setStudentBanner(t('banner_quiz_notice'));
                setQuizPanelHighlight(true);
            } else if (isClassroomMentor && /⚡|Tezkor so['ʼ]rov/i.test(text)) {
                setStudentBanner(t('banner_poll_notice'));
                setQuizPanelHighlight(true);
            } else if (/📎|Material yuklandi/i.test(text)) {
                setStudentBanner(t('banner_material_notice'));
            }

            if (isClassroomMentor && isFromMentorOrOther && !showChatRef.current) {
                setMentorChatNotice(true);
            }
        };
        socket.on('session_chat:receive', onChatLike);
        socket.on('receive_message', onChatLike);
        return () => {
            socket.off('session_chat:receive', onChatLike);
            socket.off('receive_message', onChatLike);
        };
    }, [socket, sessionId, user?.id, isClassroomMentor]);

    useEffect(() => {
        if (!socket || !sessionId) return;
        socket.emit('session_join', { sessionId });

        const handleNewMaterial = (data: { sessionId: string, material: { id?: string, url: string, title: string, type?: string } }) => {
            if (data.sessionId === sessionId) {
                setMaterials(prev => [...prev, data.material]);
            }
        };

        const handleQuizStart = (data: { sessionId?: string, quizId?: string, quizDetails: { id?: number | string; title: string, isQuickPoll?: boolean, questions?: any[] } }) => {
            if (!isClassroomMentor) return;
            const sid = data.sessionId != null ? String(data.sessionId) : String(sessionId);
            if (sid !== String(sessionId)) return;
            const details = data.quizDetails;
            if (details?.isQuickPoll) {
                setActivePoll(details as any);
                setStudentBanner(t('banner_mentor_poll_sent'));
                setQuizPanelHighlight(true);
            } else {
                const baseTitle = details?.title ?? t('lesson_word');
                const qid = details?.id ?? data.quizId ?? Date.now();
                const quiz = { id: qid, ...details, title: baseTitle };
                setQuizzes((prev) => {
                    if (prev.some((p) => String(p.id) === String(qid))) return prev;
                    return [...prev, quiz as any];
                });
                setShowQuizzes(true);
                setStudentBanner(`Yangi viktorina: ${baseTitle}`);
                setQuizPanelHighlight(true);
            }
        };

        const handleWhiteboardToggle = (data: boolean | { isOpen: boolean, sessionId?: string }) => {
            // Handle both object and boolean formats
            const isOpen = typeof data === 'boolean' ? data : data?.isOpen;
            if (typeof data === 'object' && data?.sessionId && data.sessionId !== sessionId) {
                return; // Ignore other sessions
            }
            setIsWhiteboardOpen(isOpen);
        };

        const handleStudentKicked = (data: { sessionId: string }) => {
            if (data.sessionId === sessionId) {
                showError(
                    isClassroomMentor
                        ? t('kicked_by_mentor')
                        : t('kicked_by_expert').replace('{role}', expertRoleLabel.toLowerCase())
                );
                onLeave();
            }
        };

        const handleLessonEnded = (data: { sessionId?: string; message?: string }) => {
            if (data?.sessionId != null && String(data.sessionId) !== String(sessionId)) return;
            if (isClassroomMentor) {
                showSuccess(
                    data?.message || t('lesson_ended_success')
                );
                onLeave();
                return;
            }

            // Konsultatsiya yakuni (legal / psychology / consult):
            // chat o‘chirilmaydi; faqat mijoz paneli yopiladi.
            setStudentBanner(t('service_finished_banner'));
            window.setTimeout(() => onLeave(), 900);
        };

        const handleHandLoweredBroadcast = (data: { studentId?: string }) => {
            if (data?.studentId != null && String(data.studentId) === String(user?.id)) {
                setHandRaised(false);
            }
        };

        socket.on('material_uploaded', handleNewMaterial);
        socket.on('quiz_start', handleQuizStart);
        socket.on('quiz_active', handleQuizStart);
        socket.on('whiteboard:toggle', handleWhiteboardToggle);
        socket.on('student_kicked', handleStudentKicked);
        socket.on('lesson_ended', handleLessonEnded);
        socket.on('hand_lowered', handleHandLoweredBroadcast);

        const handleReconnect = () => {
            loadSessionResources();
        };
        window.addEventListener('socket_reconnected', handleReconnect);

        return () => {
            socket.off('material_uploaded', handleNewMaterial);
            socket.off('quiz_start', handleQuizStart);
            socket.off('quiz_active', handleQuizStart);
            socket.off('whiteboard:toggle', handleWhiteboardToggle);
            socket.off('student_kicked', handleStudentKicked);
            socket.off('lesson_ended', handleLessonEnded);
            socket.off('hand_lowered', handleHandLoweredBroadcast);
            window.removeEventListener('socket_reconnected', handleReconnect);
        };
    }, [socket, sessionId, onLeave, user?.id, isClassroomMentor, expertRoleLabel, loadSessionResources]);

    const handleSelectAnswer = (quizId: string | number, questionIndex: number, optionId: string) => {
        const qk = String(quizId);
        setQuizAnswers((prev) => ({
            ...prev,
            [qk]: {
                ...(prev[qk] || {}),
                [questionIndex]: optionId,
            },
        }));
    };

    const handleSubmitQuiz = (quizId: string | number) => {
        const answers = quizAnswers[String(quizId)];
        if (!answers) {
            showError(t('answer_all_questions'));
            return;
        }
        const quiz = quizzes.find(q => q.id === quizId);
        let score = 0;
        if (quiz?.questions) {
            quiz.questions.forEach((q: any, qIdx: number) => {
                const selectedId = answers[qIdx];
                const opt = q.options?.find((o: any) => String(o.id) === String(selectedId) || o.id === selectedId);
                if (opt?.isCorrect) score++;
            });
        }
        if (socket) {
            socket.emit('quiz_submit', {
                sessionId,
                quizId,
                studentId: user?.id,
                answers,
                score
            });
        }
        showSuccess(t('quiz_submitted_success'));
        setQuizPanelHighlight(false);
        setQuizzes((prev) => prev.filter((q) => String(q.id) !== String(quizId)));
    };

    const handleAnswerPoll = (quizId: string, questionIndex: number, optionId: string) => {
        if (socket) {
            socket.emit('quiz_answer', {
                sessionId,
                quizId,
                studentId: user?.id,
                answers: { [questionIndex]: optionId }
            });
        }
        setActivePoll(null);
        setQuizPanelHighlight(false);
    };

    useEffect(() => {
        const fetchToken = async () => {
            if (!sessionId || sessionId === 'demo-session-id') {
                setError(
                    isClassroomMentor
                        ? t('session_not_found')
                        : `${t('session_not_found')} ${expertRoleLabel}`
                );
                setLoading(false);
                return;
            }
            try {
                const res = await apiFetch(`/api/livekit/token?room=${sessionId}&username=${encodeURIComponent(user?.name || 'Talaba')}`);
                if (res.ok) {
                    const data = await res.json();
                    setToken(data.token);
                    setWsUrl(data.wsUrl);
                } else {
                    setError(t('video_connect_error'));
                }
            } catch (err) {
                console.error(err);
                setError(t('network_error_msg'));
            } finally {
                setLoading(false);
            }
        };
        if (sessionId) fetchToken();
    }, [sessionId, user, isClassroomMentor, expertRoleLabel]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#0f1117]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-slate-200">{t('loading_session_data')}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0f1117] text-white px-4 text-center">
                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-lg mb-2 font-semibold">{t('could_not_connect_session')}</p>
                <p className="text-sm mb-6 text-slate-300 max-w-md">{error}</p>
                <button
                    onClick={onLeave}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all"
                >
                    {t('back_btn_text')}
                </button>
            </div>
        );
    }

    if (!token || !wsUrl) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0f1117] text-white">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xl mb-4 font-medium">{t('connecting_to_video')}</p>
                <button onClick={onLeave} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all">{t('cancel_btn')}</button>
            </div>
        );
    }

    const finalAvatar = getAvatarUrl((user?.avatar_url || user?.avatar)!) || "https://i.pravatar.cc/150?img=5";

    const toggleHand = () => {
        if (!socket || !sessionId) return;
        if (handRaised) {
            socket.emit('student_lower_hand', { sessionId });
            setHandRaised(false);
        } else {
            socket.emit('student_raise_hand', { sessionId });
            setHandRaised(true);
        }
    };

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden font-sans text-white antialiased bg-[#05060c]">
            <div
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-slate-950/50 via-transparent to-black/75"
                aria-hidden
            />
            {/* Kamera yo'q PCda ham xona ochilishi uchun avval media yo'q ulanish; keyin mic/cam alohida yoqiladi */}
            <LiveKitRoom
                video={false}
                audio={false}
                connect={true}
                token={token}
                serverUrl={wsUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://mali-livekit-tl6r65ar.livekit.cloud'}
                data-lk-theme="default"
                className="flex flex-col flex-1 w-full h-full relative"
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            >
                <StudentMentorMediaSync sessionId={sessionId} />
                <div className="absolute inset-0 z-0 bg-[#03040a] overflow-hidden">
                    <LiveVideoFrame
                        isMentor={false}
                        immersive={true}
                        isWhiteboardOpen={isWhiteboardOpen}
                        socket={socket}
                        sessionId={sessionId}
                        showClassroomLayout={isClassroomMentor}
                    />
                    <RoomAudioRenderer />
                </div>

                {studentBanner ? (
                    <div
                        className="absolute top-[76px] left-1/2 z-[45] w-[min(92vw,28rem)] -translate-x-1/2 pointer-events-auto px-3 animate-in fade-in slide-in-from-top-2 duration-300"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="flex items-start gap-3 rounded-2xl border border-sky-400/35 bg-[#0f172a]/95 px-4 py-3 text-sm text-sky-50 shadow-2xl shadow-black/40 backdrop-blur-md">
                            <span className="mt-0.5 text-lg leading-none" aria-hidden>
                                📢
                            </span>
                            <span className="flex-1 leading-snug font-medium">{studentBanner}</span>
                            <button
                                type="button"
                                onClick={() => setStudentBanner(null)}
                                className="shrink-0 rounded-lg p-1.5 text-sky-200/90 hover:bg-white/10 hover:text-white transition-colors"
                                aria-label={t('dismiss_notice_label')}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : null}

                {complianceBlock && complianceVisible ? (
                    <div
                        className="absolute top-[max(3.75rem,env(safe-area-inset-top))] left-1/2 z-[25] w-[min(92vw,26rem)] -translate-x-1/2 pointer-events-auto px-3 animate-in fade-in slide-in-from-top-1 duration-200"
                        role="dialog"
                        aria-labelledby="student-compliance-title"
                    >
                        <div className="rounded-2xl border border-amber-400/30 bg-[#1a1408]/95 px-3.5 py-3 text-left shadow-2xl backdrop-blur-md">
                            <div className="flex items-start justify-between gap-2">
                                <p id="student-compliance-title" className="text-[11px] font-black uppercase tracking-wide text-amber-200/95">
                                    {complianceBlock.title}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        try {
                                            if (complianceStorageKey) sessionStorage.setItem(complianceStorageKey, '1');
                                        } catch {
                                            /* ignore */
                                        }
                                        setComplianceVisible(false);
                                    }}
                                    className="shrink-0 rounded-lg p-1 text-amber-200/80 hover:bg-white/10"
                                    aria-label={t('close_btn')}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <ul className="mt-2 max-h-[40vh] list-disc space-y-1.5 overflow-y-auto pl-4 text-[10px] leading-snug text-white/85 custom-scrollbar">
                                {complianceBlock.lines.map((line, i) => (
                                    <li key={i}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : null}

                <header className="absolute top-0 inset-x-0 z-20 flex min-h-[4rem] lg:min-h-[5rem] items-center justify-between gap-2 px-3 sm:px-5 lg:px-8 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-4 pointer-events-auto">
                        <div className="relative shrink-0 group">
                            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 opacity-80 blur-[6px] group-hover:opacity-100 transition-opacity" />
                            <img
                                src={finalAvatar}
                                alt={`${selfRoleLabel} profil rasmi`}
                                className="relative h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover border-2 border-white/40 shadow-lg"
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0c0d12] bg-emerald-500 shadow-md" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-400/95 sm:text-[10px]">
                                {selfRoleLabel}
                            </p>
                            <h1 className="truncate text-xs font-bold text-white sm:text-sm">
                                <span className="lg:hidden">{user?.name || selfRoleLabel}</span>
                                <span className="hidden lg:inline">
                                    {user?.name || selfRoleLabel} — panel
                                </span>
                            </h1>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3 pointer-events-auto">
                        <MentorProfileHeader
                            mentorAudioOn={mentorMediaHints.audio}
                            mentorVideoOn={mentorMediaHints.video}
                            className="max-sm:scale-90 max-sm:origin-right"
                            panelMode={style}
                        />

                        {/* Desktop / planshet: pastki action bar o‘rniga header ichida */}
                        <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-white/10 bg-black/45 px-2 py-1.5 backdrop-blur-xl">
                            <StudentMediaControls />
                            <div className="mx-0.5 h-7 w-px bg-white/15" />
                            {isClassroomMentor ? (
                                <button
                                    type="button"
                                    onClick={toggleHand}
                                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide transition-all ${handRaised ? 'bg-amber-500 text-white shadow-md' : 'bg-white/5 text-white/85 hover:bg-white/10'}`}
                                    title={handRaised ? t('hand_down_title') : t('hand_up_title')}
                                >
                                    <Hand className="h-4 w-4" />
                                    <span className="hidden xl:inline">{handRaised ? t('hand_down_label_short') : t('hand_label_short')}</span>
                                </button>
                            ) : null}
                            <ControlToggleButton
                                active={showMaterials}
                                onClick={() => setShowMaterials(!showMaterials)}
                                icon={<FileText className="h-4 w-4" />}
                                color="blue"
                                label={t('materials_label')}
                                compact
                            />
                            {isClassroomMentor ? (
                                <ControlToggleButton
                                    active={showQuizzes}
                                    onClick={() => setShowQuizzes(!showQuizzes)}
                                    icon={<PenTool className="h-4 w-4" />}
                                    color="pink"
                                    label={t('test_label_short')}
                                    pulse={quizPanelHighlight}
                                    compact
                                />
                            ) : null}
                            {isClassroomMentor ? (
                                <div className="relative">
                                    {mentorChatNotice && !showChat ? (
                                        <span
                                            className="pointer-events-none absolute -bottom-1 left-1/2 z-50 h-2 w-2 -translate-x-1/2 translate-y-full rounded-full bg-emerald-400 shadow-lg animate-pulse"
                                            aria-hidden
                                        />
                                    ) : null}
                                    <ControlToggleButton
                                        active={showChat}
                                        onClick={() => setShowChat(!showChat)}
                                        icon={<MessageSquare className="h-4 w-4" />}
                                        color="emerald"
                                        label="Chat"
                                        pulse={mentorChatNotice && !showChat}
                                        compact
                                    />
                                </div>
                            ) : (
                                <ControlToggleButton
                                    active={showWhiteboardPanel}
                                    onClick={() => setShowWhiteboardPanel(!showWhiteboardPanel)}
                                    icon={<PenTool className="h-4 w-4" />}
                                    color="violet"
                                    label={t('whiteboard_label_short')}
                                    compact
                                />
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onLeave}
                            className="flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-red-200 transition-all hover:bg-red-500 hover:text-white sm:px-4 sm:py-2.5"
                        >
                            <LogOut className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline">{t('exit_btn')}</span>
                        </button>
                    </div>
                </header>

                {/* 3. SIDE OVERLAYS: Collapsible Panels */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {/* Left Panel: Materials */}
                    {showMaterials && (
                        <div className="pointer-events-auto fixed inset-0 z-[38] flex flex-col bg-[#060816]/95 p-3 pt-[max(4.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] animate-in fade-in duration-200 lg:absolute lg:top-[5rem] lg:bottom-24 lg:left-6 lg:right-auto lg:z-30 lg:h-auto lg:max-h-[min(80vh,calc(100%-7rem))] lg:w-80 lg:rounded-3xl lg:bg-transparent lg:p-0 lg:pt-0 slide-in-from-left">
                            <GlassCard className="flex h-full min-h-0 flex-col overflow-hidden !rounded-2xl border border-white/10 !bg-[#0c0f1a]/92 shadow-2xl backdrop-blur-2xl lg:!rounded-3xl lg:!bg-black/60">
                                <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
                                    <h2 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                                        <FileText className="h-5 w-5 shrink-0 text-sky-400" />
                                        {t('materials_label')}
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => setShowMaterials(false)}
                                        className="rounded-xl p-2 transition-colors hover:bg-white/10"
                                        aria-label={t('close_btn')}
                                    >
                                        <X className="h-5 w-5 opacity-60" />
                                    </button>
                                </div>
                                <div className="custom-scrollbar flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-5">
                                    {materials.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                                            <FileText className="w-12 h-12" />
                                            <p className="text-sm font-medium">{t('no_materials_label')}</p>
                                        </div>
                                    ) : (
                                        materials.map((mat, idx) => (
                                            <a
                                                key={mat.id || idx}
                                                href={mat.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="group flex min-h-[3.25rem] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 transition-all hover:border-sky-500/30 hover:bg-white/[0.08] active:scale-[0.99] sm:gap-4 sm:p-4"
                                            >
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 transition-transform group-hover:scale-105">
                                                    {mat.type === 'pdf' ? <FileText className="h-5 w-5" /> : mat.type === 'video' ? <Video className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-white/95 [overflow-wrap:anywhere]">{mat.title}</p>
                                                    <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">{(mat.type || 'fayl').toString()}</p>
                                                </div>
                                            </a>
                                        ))
                                    )}
                                </div>
                            </GlassCard>
                        </div>
                    )}

                    {/* O‘ng panel: darsda chat + test; mijozda doska */}
                    <div
                        className={`fixed inset-0 z-[39] flex min-h-0 flex-col gap-3 p-3 pt-[max(4.25rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] lg:absolute lg:inset-auto lg:bottom-24 lg:right-6 lg:top-[5rem] lg:z-30 lg:h-auto lg:max-h-[min(80vh,calc(100%-7rem))] lg:w-96 lg:max-w-[26rem] lg:flex-col lg:gap-4 lg:bg-transparent lg:p-0 lg:pt-0 ${
                            (isClassroomMentor && (showChat || showQuizzes)) || (!isClassroomMentor && showWhiteboardPanel)
                                ? 'pointer-events-auto animate-in fade-in duration-200 opacity-100 lg:slide-in-from-right'
                                : 'pointer-events-none invisible opacity-0'
                        }`}
                        aria-hidden={!((isClassroomMentor && (showChat || showQuizzes)) || (!isClassroomMentor && showWhiteboardPanel))}
                    >
                            <div className="flex h-full min-h-0 flex-col gap-3 lg:gap-4">
                                {isClassroomMentor && showQuizzes && (
                                    <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-2xl border border-white/10 !bg-[#0c0f1a]/92 shadow-2xl backdrop-blur-2xl lg:!rounded-3xl lg:!bg-black/60">
                                        <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5">
                                            <h2 className="flex items-center gap-2 text-base font-bold sm:text-lg">
                                                <PenTool className="h-5 w-5 shrink-0 text-fuchsia-400" />
                                                {t('quizzes_label')}
                                            </h2>
                                            <button
                                                type="button"
                                                onClick={() => setShowQuizzes(false)}
                                                className="rounded-xl p-2 transition-colors hover:bg-white/10"
                                                aria-label={t('close_btn')}
                                            >
                                                <X className="h-5 w-5 opacity-60" />
                                            </button>
                                        </div>
                                        <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-5">
                                            {quizzes.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                                                    <PenTool className="w-12 h-12" />
                                                    <p className="text-sm font-medium">{t('no_quizzes_active')}</p>
                                                </div>
                                            ) : (
                                                quizzes.map((quiz) => (
                                                    <div key={String(quiz.id)} className="mb-8 last:mb-0 animate-in fade-in zoom-in-95 duration-500">
                                                        <div className="mb-5 rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-500/10 to-sky-500/10 p-4 sm:p-5">
                                                            <h3 className="text-base font-bold text-white sm:text-lg [overflow-wrap:anywhere]">{quiz.title}</h3>
                                                            <p className="mt-1 text-xs font-medium text-white/50">
                                                                {t('quiz_questions_count', { count: quiz.questions?.length ?? 0 })}
                                                            </p>
                                                        </div>
                                                        {quiz.questions?.map((q: any, i: number) => {
                                                            const selectedOption = quizAnswers[String(quiz.id)]?.[i];
                                                            const qText = typeof q.text === 'string' ? q.text : String(q.text ?? q.question_text ?? '');
                                                            return (
                                                                <div key={i} className="mb-8 last:mb-0 scroll-mt-4">
                                                                    <div className="mb-3 flex gap-2 border-b border-white/5 pb-2">
                                                                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/25 text-xs font-black text-sky-200">
                                                                            {i + 1}
                                                                        </span>
                                                                        <div className="min-w-0 flex-1">
                                                                            <FormattedQuizText text={qText} />
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col gap-2 sm:gap-2.5">
                                                                        {(q.options || []).map((opt: any, oi: number) => {
                                                                            const letter = String.fromCharCode(65 + oi);
                                                                            const optId = opt.id != null ? String(opt.id) : `opt-${oi}`;
                                                                            const label = (opt.label || opt.text || opt.option_text || '').toString();
                                                                            const isSel = String(selectedOption) === String(opt.id);
                                                                            return (
                                                                                <button
                                                                                    type="button"
                                                                                    key={optId}
                                                                                    onClick={() => handleSelectAnswer(quiz.id, i, optId)}
                                                                                    className={`flex min-h-[3rem] w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all active:scale-[0.99] sm:min-h-0 sm:items-center sm:p-4 ${isSel ? 'border-sky-400 bg-sky-500/20 text-white shadow-lg shadow-sky-500/15' : 'border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:bg-white/[0.07]'}`}
                                                                                >
                                                                                    <div
                                                                                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black sm:mt-0 sm:h-8 sm:w-8 ${isSel ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/55'}`}
                                                                                    >
                                                                                        {letter}
                                                                                    </div>
                                                                                    <span className="text-sm font-medium leading-snug [overflow-wrap:anywhere]">{label}</span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSubmitQuiz(quiz.id)}
                                                            className="mt-2 w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-sky-500/25 transition-all hover:brightness-110 active:scale-[0.98] sm:py-4"
                                                        >
                                                            {t('send_answers_btn')}
                                                        </button>
                                                    </div>
                                                )))}
                                        </div>
                                    </GlassCard>
                                )}
                                {isClassroomMentor ? (
                                    <div
                                        className={showChat ? 'flex-1 min-h-0 flex flex-col' : 'hidden'}
                                        aria-hidden={!showChat}
                                    >
                                        <LiveChatPanel
                                            socket={socket}
                                            sessionId={sessionId}
                                            user={user}
                                            className="flex-1 !bg-black/60 backdrop-blur-2xl !border-white/10 shadow-2xl !rounded-3xl min-h-0"
                                        />
                                    </div>
                                ) : (
                                    showWhiteboardPanel && (
                                        <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden !rounded-2xl border border-white/10 !bg-[#0c0f1a]/92 shadow-2xl backdrop-blur-2xl lg:!rounded-3xl lg:!bg-black/60 min-h-[min(55vh,28rem)]">
                                            <div className="flex items-center justify-between border-b border-white/10 p-3 sm:p-4">
                                                <h2 className="flex items-center gap-2 text-sm font-bold sm:text-base">
                                                    <PenTool className="h-4 w-4 shrink-0 text-violet-300" />
                                                    {t('whiteboard_label_short')}
                                                </h2>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowWhiteboardPanel(false)}
                                                    className="rounded-xl p-2 transition-colors hover:bg-white/10"
                                                    aria-label={t('close_panel_label')}
                                                >
                                                    <X className="h-5 w-5 opacity-60" />
                                                </button>
                                            </div>
                                            <div className="min-h-0 flex-1 p-2 sm:p-3">
                                                {socket ? (
                                                    <div className="h-full min-h-[240px]">
                                                        <LiveWhiteboard
                                                            socket={socket}
                                                            sessionId={sessionId}
                                                            isMentor={false}
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        </GlassCard>
                                    )
                                )}
                            </div>
                    </div>
                </div>

                {/* 4. Mobil: pastki action bar (desktopda boshqaruvlar headerda) */}
                <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black via-black/90 to-transparent pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-10 lg:hidden">
                    <div className="pointer-events-auto mx-auto flex max-w-lg flex-wrap items-center justify-center gap-2 px-2">
                        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0c0f1a]/90 px-2 py-2 shadow-xl backdrop-blur-xl">
                            <StudentMediaControls />
                        </div>
                        {isClassroomMentor ? (
                            <button
                                type="button"
                                onClick={toggleHand}
                                className={`flex min-h-[44px] items-center gap-2 rounded-2xl px-3 py-2 text-[10px] font-bold uppercase tracking-wide ${handRaised ? 'border border-amber-400/40 bg-amber-500 text-white shadow-lg' : 'border border-white/10 bg-[#0c0f1a]/90 text-white/90 backdrop-blur-xl'}`}
                            >
                                <Hand className="h-5 w-5 shrink-0" />
                                <span className="max-w-[5.5rem] leading-tight">
                                    {handRaised ? t('hand_down_label_short') : t('hand_label_short')}
                                </span>
                            </button>
                        ) : null}
                        <ControlToggleButton
                            active={showMaterials}
                            onClick={() => setShowMaterials(!showMaterials)}
                            icon={<FileText className="h-5 w-5" />}
                            color="blue"
                            label={t('materials_label')}
                            mobileDock
                        />
                        {isClassroomMentor ? (
                            <ControlToggleButton
                                active={showQuizzes}
                                onClick={() => setShowQuizzes(!showQuizzes)}
                                icon={<PenTool className="h-5 w-5" />}
                                color="pink"
                                label={t('test_label_short')}
                                pulse={quizPanelHighlight}
                                mobileDock
                            />
                        ) : null}
                        {isClassroomMentor ? (
                            <div className="relative">
                                {mentorChatNotice && !showChat ? (
                                    <span
                                        className="pointer-events-none absolute -top-12 left-1/2 z-50 max-w-[min(220px,calc(100vw-2rem))] -translate-x-1/2 animate-in fade-in zoom-in-95 rounded-xl border border-emerald-400/40 bg-emerald-700/95 px-2.5 py-1.5 text-center text-[9px] font-black uppercase leading-tight tracking-wide text-white shadow-lg"
                                        role="status"
                                    >
                                        {t('mentor_chat_notice_text')}
                                    </span>
                                ) : null}
                                <ControlToggleButton
                                    active={showChat}
                                    onClick={() => setShowChat(!showChat)}
                                    icon={<MessageSquare className="h-5 w-5" />}
                                    color="emerald"
                                    label="Chat"
                                    pulse={mentorChatNotice && !showChat}
                                    mobileDock
                                />
                            </div>
                        ) : (
                            <ControlToggleButton
                                active={showWhiteboardPanel}
                                onClick={() => setShowWhiteboardPanel(!showWhiteboardPanel)}
                                icon={<PenTool className="h-5 w-5" />}
                                color="violet"
                                label={t('whiteboard_label_short')}
                                mobileDock
                            />
                        )}
                    </div>
                </div>

                {/* 5. FLOATING COMPONENT: Whiteboard / Screen Share Info (If needed) */}
                {/* Handled by LiveVideoFrame */}
            </LiveKitRoom>

            {/* Quick Poll Modal Overlay */}
            {isClassroomMentor && activePoll && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="relative w-full max-h-[90dvh] overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101422] p-5 shadow-2xl animate-in zoom-in-95 duration-200 sm:max-w-md sm:rounded-[2rem] sm:p-8">
                        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 sm:rounded-t-[2rem]" />
                        <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-white sm:gap-3 sm:text-2xl">
                            <span className="rounded-xl bg-sky-500 p-1.5 text-base sm:p-2 sm:text-lg">⚡</span>
                            {t('quick_poll_label')}
                        </h2>
                        <div className="mb-6 text-base font-medium leading-relaxed text-white/85">
                            <FormattedQuizText text={String(activePoll.questions?.[0]?.text ?? '')} />
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                            {(activePoll.questions?.[0]?.options || []).map((opt: any, oi: number) => (
                                <button
                                    type="button"
                                    key={opt.id ?? oi}
                                    onClick={() => handleAnswerPoll(activePoll.id, 0, String(opt.id))}
                                    className="min-h-[3rem] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-left text-sm font-bold text-white transition-all hover:border-sky-400/50 hover:bg-sky-500/20 active:scale-[0.98] sm:py-4 sm:text-center"
                                >
                                    <span className="mr-2 font-black text-sky-300">{String.fromCharCode(65 + oi)}.</span>
                                    {opt.text}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Ustozdan kelgan mikrofon boshqaruvi (socket → LiveKit) */
function StudentMentorMediaSync({ sessionId }: { sessionId: string }) {
    const { socket } = useSocket();
    const { localParticipant } = useLocalParticipant();
    const connectionState = useConnectionState();

    useEffect(() => {
        if (!socket || connectionState !== ConnectionState.Connected || !localParticipant) return;
        const onCmd = (p: { sessionId?: string; kind?: string; enabled?: boolean }) => {
            if (p == null || String(p.sessionId) !== String(sessionId)) return;
            if (p.kind === 'mic') {
                void localParticipant.setMicrophoneEnabled(!!p.enabled);
            }
        };
        socket.on('mentor_media_command', onCmd);
        return () => {
            socket.off('mentor_media_command', onCmd);
        };
    }, [socket, sessionId, localParticipant, connectionState]);

    return null;
}

function StudentMediaControls() {
    const { t } = useLanguage();
    const { localParticipant } = useLocalParticipant();
    const connectionState = useConnectionState();
    const [isMicEnabled, setIsMicEnabled] = useState(true);
    const [isCamEnabled, setIsCamEnabled] = useState(true);

    useEffect(() => {
        if (connectionState !== ConnectionState.Connected || !localParticipant) return;
        const t = setTimeout(() => {
            localParticipant.setMicrophoneEnabled(true).then(() => setIsMicEnabled(true)).catch((e) => {
                console.warn('Student mic:', e);
                setIsMicEnabled(false);
            });
            localParticipant.setCameraEnabled(true).then(() => setIsCamEnabled(true)).catch((e) => {
                console.warn('Student camera (kamera yo\'q bo\'lishi mumkin):', e);
                setIsCamEnabled(false);
            });
        }, 600);
        return () => clearTimeout(t);
    }, [connectionState, localParticipant]);

    const toggleMic = async () => {
        const nextState = !isMicEnabled;
        await localParticipant.setMicrophoneEnabled(nextState);
        setIsMicEnabled(nextState);
    };

    const toggleCam = async () => {
        const nextState = !isCamEnabled;
        await localParticipant.setCameraEnabled(nextState);
        setIsCamEnabled(nextState);
    };

    return (
        <div className="flex items-center gap-1.5 sm:gap-2">
            <button
                type="button"
                onClick={toggleMic}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all lg:h-10 lg:w-10 ${!isMicEnabled ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-white/12 text-white/80 hover:bg-white/20'}`}
                title={isMicEnabled ? t('mic_off_title') : t('mic_on_title')}
            >
                {isMicEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            <button
                type="button"
                onClick={toggleCam}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all lg:h-10 lg:w-10 ${!isCamEnabled ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-white/12 text-white/80 hover:bg-white/20'}`}
                title={isCamEnabled ? t('cam_off_title') : t('cam_on_title')}
            >
                {isCamEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
        </div>
    );
}

interface ControlButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    color: 'blue' | 'pink' | 'emerald' | 'violet';
    label: string;
    pulse?: boolean;
    /** Header (desktop): ixcham, faqat ikonka + sr-only */
    compact?: boolean;
    /** Mobil pastki bar: katta bosish maydoni + qisqa yozuv */
    mobileDock?: boolean;
}

function ControlToggleButton({
    active,
    onClick,
    icon,
    color,
    label,
    pulse,
    compact,
    mobileDock,
}: ControlButtonProps) {
    const colorClasses = {
        blue: active
            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
            : 'text-sky-300 hover:bg-sky-500/15',
        pink: active
            ? 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-500/30'
            : 'text-fuchsia-300 hover:bg-fuchsia-500/15',
        emerald: active
            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
            : 'text-emerald-300 hover:bg-emerald-500/15',
        violet: active
            ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30'
            : 'text-violet-300 hover:bg-violet-500/15',
    };

    const layout = mobileDock
        ? 'min-h-[3rem] min-w-[3.25rem] flex-col gap-0.5 rounded-2xl border border-white/10 bg-[#0c0f1a]/90 px-2 py-2 text-[9px] backdrop-blur-xl'
        : compact
          ? 'gap-1.5 rounded-xl px-2.5 py-2 text-[10px]'
          : 'gap-2.5 rounded-full px-4 py-2.5 text-xs';

    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={onClick}
            className={`group relative flex items-center justify-center font-bold uppercase tracking-wide transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 ${colorClasses[color]} ${layout} ${active && !mobileDock ? 'shadow-lg sm:scale-[1.02]' : ''} ${pulse ? 'ring-2 ring-amber-400/90 ring-offset-2 ring-offset-[#05060c] animate-pulse' : ''}`}
        >
            <span className="transition-transform group-hover:scale-105">{icon}</span>
            {mobileDock ? <span className="max-w-[4rem] text-center leading-none">{label}</span> : null}
            {compact && !mobileDock ? <span className="sr-only">{label}</span> : null}
            {!compact && !mobileDock ? <span className="tracking-widest">{label}</span> : null}
        </button>
    );
}


