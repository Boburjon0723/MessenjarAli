"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { apiFetch } from '@/lib/api';
import {
    LiveKitRoom,
    RoomAudioRenderer,
    useLocalParticipant,
    useRemoteParticipants,
    useTracks,
    useConnectionState,
} from '@livekit/components-react';
import { Track, ConnectionState } from 'livekit-client';
import { LiveVideoFrame } from './shared/LiveVideoFrame';
import RecordingPlaybackModal from './shared/RecordingPlaybackModal';
import '@livekit/components-styles';

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
} from 'lucide-react';
import {
    getExpertPanelMode,
    getExpertPanelLabels,
    getConsultPanelInviteSessionStyle,
} from '@/lib/expert-roles';
import { isExpertListingChat } from '@/lib/listing-chat';
import { getExpertComplianceNotice } from '@/lib/expert-compliance-copy';
import { getPublicApiUrl } from '@/lib/public-origin';
import { getToken } from '@/lib/auth-storage';
import { useLanguage } from '@/context/LanguageContext';
import type { Language } from '@/lib/translations';

const MAX_RECORDING_MB = 1000;

/** Huquqshunos chap panel: sudrab kengaytirish */
const CONSULT_LEFT_PANEL_MIN_PX = 220;
const CONSULT_LEFT_PANEL_MAX_PX = 640;
const CONSULT_LEFT_PANEL_DEFAULT_PX = 288;

function stripHtmlLite(s: string) {
    return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function flattenDdgRelatedTopics(raw: unknown): { title: string; url: string }[] {
    const out: { title: string; url: string }[] = [];
    const walk = (items: unknown) => {
        if (!Array.isArray(items)) return;
        for (const t of items) {
            if (!t || typeof t !== 'object') continue;
            const o = t as { Topics?: unknown; Text?: string; FirstURL?: string };
            if (Array.isArray(o.Topics)) walk(o.Topics);
            else if (o.Text && o.FirstURL) {
                out.push({ title: stripHtmlLite(String(o.Text)), url: String(o.FirstURL) });
            }
        }
    };
    walk(raw);
    return out.slice(0, 18);
}

function formatMaliUi(n: number, lang: Language) {
    if (n == null || Number.isNaN(n)) return '—';
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ';
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);
}

function TabItem({ active, onClick, icon, label, pulse }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, pulse?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300
                ${active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'}
            `}
        >
            {icon}
            {label}
            {pulse && !active && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
            )}
        </button>
    );
}

type ConsultChatFinancialPrep = {
    clientUserId: string;
    clientName: string | null;
    clientLockedBalance: number;
    expertServicePrice: number | null;
    session: { id: string; status: string; amountMali: number } | null;
};

/** DB (question_text / option_text) va frontend shakllarini birlashtirish */
function normalizeQuizFromApi(q: any) {
    if (!q) return q;
    return {
        ...q,
        questions: (q.questions || []).map((qq: any) => ({
            ...qq,
            text: qq.text ?? qq.question_text ?? '',
            typeof: qq.typeof ?? qq.question_type ?? 'multiple_choice',
            options: (qq.options || []).map((o: any, oi: number) => ({
                ...o,
                id: o.id != null ? String(o.id) : `opt-${oi}`,
                text: o.text ?? o.option_text ?? '',
                label: o.option_text ?? o.text ?? '',
                isCorrect: Boolean(o.is_correct ?? o.isCorrect),
            })),
        })),
    };
}

function buildQuizChatSummary(q: any, t: any): string {
    const n = normalizeQuizFromApi(q);
    const lines = [`📝 **${t('quiz_label')}:** ${n.title || t('test_label')}`];
    (n.questions || []).forEach((qq: any, i: number) => {
        lines.push(`${i + 1}. ${qq.text || ''}`);
        (qq.options || []).forEach((o: any, j: number) => {
            lines.push(`   ${String.fromCharCode(65 + j)}. ${o.text || ''}`);
        });
    });
    lines.push(`_${t('quiz_chat_notice')}_`);
    return lines.join('\n');
}

interface SpecialistDashboardProps {
    user: any;
    sessionId?: string;
    socket?: any;
    onBack?: () => void;
    /** Shaxsiy chat tanlanganda — asosiy video xonasi shu chat ID ga o‘tadi */
    onConsultSessionChat?: (chatId: string) => void;
    /** Konsultatsiya: mijoz bilan suhbat Yakunlash — chat o‘chirilgandan keyin */
    onConsultClientEnded?: (chatId: string) => void;
}

export default function SpecialistDashboard({ user, sessionId, socket, onBack, onConsultSessionChat, onConsultClientEnded }: SpecialistDashboardProps) {
    const { t, language } = useLanguage();
    const { showSuccess, showError } = useNotification();
    const { confirm: notifyConfirm } = useConfirm();
    const API_URL = getPublicApiUrl();
    const getAvatarUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const expertPanelMode = getExpertPanelMode(user);
    const panelLabels = getExpertPanelLabels(expertPanelMode, t);
    const showMentorClassroomTools = expertPanelMode === 'mentor';

    const sessionWord = panelLabels.sessionNotifyWord;
    const endSessionButtonLabel = `${sessionWord.charAt(0).toUpperCase()}${sessionWord.slice(1)}${t('label_suffix_finish')}`;
    const activeRoomSelectLabel = showMentorClassroomTools ? t('active_lesson_group') : t('active_chat_group');
    const waitAttendeesEmpty = showMentorClassroomTools
        ? t('wait_students_join')
        : t('wait_participants_join');
    const participantFallback = showMentorClassroomTools ? t('self_role_student') : t('self_role_client');
    const kickParticipantTitle = showMentorClassroomTools ? t('kick_from_lesson') : t('kick_from_session');
    const historySectionTitle = showMentorClassroomTools ? t('completed_lessons') : t('completed_sessions');
    const historyEmptyHint = showMentorClassroomTools
        ? t('no_lesson_history')
        : t('no_session_history');
    const historyRecordingFallbackTitle = showMentorClassroomTools ? t('lesson_recording') : t('session_recording');
    const lessonPickModalTitle = showMentorClassroomTools
        ? t('lesson_pick_modal_title_mentor')
        : t('lesson_pick_modal_title_general');
    const lessonPickModalHint = showMentorClassroomTools
        ? t('lesson_pick_modal_hint_mentor')
        : t('lesson_pick_modal_hint_general');
    const specialistDisplayName =
        user?.name ||
        (showMentorClassroomTools ? t('expert_role_mentor') : expertPanelMode === 'legal' ? t('expert_role_legal') : t('expert_role_consult'));

    const [activeTab, setActiveTab] = useState<'attendees' | 'materials' | 'history'>('attendees');
    const [sessionNoticeToasts, setSessionNoticeToasts] = useState<Array<{ id: number; text: string }>>([]);
    const pushSessionNotice = useCallback((text: string) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setSessionNoticeToasts((prev) => [...prev, { id, text }]);
        window.setTimeout(() => {
            setSessionNoticeToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);
    }, []);

    const enrichAttendeeProfile = useCallback(async (userId: string) => {
        const uuidRe =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRe.test(userId)) return;
        try {
            const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}`);
            if (!res.ok) return;
            const data = await res.json();
            const av = data?.avatar_url;
            const nm = [data?.name, data?.surname].filter(Boolean).join(' ').trim();
            setAttendees((prev) =>
                prev.map((p) =>
                    String(p.id) !== userId
                        ? p
                        : {
                            ...p,
                            ...(av ? { avatar_url: av, avatar: av } : {}),
                            ...(nm ? { name: nm } : {}),
                        }
                )
            );
        } catch {
            /* ignore */
        }
    }, []);
    const [sessionNotes, setSessionNotes] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [chatInput, setChatInput] = useState('');
    // Dynamic Materials State
    const [materials, setMaterials] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Groups State
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState(sessionId || '');
    const [showNewGroupPrompt, setShowNewGroupPrompt] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupTime, setNewGroupTime] = useState('');

    /** Yozib olish / API: haqiqiy xona ID (demo-session-id emas); konsultatsiyada `sessionId` ham ishlatiladi. */
    const effectiveRoomId =
        (selectedGroupId && selectedGroupId !== 'demo-session-id'
            ? selectedGroupId
            : sessionId && sessionId !== 'demo-session-id'
                ? sessionId
                : '') || '';
    const socketRoomId =
        selectedGroupId ||
        (sessionId && sessionId !== 'demo-session-id' ? sessionId : '');

    // Live Quiz State
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [activeQuiz, setActiveQuiz] = useState<any>(null); // currently running quiz
    const [quizResults, setQuizResults] = useState<{ [studentId: string]: number }>({}); // incoming scores (faqat viktorina)
    /** Tezkor so‘rov: har bir variant id → nechta talaba tanladi */
    const [quickPollStats, setQuickPollStats] = useState<{
        quizId: string;
        byStudent: Record<string, string>;
        counts: Record<string, number>;
    } | null>(null);
    const activeQuizRef = useRef<any>(null);

    useEffect(() => {
        activeQuizRef.current = activeQuiz;
    }, [activeQuiz]);

    useEffect(() => {
        if (!activeQuiz?.isQuickPoll || activeQuiz?.id == null) {
            setQuickPollStats(null);
            return;
        }
        setQuickPollStats({
            quizId: String(activeQuiz.id),
            byStudent: {},
            counts: {},
        });
    }, [activeQuiz?.id, activeQuiz?.isQuickPoll]);
    const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
    const [newQuizTitle, setNewQuizTitle] = useState('');
    const [newQuestions, setNewQuestions] = useState([{ text: '', typeof: 'multiple_choice', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);

    // Qo'l ko'tarish / Savolim bor — talaba signali
    const [handsRaised, setHandsRaised] = useState<Record<string, string>>({});

    // Booking Requests State

    // History & Playback State
    const [pastSessions, setPastSessions] = useState<any[]>([]);
    const [playbackSession, setPlaybackSession] = useState<any>(null);

    // Chat State
    const [chatMessages, setChatMessages] = useState<any[]>([]);
    const [isLessonStarted, setIsLessonStarted] = useState(false);

    // Media State
    const [isMicOn, setIsMicOn] = useState(false);
    const [isCamOn, setIsCamOn] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploadingRecording, setIsUploadingRecording] = useState(false);
    const recordingStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

    // Modal States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [globalError, setGlobalError] = useState<string | null>(null);
    /** Materiallar/viktorinalar API 404 yoki xato — butun panelni bloklamasdan */
    const [sessionResourcesNote, setSessionResourcesNote] = useState<string | null>(null);
    /** Bir nechta guruhda qaysi biri uchun dars boshlash */
    const [showStartLessonModal, setShowStartLessonModal] = useState(false);
    const [lessonPickGroupId, setLessonPickGroupId] = useState<string>('');

    // LiveKit States
    const [lkToken, setLkToken] = useState<string>("");
    const [lkWsUrl, setLkWsUrl] = useState<string>("");

    // Participants & Video Tracks

    const [attendees, setAttendees] = useState<any[]>([]);
    const [recordingUploadError, setRecordingUploadError] = useState<string | null>(null);
    const pendingRecordingRef = useRef<{ blob: Blob; roomId: string; mimeType: string; ext: string } | null>(null);

    React.useEffect(() => {
        setAttendees([]);
    }, [selectedGroupId]);

    /** Konsultant / advokat: faqat ochiq shaxsiy chat ID — boshqa ustoz guruhlarini yuklamaslik */
    React.useEffect(() => {
        if (!showMentorClassroomTools && sessionId && sessionId !== 'demo-session-id') {
            setSelectedGroupId(sessionId);
            setGroups([]);
        }
    }, [showMentorClassroomTools, sessionId]);

    React.useEffect(() => {
        if (showMentorClassroomTools) return;
        setIsCreatingQuiz(false);
        setActiveQuiz(null);
        setQuizResults({});
    }, [showMentorClassroomTools]);

    const loadSessionResources = useCallback(async () => {
        if (!selectedGroupId) return;
        const hints: string[] = [];
        try {
            const resMat = await apiFetch(`/api/sessions/${selectedGroupId}/materials`);
            if (resMat.status === 404) {
                setMaterials([]);
                hints.push(t('materials_schedule_empty'));
            } else if (resMat.ok) {
                const data = await resMat.json();
                setMaterials(Array.isArray(data) ? data : []);
            } else {
                setMaterials([]);
                hints.push(t('materials_server_error', { status: resMat.status }) as string);
            }
        } catch (e) {
            console.error('fetch materials', e);
            setMaterials([]);
            hints.push(t('materials_network_error') as string);
        }

        try {
            const resQz = await apiFetch(`/api/sessions/${selectedGroupId}/quizzes`);
            if (resQz.status === 404) {
                setQuizzes([]);
                if (showMentorClassroomTools) {
                    hints.push(t('quizzes_empty') as string);
                }
            } else if (resQz.ok) {
                const data = await resQz.json();
                setQuizzes(Array.isArray(data) ? data.map((q: any) => normalizeQuizFromApi(q)) : []);
            } else {
                setQuizzes([]);
                if (showMentorClassroomTools) {
                    hints.push(t('quizzes_status_error', { status: resQz.status }) as string);
                }
            }
        } catch (e) {
            console.error('fetch quizzes', e);
            setQuizzes([]);
        }
        setSessionResourcesNote(hints.length > 0 ? hints.join(' ') : null);
    }, [selectedGroupId, showMentorClassroomTools, t]);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await apiFetch(`/api/sessions/history`);
            if (res.ok) {
                const data = await res.json();
                setPastSessions(data);
            }
        } catch (err) {
            console.error("Failed to fetch session history", err);
        }
    }, []);

    const fetchGroups = useCallback(async () => {
        if (!user?.id) return;
        if (!showMentorClassroomTools) {
            setGroups([]);
            return;
        }
        try {
            const res = await apiFetch(`/api/chats/expert/${user.id}`);
            if (res.ok) {
                const data = await res.json();
                setGroups(data);
                if ((!sessionId || sessionId === 'demo-session-id') && data.length > 0) {
                    setSelectedGroupId(data[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch expert groups", err);
            setGlobalError(t('groups_load_error'));
        }
    }, [user?.id, showMentorClassroomTools, sessionId]);

    const fetchLiveKitToken = useCallback(async () => {
        if (!selectedGroupId || selectedGroupId === 'demo-session-id') return;
        try {
            const res = await apiFetch(`/api/livekit/token?room=${selectedGroupId}&username=${encodeURIComponent(user?.name || 'Mentor')}`);
            if (res.ok) {
                const data = await res.json();
                setLkToken(data.token);
                setLkWsUrl(data.wsUrl);
            }
        } catch (err) {
            console.error("[SpecialistDashboard] Error fetching LiveKit token:", err);
        }
    }, [selectedGroupId, user?.name]);

    useEffect(() => {
        loadSessionResources();
        fetchHistory();
        fetchGroups();
        if (selectedGroupId) fetchLiveKitToken();
    }, [loadSessionResources, fetchHistory, fetchGroups, fetchLiveKitToken, selectedGroupId]);

    useEffect(() => {
        if (socket && selectedGroupId) {
            socket.emit('session_join', { sessionId: selectedGroupId });

            const handleNewMaterial = (newMaterial: any) => {
                setMaterials(prev => prev.some(m => m.id === newMaterial.id) ? prev : [newMaterial, ...prev]);
            };

            const handleQuizResultUpdate = (resultData: any) => {
                const aq = activeQuizRef.current;
                const answers = resultData?.answers;
                const hasAnswers = answers != null && typeof answers === 'object';
                if (hasAnswers && resultData.score === undefined && aq?.isQuickPoll && String(resultData.quizId) === String(aq.id)) {
                    const sid = String(resultData.studentId ?? '');
                    if (!sid) return;
                    const optionRaw = answers[0] ?? answers['0'];
                    if (optionRaw == null) return;
                    const optionId = String(optionRaw);

                    setQuickPollStats((prev) => {
                        const qid = String(resultData.quizId);
                        const base = prev && String(prev.quizId) === qid ? prev : { quizId: qid, byStudent: {}, counts: {} };
                        const byStudent = { ...base.byStudent };
                        const counts = { ...base.counts };
                        const old = byStudent[sid];
                        if (old != null) counts[old] = Math.max(0, (counts[old] || 0) - 1);
                        byStudent[sid] = optionId;
                        counts[optionId] = (counts[optionId] || 0) + 1;
                        return { ...base, byStudent, counts };
                    });
                    return;
                }
                if (resultData?.studentId == null) return;
                setQuizResults((prev) => ({ ...prev, [String(resultData.studentId)]: Number(resultData.score) || 0 }));
            };

            const handleNewBooking = () => { };
            const handleNewChatMessage = (msg: any) => {
                const room = msg.roomId ?? msg.chat_id ?? msg.room_id;
                if (room != null && String(room) !== String(selectedGroupId)) return;
                const formattedMsg = {
                    id: msg.id || Date.now(),
                    text: msg.content || msg.text || '',
                    sender: msg.sender_name || msg.sender || (t('user_label') as string),
                    avatar: msg.sender_avatar || msg.avatar || "https://i.pravatar.cc/150?img=5",
                    timestamp: msg.created_at || new Date().toISOString()
                };
                setChatMessages(prev => prev.some(p => p.id === formattedMsg.id) ? prev : [...prev, formattedMsg]);
            };

            const mentorUserId = user?.id != null ? String(user.id) : '';
            const handleParticipantJoined = (participant: any) => {
                if (participant?.isMentor) return;
                const rawId = participant?.id ?? participant?.userId;
                const pid = rawId != null ? String(rawId).trim() : '';
                if (!pid || (mentorUserId && pid === mentorUserId)) return;

                setAttendees((prev) => {
                    if (prev.some((p) => String(p.id) === pid)) return prev;
                    pushSessionNotice(t('student_joined').replace('{name}', participant.name || t('self_role_student')));
                    void enrichAttendeeProfile(pid);
                    return [...prev, { ...participant, id: pid }];
                });
            };

            const handleParticipantLeft = (arg: string | { userId?: string }) => {
                const pid = (typeof arg === 'string' ? arg : String(arg?.userId || '')).trim();
                if (!pid) return;
                setAttendees((prev) => {
                    const leaving = prev.find((p) => String(p.id) === pid);
                    if (leaving) pushSessionNotice(t('student_left').replace('{name}', leaving.name || t('self_role_student')));
                    return prev.filter((p) => String(p.id) !== pid);
                });
                setHandsRaised((prev) => { const n = { ...prev }; delete n[pid]; return n; });
            };

            const handleWhiteboardToggle = (data: any) => {
                const open = typeof data === 'boolean' ? data : Boolean(data?.isOpen);
                if (typeof data === 'object' && data?.sessionId != null && String(data.sessionId) !== String(selectedGroupId)) return;
                setIsWhiteboardOpen(open);
            };

            const handleHandRaised = (data: any) => setHandsRaised(prev => ({ ...prev, [String(data.studentId)]: data.studentName || t('self_role_student') }));
            const handleHandLowered = (data: any) => setHandsRaised(prev => { const n = { ...prev }; delete n[String(data.studentId)]; return n; });

            socket.on('material_new', handleNewMaterial);
            socket.on('quiz_result_update', handleQuizResultUpdate);
            socket.on('new_notification', handleNewBooking);
            socket.on('session_chat:receive', handleNewChatMessage);
            socket.on('receive_message', handleNewChatMessage);
            socket.on('participant_joined', handleParticipantJoined);
            socket.on('participant_left', handleParticipantLeft);
            socket.on('whiteboard:toggle', handleWhiteboardToggle);
            socket.on('hand_raised', handleHandRaised);
            socket.on('hand_lowered', handleHandLowered);

            const handleReconnect = () => {
                loadSessionResources();
                fetchHistory();
                fetchGroups();
                fetchLiveKitToken();
            };
            window.addEventListener('socket_reconnected', handleReconnect);

            return () => {
                socket.off('material_new', handleNewMaterial);
                socket.off('quiz_result_update', handleQuizResultUpdate);
                socket.off('new_notification', handleNewBooking);
                socket.off('session_chat:receive', handleNewChatMessage);
                socket.off('receive_message', handleNewChatMessage);
                socket.off('participant_joined', handleParticipantJoined);
                socket.off('participant_left', handleParticipantLeft);
                socket.off('whiteboard:toggle', handleWhiteboardToggle);
                socket.off('hand_raised', handleHandRaised);
                socket.off('hand_lowered', handleHandLowered);
                window.removeEventListener('socket_reconnected', handleReconnect);
            };
        }
    }, [socket, selectedGroupId, loadSessionResources, fetchHistory, fetchGroups, fetchLiveKitToken, pushSessionNotice, enrichAttendeeProfile, user?.id, t]);

    const handleCreateQuiz = async () => {
        if (!newQuizTitle || !selectedGroupId) return;
        try {
            const res = await apiFetch(`/api/sessions/${selectedGroupId}/quizzes`, {
                method: 'POST',
                body: JSON.stringify({ title: newQuizTitle, questions: newQuestions })
            });


            if (res.ok) {
                const created = await res.json().catch(() => ({} as { quizId?: string }));
                const ref = await apiFetch(`/api/sessions/${selectedGroupId}/quizzes`);
                if (ref.ok) {
                    const list = await ref.json();
                    setQuizzes(Array.isArray(list) ? list.map((q: any) => normalizeQuizFromApi(q)) : []);
                }
                const qid = created?.quizId != null ? String(created.quizId) : '';
                if (qid && socket && selectedGroupId) {
                    try {
                        const fullRes = await apiFetch(`/api/quizzes/${encodeURIComponent(qid)}`);
                        if (fullRes.ok) {
                            const full = await fullRes.json();
                            handleBroadcastQuiz(full);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
                setIsCreatingQuiz(false);
                setNewQuizTitle('');
                setNewQuestions([{ text: '', typeof: 'multiple_choice', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }]);
                showSuccess(t('quiz_created_success'));
            } else {
                const err = await res.json().catch(() => ({}));
                showError(err?.message || t('quiz_save_error'));
            }
        } catch (err) {
            console.error(err);
            showError(t('quiz_create_error'));
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim() || !user?.id) return;
        try {
            const res = await apiFetch('/api/chats', {
                method: 'POST',
                body: JSON.stringify({
                    name: newGroupName,
                    type: 'group',
                    specialistId: user.id,
                    scheduled_time: newGroupTime
                })
            });
            if (res.ok) {
                const newGroup = await res.json();
                setGroups(prev => [newGroup, ...prev]);
                setShowNewGroupPrompt(false);
                setNewGroupName('');
                setNewGroupTime('');
                showSuccess(t('group_created_success'));
            } else {
                const data = await res.json().catch(() => ({}));
                showError(t('group_create_error'));
            }
        } catch (err) {
            console.error(err);
            showError(t('network_error'));
        }
    };

    const handleDeleteQuiz = async (quizId: string | number) => {
        const id = String(quizId);
        const ok = await notifyConfirm({
            title: t('delete_confirm_title'),
            description: t('quiz_delete_confirm_desc'),
            variant: 'danger',
            confirmLabel: t('delete_btn')
        });
        if (!ok) return;

        try {
            const res = await apiFetch(`/api/quizzes/${encodeURIComponent(id)}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                showError(err?.message || 'O‘chirilmadi.');
                return;
            }
            showSuccess(t('quiz_deleted_success'));
            setQuizzes((prev) => prev.filter((q) => String(q.id) !== id));
            setActiveQuiz((cur: any) => (cur && String(cur.id) === id ? null : cur));
        } catch {
            showError(t('network_error'));
        }
    };

    const handleBroadcastQuiz = (quiz: any) => {
        if (!socket || !selectedGroupId) return;
        const base = normalizeQuizFromApi(quiz);
        const quizDetails = {
            ...base,
            questions: (base.questions || []).map((q: any) => ({
                ...q,
                options: (q.options || []).map((o: any, oi: number) => ({
                    ...o,
                    id: o.id ?? String(oi),
                    text: o.text ?? o.label ?? '',
                })),
            })),
        };
        socket.emit('quiz_start', { sessionId: selectedGroupId, quizId: quiz.id, quizDetails });
        socket.emit('send_message', {
            roomId: selectedGroupId,
            content: buildQuizChatSummary(base, t),
            type: 'text',
        });
        setActiveQuiz(quizDetails);
        setQuizResults({});
    };

    const handleQuickPoll = () => {
        if (!socket || !selectedGroupId) return;
        const quickPoll = {
            id: `poll-${Date.now()}`,
            title: 'Tezkor So\'rov',
            isQuickPoll: true,
            questions: [
                {
                    text: 'Hozirgi mavzu tushunarlimi?',
                    typeof: 'multiple_choice',
                    options: [
                        { id: '1', text: 'Ha, tushunarli', isCorrect: true },
                        { id: '2', text: "Yo'q, tushunarsiz", isCorrect: false }
                    ]
                }
            ]
        };
        socket.emit('quiz_start', { sessionId: selectedGroupId, quizId: quickPoll.id, quizDetails: quickPoll });
        socket.emit('send_message', {
            roomId: selectedGroupId,
            content:
                '⚡ **Tezkor so‘rov:** Mavzu tushunarlimi?\n• Ha, tushunarli\n• Yo‘q, tushunarsiz\n_(Talabalar dars oynasida tanlaydi.)_',
            type: 'text',
        });
        setActiveQuiz(quickPoll);
        setQuizResults({});
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedGroupId) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('material', file);

        try {
            const token = getToken();
            if (!token) {
                showError(t('error_invalid_credentials'));
                return;
            }
            const res = await fetch(`${getPublicApiUrl()}/api/sessions/${selectedGroupId}/materials`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });


            if (res.ok) {
                const newMaterial = await res.json();
                if (socket) {
                    socket.emit('material_uploaded', { sessionId: selectedGroupId, material: newMaterial });
                    const url = newMaterial.file_url?.startsWith('http') ? newMaterial.file_url : `${getPublicApiUrl()}${newMaterial.file_url?.startsWith('/') ? '' : '/'}${newMaterial.file_url || ''}`;
                    socket.emit('send_message', { roomId: selectedGroupId, content: `📎 **${newMaterial.title || (t('file') as string)}**\n${url}`, type: 'text' });
                }
                setMaterials(prev => [newMaterial, ...prev]);
                showSuccess(t('material_uploaded_success'));
            } else {
                const err = await res.json().catch(() => ({} as { error?: string; message?: string }));
                showError(
                    (typeof err.error === 'string' && err.error) ||
                    (typeof err.message === 'string' && err.message) ||
                    (t('material_upload_failed') as string)
                );
            }
        } catch (err) {
            console.error('Upload error:', err);
            showError(t('material_upload_error'));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleEndSession = async () => {
        if (isUploadingRecording) {
            showError(t('recording_upload_pending_notice'));
            return;
        }
        if (isRecording) {
            showError(t('stop_recording_before_finish'));
            return;
        }
        const ok = await notifyConfirm({
            title: t('finish_session_confirm_title', { word: panelLabels.sessionNotifyWord }),
            description: t('finish_session_confirm_desc', { word: panelLabels.sessionNotifyWord }),
            variant: 'danger',
            confirmLabel: t('finish_btn')
        });
        if (!ok) return;
        try {
            const chatId = selectedGroupId;
            if (socket && chatId) {
                const mentorName = specialistDisplayName;
                socket.emit('lesson_end', {
                    sessionId: chatId,
                    mentorName,
                    sessionStyle: showMentorClassroomTools ? 'mentor' : 'consult',
                });
                const API_BASE = getPublicApiUrl();
                const postToChat = (content: string, type = 'text') => {
                    socket.emit('send_message', { roomId: chatId, content, type });
                };
                if (quizzes.length > 0 || materials.length > 0) {
                    postToChat(t('post_session_resources_notice'));
                }
                quizzes.forEach((q: any) => {
                    const lines = [`📌 **${q.title || (t('quiz_label') as string)}**`];
                    (q.questions || []).forEach((qq: any, i: number) => {
                        lines.push(`${i + 1}. ${qq.text || ''}`);
                        (qq.options || []).forEach((o: any, j: number) => {
                            lines.push(`   ${String.fromCharCode(65 + j)}. ${o.text || ''}${o.isCorrect ? ' ✓' : ''}`);
                        });
                    });
                    postToChat(lines.join('\n'));
                });
                materials.forEach((m: any) => {
                    const url = m.file_url?.startsWith('http') ? m.file_url : `${API_BASE}${m.file_url?.startsWith('/') ? '' : '/'}${m.file_url || ''}`;
                    postToChat(`📎 **${m.title || (t('file') as string)}**\n${url}`);
                });
            }
            const res = await apiFetch(`/api/specialists/sessions/${selectedGroupId}/close`, {
                method: 'PATCH'
            });

            if (res.ok) {
                showSuccess(t('session_finished_success', { word: panelLabels.sessionNotifyWord }) as string);
                setIsLessonStarted(false);
                if (onBack) onBack();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleScreenShare = () => {
        setIsScreenSharing(!isScreenSharing);
        // Real-time: getDisplayMedia() -> publishTrack
    };

    const handleToggleWhiteboard = () => {
        const newState = !isWhiteboardOpen;
        setIsWhiteboardOpen(newState);
        if (socket && socketRoomId) {
            socket.emit('whiteboard:toggle', { sessionId: socketRoomId, isOpen: newState });
        }
    };

    // Yozuv: avval video+audio, kamera yo'q bo'lsa audio-only fallback.
    const RECORDING_OPTIONS = {
        audioBitsPerSecond: 128000 as number,
        videoBitsPerSecond: 1200000 as number, // ~1.2 Mbps: sifat/hajm balans
        mimeType: (() => {
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) return 'video/webm;codecs=vp9,opus';
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) return 'video/webm;codecs=vp8,opus';
            if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm';
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
            if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
            return 'audio/mp4';
        })(),
    };

    const uploadLessonRecording = useCallback(
        async (blob: Blob, roomId: string, mimeType: string, ext: string) => {
            const API_BASE = getPublicApiUrl();
            if (blob.size > MAX_RECORDING_MB * 1024 * 1024) {
                throw new Error(
                    t('recording_size_limit_error', { limit: MAX_RECORDING_MB })
                );
            }
            const formData = new FormData();
            formData.append('files', blob, `dars-${roomId}-${Date.now()}.${ext}`);
            const token = localStorage.getItem('token');
            const uploadRes = await fetch(`${API_BASE}/api/media/upload?recording=1`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!uploadRes.ok) {
                const err = await uploadRes.json().catch(() => ({}));
                throw new Error(err?.error || t('recording_upload_failed'));
            }
            const uploadData = await uploadRes.json();
            const recordingUrl = uploadData?.urls?.[0] || uploadData?.files?.[0]?.url || uploadData?.url;
            if (!recordingUrl) throw new Error(t('recording_url_error'));
            await apiFetch(`/api/sessions/${roomId}/recording-done`, {
                method: 'POST',
                body: JSON.stringify({ recordingUrl }),
            });
            try {
                const histRes = await apiFetch('/api/sessions/history');
                if (histRes.ok) setPastSessions(await histRes.json());
            } catch {
                /* ignore */
            }
            showSuccess(
                showMentorClassroomTools
                    ? t('lesson_recording_sent')
                    : t('session_recording_sent')
            );
        },
        [showMentorClassroomTools]
    );

    const retryRecordingUpload = useCallback(async () => {
        const p = pendingRecordingRef.current;
        if (!p) return;
        setRecordingUploadError(null);
        setIsUploadingRecording(true);
        try {
            await uploadLessonRecording(p.blob, p.roomId, p.mimeType, p.ext);
            pendingRecordingRef.current = null;
        } catch (e: any) {
            console.error(e);
            setRecordingUploadError(e?.message || 'Qayta yuborish muvaffaqiyatsiz');
        } finally {
            setIsUploadingRecording(false);
        }
    }, [uploadLessonRecording]);

    const dismissRecordingUploadError = useCallback(() => {
        pendingRecordingRef.current = null;
        setRecordingUploadError(null);
    }, []);

    const handleGroupSelectChange = useCallback(
        (newId: string) => {
            if (
                (isRecording || isUploadingRecording) &&
                String(newId) !== String(selectedGroupId)
            ) {
                showError(t('stop_recording_before_change'));
                return;
            }
            setSelectedGroupId(newId);
            setIsLessonStarted(false);
        },
        [isRecording, isUploadingRecording, selectedGroupId]
    );

    const mentorNoGroupsHint = showMentorClassroomTools && groups.length === 0;
    const mentorNeedsRealRoomHint =
        showMentorClassroomTools && groups.length > 0 && !effectiveRoomId;

    const handleToggleRecording = async () => {
        if (!effectiveRoomId) {
            showError(
                showMentorClassroomTools
                    ? 'Avval faol dars guruhingizni tanlang (chap panel).'
                    : 'Avval mijoz suhbati / chatni tanlang.'
            );
            return;
        }
        const roomId = effectiveRoomId;

        if (!isRecording) {
            try {
                setRecordingUploadError(null);
                pendingRecordingRef.current = null;
                let stream: MediaStream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            sampleRate: 48000,
                            channelCount: 1,
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                        },
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 24, max: 30 },
                        },
                    });
                } catch {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    showError(t('camera_permission_denied_notice'));
                }
                recordingStreamRef.current = stream;
                recordedChunksRef.current = [];
                const mimeType = RECORDING_OPTIONS.mimeType;
                const isVideoCapture = stream.getVideoTracks().length > 0 && mimeType.startsWith('video/');
                const options: MediaRecorderOptions = {
                    audioBitsPerSecond: RECORDING_OPTIONS.audioBitsPerSecond,
                    videoBitsPerSecond: isVideoCapture ? RECORDING_OPTIONS.videoBitsPerSecond : undefined,
                    mimeType,
                };
                const recorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = recorder;
                recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
                recorder.onstop = async () => {
                    const blob = new Blob(recordedChunksRef.current, { type: mimeType });
                    const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
                    recordingStreamRef.current?.getTracks().forEach((t) => t.stop());
                    recordingStreamRef.current = null;
                    if (blob.size > MAX_RECORDING_MB * 1024 * 1024) {
                        showError(t('recording_size_limit_error_short', { limit: MAX_RECORDING_MB }));
                        setIsRecording(false);
                        return;
                    }
                    setIsUploadingRecording(true);
                    setRecordingUploadError(null);
                    try {
                        await uploadLessonRecording(blob, roomId, mimeType, ext);
                        pendingRecordingRef.current = null;
                    } catch (e: any) {
                        console.error(e);
                        pendingRecordingRef.current = { blob, roomId, mimeType, ext };
                        setRecordingUploadError(e?.message || 'Yozuvni yuklashda xatolik.');
                    } finally {
                        setIsUploadingRecording(false);
                        setIsRecording(false);
                    }
                };
                recorder.start(10000);
                setIsRecording(true);
                await apiFetch(`/api/sessions/${roomId}/record/start`, { method: 'POST' });
            } catch (e: any) {
                console.error(e);
                showError(t('mic_permission_or_error', { message: e?.message || '' }));
            }
        } else {
            const rec = mediaRecorderRef.current;
            if (rec && rec.state !== 'inactive') {
                rec.stop();
            } else {
                setIsRecording(false);
            }
            await apiFetch(`/api/sessions/${roomId}/record/stop`, { method: 'POST' }).catch(() => { });
        }
    };

    const handleForceMuteStudent = (studentId: string) => {
        if (!socket || !selectedGroupId) return;
        socket.emit('force_mute_student', { sessionId: selectedGroupId, studentId });
    };

    const handleRequestStudentUnmute = (studentId: string) => {
        if (!socket || !selectedGroupId) return;
        socket.emit('mentor_request_student_unmute', { sessionId: selectedGroupId, studentId });
    };

    const handleMentorDismissHand = (studentId: string | number) => {
        const id = String(studentId);
        setHandsRaised((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        pushSessionNotice(t('question_answered_notice'));
        if (socket && selectedGroupId) {
            socket.emit('mentor_dismiss_hand', { sessionId: selectedGroupId, studentId: id });
        }
    };

    const handleRemoveStudent = (participantId: string) => {
        const pid = String(participantId);
        if (socket && selectedGroupId) {
            socket.emit('kick_student', { sessionId: selectedGroupId, participantId: pid });
            setAttendees((prev) => prev.filter((p) => String(p.id) !== pid));
        }
    };

    const executeLessonStart = async (gid: string) => {
        if (!gid) return;
        /** Konsultatsiya: mijoz to‘lagan escrow sessiyani `ongoing` qilish (chatga xabar yo‘q) */
        if (!showMentorClassroomTools) {
            const chatId = String(gid).trim();
            try {
                const tryHttpPaths = [
                    '/api/service/start-ongoing',
                    '/api/specialists/consult/start-ongoing',
                ];
                let sessionRow: any = null;
                let lastMessage = '';

                for (const path of tryHttpPaths) {
                    const res = await apiFetch(path, {
                        method: 'POST',
                        body: JSON.stringify({ chatId }),
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok) {
                        sessionRow = data;
                        break;
                    }
                    lastMessage = data?.message || `HTTP ${res.status}`;
                    if (data?.message !== 'Route not found') break;
                }

                if (!sessionRow && socket) {
                    sessionRow = await new Promise<any>((resolve, reject) => {
                        const timerId = window.setTimeout(() => {
                            socket.off('consult_start_ongoing_result', onResult);
                            reject(new Error(t('wait_for_server_response')));
                        }, 12000);
                        const onResult = (payload: any) => {
                            window.clearTimeout(timerId);
                            socket.off('consult_start_ongoing_result', onResult);
                            if (payload?.ok && payload.session) resolve(payload.session);
                            else reject(new Error(payload?.message || t('start_session_failed')));
                        };
                        socket.on('consult_start_ongoing_result', onResult);
                        socket.emit('consult_start_ongoing', { chatId });
                    });
                }

                if (!sessionRow) {
                    showError(
                        lastMessage || t('start_session_error_prefix') + t('start_session_escrow_hint')
                    );
                    return;
                }
            } catch (e: any) {
                console.error(e);
                showError(e?.message || t('network_error_retry'));
                return;
            }
            setSelectedGroupId(chatId);
            setIsLessonStarted(true);
            setShowStartLessonModal(false);
            showSuccess(t('session_started_msg'));
            return;
        }
        setSelectedGroupId(gid);
        if (!socket) return;
        socket.emit('lesson_start', {
            sessionId: gid,
            mentorName: specialistDisplayName,
            sessionStyle: 'mentor',
        });
        const w = panelLabels.sessionNotifyWord;
        /** `started_msg` ba’zi TS inferensiyalarida TranslationKeys dan tashqari chiqishi mumkin; `status_started` barqaror */
        showSuccess(`${w} ${t('status_started')}`);
        setIsLessonStarted(true);
        setShowStartLessonModal(false);
    };

    const handleStartLesson = () => {
        if (showMentorClassroomTools && !socket) return;
        if (groups.length > 1) {
            setLessonPickGroupId(selectedGroupId || groups[0]?.id || '');
            setShowStartLessonModal(true);
            return;
        }
        const gid = selectedGroupId || groups[0]?.id;
        if (!gid) {
            showError(
                showMentorClassroomTools
                    ? t('select_or_create_group')
                    : t('select_private_chat')
            );
            return;
        }
        void executeLessonStart(gid);
    };

    const handleSendMessage = (isPrivate = false, receiverId?: string) => {
        if (!chatInput.trim() || !socket || !socketRoomId) return;

        const payload = {
            sessionId: socketRoomId,
            receiverId: receiverId,
            content: chatInput.trim(),
            type: 'text'
        };

        socket.emit('session_chat:send', payload);

        // Let the receive event handle updating local state
        setChatInput('');
    };



    const handleSaveNote = async () => {
        if (!sessionNotes.trim() || !selectedGroupId || savingNote) return;
        setSavingNote(true);
        try {
            const res = await apiFetch(`/api/specialists/notes`, {
                method: 'POST',
                body: JSON.stringify({
                    content: sessionNotes,
                    chat_id: selectedGroupId,
                    session_id: selectedGroupId,
                    shared_with_client: true
                })
            });

            if (res.ok) {
                showSuccess(t('note_saved_msg'));
                setSessionNotes('');
            } else {
                const data = await res.json().catch(() => ({}));
                showError(data?.message || t('note_save_error'));
            }
        } catch (err) {
            console.error(err);
            showError(t('note_save_error'));
        } finally {
            setSavingNote(false);
        }
    };



    if (globalError) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(var(--glass-rgb),0.8)] text-white px-6 text-center">
                <div className="space-y-3 max-w-md">
                    <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-semibold">{t('loading_session_error')}</p>
                    <p className="text-xs text-slate-200/80">{globalError}</p>
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="mt-2 inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                        >
                            {t('back_btn_text')}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!lkToken || !lkWsUrl) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(var(--glass-rgb),0.8)] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold animate-pulse text-slate-400">{t('connecting_to_video')}</p>
                </div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            token={lkToken}
            serverUrl={lkWsUrl}
            video={false}
            audio={false}
            connect={true}
            data-lk-theme="default"
            style={{ height: '100%' }}
        >
            <DashboardContent
                user={user}
                sessionId={effectiveRoomId || socketRoomId}
                socket={socket}
                onBack={onBack}
                {...{
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
                    pastSessions, setPastSessions,
                    playbackSession, setPlaybackSession,
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
                    isLessonStarted, setIsLessonStarted, handleStartLesson,
                    showStartLessonModal, setShowStartLessonModal,
                    lessonPickGroupId, setLessonPickGroupId,
                    executeLessonStart,
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
                }}
            />
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
}

// Inner component to use LiveKit hooks
function DashboardContent({
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
        (chatId: string) => {
            const id = String(chatId || '').trim();
            if (!id || !socket) return;
            const expertName =
                [user?.name, user?.surname].filter(Boolean).join(' ').trim() || user?.name || t('expert_role_consult');
            setConsultAcceptSendingId(id);
            try {
                /** Backend `consult_panel_invite` — DB ga type bilan yozadi, mijozda «Uchrashuvga ulanish» tugmasi chiqadi */
                socket.emit('consult_panel_invite', {
                    chatId: id,
                    expertName,
                    sessionStyle: getConsultPanelInviteSessionStyle(expertPanelMode),
                });
                onConsultSessionChat?.(id);
            } catch (e) {
                console.error('consult_panel_invite', e);
            } finally {
                window.setTimeout(() => setConsultAcceptSendingId((cur) => (cur === id ? null : cur)), 1200);
            }
        },
        [socket, onConsultSessionChat, user?.name, user?.surname, expertPanelMode]
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
            const res = await fetch(
                `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&t=mali_consult`
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

            {/* ─── TOP NAVIGATION BAR ─── */}
            <div className="relative z-10 h-14 shrink-0 flex items-center justify-between px-4 mentor-glass-bar border-b border-white/10 gap-3">
                {/* Left: back + title */}
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        {getAvatarUrl(user?.avatar_url || user?.avatar) ? (
                            <img src={getAvatarUrl(user?.avatar_url || user?.avatar)!} alt={t('expert_role_mentor') as string} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                                {user?.name?.[0] || 'M'}
                            </div>
                        )}
                        <span className="text-sm font-bold text-white">{panelLabels.header}</span>
                    </div>
                </div>

                {/* Center: Session stats */}
                <div className="flex items-center gap-3 sm:gap-5 text-sm flex-wrap justify-center">
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-mono font-semibold">
                            {sessionTimerHeading}: {sessionTimeDisplay}
                            {!isLessonStarted ? (
                                <span className="ml-1.5 text-[10px] font-normal text-slate-500 normal-case">({t('timer_not_started')})</span>
                            ) : null}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-1" />
                    </div>
                    <div
                        className="flex items-center gap-1.5 text-slate-300"
                        title={t('socket_session_title')}
                    >
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-semibold tabular-nums">{attendees.length}</span>
                        <span className="hidden md:inline text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t('online_label')}</span>
                    </div>
                    <div
                        className={`flex items-center gap-1.5 ${lkVideoRoomPeerCount > 0 ? 'text-emerald-300' : 'text-slate-400'}`}
                        title={t('livekit_room_title')}
                    >
                        <VideoIcon className="w-4 h-4 shrink-0 opacity-90" />
                        <span className="font-semibold tabular-nums">{lkVideoRoomPeerCount}</span>
                        {lkVideoRoomPeerCount > 0 ? (
                            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-wider text-emerald-400/90">{t('video_label')}</span>
                        ) : null}
                    </div>
                    <div
                        className={`flex items-center gap-1.5 font-bold shrink-0 ${recordingUploadError
                                ? 'text-red-400'
                                : isUploadingRecording
                                    ? 'text-amber-300'
                                    : isRecording
                                        ? 'text-red-400'
                                        : 'text-slate-500'
                            }`}
                        title={
                            recordingUploadError
                                ? t('recording_upload_failed_title')
                                : isUploadingRecording
                                    ? t('recording_uploading_title')
                                    : isRecording
                                        ? t('recording_on_title')
                                        : t('recording_off_title')
                        }
                    >
                        {recordingUploadError ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-red-400" />
                                <span className="text-[10px] sm:text-xs">{t('error_label')}</span>
                            </>
                        ) : isUploadingRecording ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[10px] sm:text-xs">{t('uploading_label')}</span>
                            </>
                        ) : isRecording ? (
                            <>
                                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                <span>{t('recording_label')}</span>
                            </>
                        ) : (
                            <span className="text-[11px] font-semibold normal-case">{t('recording_off_label')}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3].map(i => (
                            <span key={i} className={`w-1 h-${2 + i} rounded-full ${i === 3 ? 'bg-white' : 'bg-slate-500'}`} />
                        ))}
                    </div>
                </div>

                {/* Right: avatar (darsni yakunlash — o‘ng panel pastida) */}
                <div className="flex items-center gap-2">
                    {getAvatarUrl(user?.avatar_url || user?.avatar) ? (
                        <img src={getAvatarUrl(user?.avatar_url || user?.avatar)!} alt="User" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {user?.name?.[0] || 'U'}
                        </div>
                    )}
                </div>
            </div>

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

        {/* Viktorina yaratish modali — faqat mentor */ }
    {
        showMentorClassroomTools && isCreatingQuiz && (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#161927] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
                    <h2 className="text-lg font-bold text-white mb-4">{t('create_quiz_label')}</h2>

                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block">{t('quiz_title_label')}</label>
                            <input
                                type="text"
                                value={newQuizTitle}
                                onChange={e => setNewQuizTitle(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                                placeholder={t('quiz_title_placeholder')}
                            />
                        </div>

                        {newQuestions.map((q: any, qIndex: number) => (
                            <div key={qIndex} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-white">{t('question_label')} {qIndex + 1}</span>
                                    {newQuestions.length > 1 && (
                                        <button onClick={() => setNewQuestions((prev: any[]) => prev.filter((_: any, i: number) => i !== qIndex))} className="text-red-400 text-xs">{t('delete_btn')}</button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={q.text}
                                    onChange={e => {
                                        const arr = [...newQuestions];
                                        arr[qIndex].text = e.target.value;
                                        setNewQuestions(arr);
                                    }}
                                    className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white mb-2 focus:outline-none focus:border-white/20"
                                    placeholder="Savol matni..."
                                />

                                <div className="space-y-1.5 pl-2 border-l border-white/10 mt-3">
                                    <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">Variantlar (to&apos;g&apos;risini belgilang)</span>
                                    {q.options.map((opt: any, oIndex: number) => (
                                        <div key={oIndex} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name={`q-${qIndex}-correct`}
                                                checked={opt.isCorrect}
                                                onChange={() => {
                                                    const arr = [...newQuestions];
                                                    arr[qIndex].options.forEach((o: any) => o.isCorrect = false);
                                                    arr[qIndex].options[oIndex].isCorrect = true;
                                                    setNewQuestions(arr);
                                                }}
                                                className="w-3 h-3 cursor-pointer shrink-0"
                                            />
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={e => {
                                                    const arr = [...newQuestions];
                                                    arr[qIndex].options[oIndex].text = e.target.value;
                                                    setNewQuestions(arr);
                                                }}
                                                className="w-full bg-transparent border-b border-white/10 px-1 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                                                placeholder="Variant matni..."
                                            />
                                            {q.options.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const arr = [...newQuestions];
                                                        const opts = arr[qIndex].options.filter((_: any, i: number) => i !== oIndex);
                                                        if (opts.some((o: any) => o.isCorrect)) {
                                                            arr[qIndex].options = opts;
                                                        } else {
                                                            opts[0].isCorrect = true;
                                                            arr[qIndex].options = opts;
                                                        }
                                                        setNewQuestions(arr);
                                                    }}
                                                    className="text-red-400 hover:text-red-300 text-xs shrink-0"
                                                    title="Variantni o'chirish"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const arr = [...newQuestions];
                                            arr[qIndex].options = [...(arr[qIndex].options || []), { text: '', isCorrect: false }];
                                            setNewQuestions(arr);
                                        }}
                                        className="mt-1.5 text-xs text-slate-400 hover:text-white border border-dashed border-white/20 rounded-lg px-2 py-1"
                                    >
                                        + Yana variant qo&apos;shish
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={() => setNewQuestions((prev: any[]) => [...prev, { text: '', typeof: 'multiple_choice', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }] }])}
                            className="w-full py-2 border border-dashed border-white/20 rounded-xl text-xs text-slate-400 hover:text-white hover:border-white/40 transiton-all"
                        >
                            + Yana savol qo&apos;shish
                        </button>
                    </div>

                    <div className="pt-4 mt-2 border-t border-white/10 flex gap-2">
                        <button onClick={() => setIsCreatingQuiz(false)} className="flex-1 py-2 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-white/10">Bekor qilish</button>
                        <button onClick={handleCreateQuiz} disabled={!newQuizTitle} className={`flex-1 py-2 rounded-xl text-white text-xs font-bold ${newQuizTitle ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 cursor-not-allowed'}`}>Saqlash</button>
                    </div>
                </div>
            </div>
        )
    }
    {
        consultAcceptModal && (
            <div className="fixed inset-0 z-[215] bg-black/80 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#161927] border border-white/10 rounded-2xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <h2 className="text-base font-bold text-white mb-1">Mijoz hisobi — tekshiruv</h2>
                    <p className="text-[10px] text-slate-500 mb-3 leading-snug">
                        Qabul xabari oldidan kafillik (escrow) va profilingizdagi narx ko‘rsatiladi. Mijozning
                        umumiy hamyon balansi maxfiy.
                    </p>
                    {consultAcceptModal.loading ? (
                        <div className="py-10 flex justify-center">
                            <div className="w-8 h-8 border-2 border-white/20 border-t-emerald-400 rounded-full animate-spin" />
                        </div>
                    ) : consultAcceptModal.error ? (
                        <p className="text-sm text-red-300/95 mb-4 leading-relaxed">{consultAcceptModal.error}</p>
                    ) : consultAcceptModal.prep ? (
                        <div className="space-y-3 text-[11px] text-slate-200 leading-relaxed">
                            <p>
                                <span className="text-slate-500">{t('consult_accept_modal_client') as string}</span>{' '}
                                <span className="font-semibold text-white">
                                    {consultAcceptModal.prep.clientName || consultAcceptModal.displayName}
                                </span>
                            </p>
                            <ul className="space-y-1.5 rounded-xl bg-white/5 border border-white/10 p-3 list-none">
                                <li>
                                    {t('consult_accept_modal_locked_balance') as string}{' '}
                                    <strong className="text-amber-200 tabular-nums">
                                        {formatMaliUi(consultAcceptModal.prep.clientLockedBalance, language)} MALI
                                    </strong>
                                </li>
                                {consultAcceptModal.prep.expertServicePrice != null ? (
                                    <li>
                                        {t('consult_accept_modal_your_listing_price') as string}{' '}
                                        <strong className="text-cyan-200 tabular-nums">
                                            {formatMaliUi(consultAcceptModal.prep.expertServicePrice, language)} MALI
                                        </strong>
                                    </li>
                                ) : null}
                            </ul>
                            {consultAcceptModal.prep.session?.status === 'initiated' ? (
                                <div className="rounded-xl border border-emerald-500/35 bg-emerald-950/40 px-3 py-2.5 text-emerald-100">
                                    {t('consult_accept_modal_payment_confirmed_escrow', {
                                        amount: formatMaliUi(consultAcceptModal.prep.session.amountMali, language),
                                    }) as string}
                                </div>
                            ) : consultAcceptModal.prep.session?.status === 'ongoing' ? (
                                <div className="rounded-xl border border-blue-500/35 bg-blue-950/40 px-3 py-2.5 text-blue-100">
                                    {t('consult_accept_modal_active_session', {
                                        amount: formatMaliUi(consultAcceptModal.prep.session.amountMali, language),
                                    }) as string}
                                </div>
                            ) : (
                                <div className="rounded-xl border border-amber-500/35 bg-amber-950/35 px-3 py-2.5 text-amber-100">
                                    {t('consult_accept_modal_no_session_hint') as string}
                                </div>
                            )}
                        </div>
                    ) : null}
                    <div className="flex gap-2 mt-5">
                        <button
                            type="button"
                            onClick={() => setConsultAcceptModal(null)}
                            className="flex-1 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10"
                        >
                            {t('cancel_btn')}
                        </button>
                        <button
                            type="button"
                            disabled={consultAcceptModal.loading}
                            onClick={() => {
                                sendConsultAcceptNotice(consultAcceptModal.chatId);
                                setConsultAcceptModal(null);
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t('send_offer_btn')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }
    {
        showStartLessonModal && (
            <div className="fixed inset-0 z-[210] bg-black/80 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#161927] border border-white/10 rounded-2xl p-6 shadow-2xl">
                    <h2 className="text-lg font-bold text-white mb-1">{lessonPickModalTitle}</h2>
                    <p className="text-xs text-slate-400 mb-4">{lessonPickModalHint}</p>
                    <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                        {groups.map((g: any) => {
                            const gid = String(g.id || g.chatId);
                            return (
                                <label
                                    key={gid}
                                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${lessonPickGroupId === gid ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                                >
                                    <input
                                        type="radio"
                                        name="lesson-group"
                                        checked={lessonPickGroupId === gid}
                                        onChange={() => setLessonPickGroupId(gid)}
                                        className="accent-blue-500"
                                    />
                                    <span className="text-sm font-medium text-white">{g.name || 'Guruh'}</span>
                                </label>
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setShowStartLessonModal(false)}
                            className="flex-1 py-2.5 rounded-xl bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10"
                        >
                            {t('cancel_btn')}
                        </button>
                        <button
                            type="button"
                            onClick={() => lessonPickGroupId && void executeLessonStart(lessonPickGroupId)}
                            disabled={!lessonPickGroupId}
                            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {panelLabels.primaryStartLabel}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    {
        isSettingsOpen && (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#161927] border border-white/10 rounded-2xl p-6 shadow-2xl">
                    <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><Plus className="w-5 h-5 rotate-45" /> {t('settings_title')}</h2>
                    <p className="text-[10px] text-slate-500 mb-6 leading-relaxed">
                        {t('settings_desc')}
                    </p>
                    <div className="space-y-4 mb-6">
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 opacity-80">
                            <span className="text-xs font-bold text-white">{t('video_quality_label')}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{t('video_quality_hint')}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 opacity-80">
                            <span className="text-xs font-bold text-white">{t('noise_reduction_label')}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{t('device_settings_hint')}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
                    >
                        {t('close_btn')}
                    </button>
                </div>
            </div>
        )
    }

    {
        showNewGroupPrompt && (
            <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#161927] border border-white/10 rounded-2xl p-6 shadow-2xl">
                    <h2 className="text-lg font-bold text-white mb-4">{t('create_group_label')}</h2>
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block">{t('new_group_name_label')}</label>
                            <input
                                type="text"
                                value={newGroupName}
                                onChange={e => setNewGroupName(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                                placeholder={t('new_group_name_placeholder')}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 font-bold mb-1 block">{t('new_group_time_label')}</label>
                            <input
                                type="text"
                                value={newGroupTime}
                                onChange={e => setNewGroupTime(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
                                placeholder={t('new_group_time_placeholder')}
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowNewGroupPrompt(false)}
                            className="flex-1 py-3 bg-white/5 text-white text-xs font-bold rounded-xl hover:bg-white/10 transition-all"
                        >
                            {t('cancel_btn')}
                        </button>
                        <button
                            onClick={handleCreateGroup}
                            disabled={!newGroupName.trim()}
                            className={`flex-1 py-3 text-white text-xs font-bold rounded-xl transition-all ${newGroupName.trim() ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-700 cursor-not-allowed'}`}
                        >
                            {t('create_btn')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

        </div>
    );
}

