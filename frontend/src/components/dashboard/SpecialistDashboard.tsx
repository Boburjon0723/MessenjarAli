"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { apiFetch } from '@/lib/api';
import {
    LiveKitRoom,
    RoomAudioRenderer,
} from '@livekit/components-react';
import { liveKitRoomOptions, MEDIA_RECORDER_AUDIO_CONSTRAINTS } from '@/lib/livekit-media';
import '@livekit/components-styles';

import {
    getExpertPanelMode,
    getExpertPanelLabels,
} from '@/lib/expert-roles';
import { getPublicApiUrl } from '@/lib/public-origin';
import { inferSendTypeFromFile } from '@/lib/telegram-message-kind';
import { getToken } from '@/lib/auth-storage';
import { uploadFileWithProgress } from '@/lib/upload';
import { useLanguage } from '@/context/LanguageContext';
import {
    normalizeQuizFromApi,
    buildQuizChatSummary,
} from './specialist/specialistHelpers';
import { DashboardContent } from './specialist/DashboardContent';

const MAX_RECORDING_MB = 1000;

interface SpecialistDashboardProps {
    user: any;
    sessionId?: string;
    socket?: any;
    onBack?: () => void;
    /** Shaxsiy chat tanlanganda — asosiy video xonasi shu chat ID ga o'tadi */
    onConsultSessionChat?: (chatId: string) => void;
    /** Konsultatsiya: mijoz bilan suhbat Yakunlash — chat o'chirilgandan keyin */
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
    const [selectedGroupId, setSelectedGroupId] = useState(
        sessionId && sessionId !== 'demo-session-id' && !showMentorClassroomTools ? sessionId : ''
    );
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
    /** LiveKit + socket xonasi: `demo-session-id` truthy bo‘lib qolsa ham haqiqiy `sessionId` ga tushsin (aks holda doska boshqa room ga ketadi). */
    const socketRoomId =
        (selectedGroupId && selectedGroupId !== 'demo-session-id' ? selectedGroupId : '') ||
        (sessionId && sessionId !== 'demo-session-id' ? sessionId : '');

    /** Guruh tanlanmaguncha mentor kutish xonasi — panel LiveKit token olishi uchun */
    const mentorLobbyRoomId = showMentorClassroomTools && user?.id ? `consult-lobby-${user.id}` : '';
    const liveKitRoomId =
        (selectedGroupId && selectedGroupId !== 'demo-session-id' ? selectedGroupId : '') ||
        mentorLobbyRoomId ||
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
            const matQs = showMentorClassroomTools ? '?currentLesson=1' : '';
            const resMat =
                showMentorClassroomTools && !isLessonStarted
                    ? null
                    : await apiFetch(`/api/sessions/${selectedGroupId}/materials${matQs}`);
            if (!resMat) {
                setMaterials([]);
            } else if (resMat.status === 404) {
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
    }, [selectedGroupId, showMentorClassroomTools, isLessonStarted, t]);

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
                setSelectedGroupId((prev) => {
                    if (!prev || prev === 'demo-session-id') return '';
                    const stillValid =
                        Array.isArray(data) &&
                        data.some((g: any) => String(g.id || g.chatId) === String(prev));
                    return stillValid ? prev : '';
                });
            }
        } catch (err) {
            console.error("Failed to fetch expert groups", err);
            setGlobalError(t('groups_load_error'));
        }
    }, [user?.id, showMentorClassroomTools]);

    const fetchLiveKitToken = useCallback(async () => {
        if (!liveKitRoomId) return;
        try {
            const res = await apiFetch(
                `/api/livekit/token?room=${encodeURIComponent(liveKitRoomId)}&username=${encodeURIComponent([user?.name, user?.surname].filter(Boolean).join(' ').trim() || user?.name || 'Mentor')}`
            );
            if (res.ok) {
                const data = await res.json();
                setLkToken(data.token);
                setLkWsUrl(data.wsUrl);
            } else {
                console.error('[SpecialistDashboard] LiveKit token failed:', res.status);
            }
        } catch (err) {
            console.error('[SpecialistDashboard] Error fetching LiveKit token:', err);
        }
    }, [liveKitRoomId, user?.name]);

    useEffect(() => {
        loadSessionResources();
        fetchHistory();
        fetchGroups();
    }, [loadSessionResources, fetchHistory, fetchGroups, selectedGroupId]);

    useEffect(() => {
        setLkToken('');
        setLkWsUrl('');
        if (liveKitRoomId) void fetchLiveKitToken();
    }, [liveKitRoomId, fetchLiveKitToken]);

    useEffect(() => {
        if (socket && socketRoomId && String(socketRoomId) !== 'demo-session-id') {
            socket.emit('session_join', { sessionId: socketRoomId });

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
                if (room != null && String(room) !== String(socketRoomId)) return;
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
                if (typeof data === 'object' && data?.sessionId != null && String(data.sessionId) !== String(socketRoomId)) return;
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
    }, [socket, socketRoomId, loadSessionResources, fetchHistory, fetchGroups, fetchLiveKitToken, pushSessionNotice, enrichAttendeeProfile, user?.id, t]);

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

    const handleQuickPoll = (questionText?: string) => {
        if (!socket || !selectedGroupId) return;
        const question = String(questionText || '').trim() || 'Hozirgi mavzu tushunarlimi?';
        const quickPoll = {
            id: `poll-${Date.now()}`,
            title: 'Tezkor So\'rov',
            isQuickPoll: true,
            questions: [
                {
                    text: question,
                    typeof: 'multiple_choice',
                    options: [
                        { id: '1', text: 'Ha, tushunarli', isCorrect: true },
                        { id: '2', text: "Yo'q, tushunarsiz", isCorrect: false }
                    ]
                }
            ]
        };
        socket.emit('quiz_start', { sessionId: selectedGroupId, quizId: quickPoll.id, quizDetails: quickPoll });
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
            const newMaterial = await uploadFileWithProgress(
                `/api/sessions/${selectedGroupId}/materials`,
                formData
            );

            if (socket) {
                socket.emit('material_uploaded', { sessionId: selectedGroupId, material: newMaterial });
                const fileUrl = String(newMaterial.file_url || '');
                const title = String(newMaterial.title || file.name || (t('file') as string));
                const mime = String(newMaterial.file_type || file.type || '');
                socket.emit('send_message', {
                    roomId: selectedGroupId,
                    content: fileUrl,
                    type: inferSendTypeFromFile(title, mime),
                    metadata: {
                        name: title,
                        file_name: title,
                        size: newMaterial.file_size_bytes || file.size,
                        mimetype: mime,
                        is_material: true,
                    },
                });
            }
            setMaterials(prev => [newMaterial, ...prev]);
            showSuccess(t('material_uploaded_success'));
        } catch (err) {
            console.error('Upload error:', err);
            if (err instanceof Error && err.message.startsWith('Upload failed with status')) {
                showError(t('material_upload_failed'));
            } else {
                showError(t('material_upload_error'));
            }
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
            }
            const res = await apiFetch(`/api/specialists/sessions/${selectedGroupId}/close`, {
                method: 'PATCH'
            });

            if (res.ok) {
                showSuccess(t('session_finished_success', { word: panelLabels.sessionNotifyWord }) as string);
                setIsLessonStarted(false);
                setMaterials([]);
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
            if (blob.size > MAX_RECORDING_MB * 1024 * 1024) {
                throw new Error(
                    t('recording_size_limit_error', { limit: MAX_RECORDING_MB })
                );
            }
            const formData = new FormData();
            formData.append('files', blob, `dars-${roomId}-${Date.now()}.${ext}`);
            let uploadData: any;
            try {
                uploadData = await uploadFileWithProgress(`/api/media/upload?recording=1`, formData);
            } catch (e) {
                throw new Error(
                    (e instanceof Error && e.message) || t('recording_upload_failed')
                );
            }
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
            if (isLessonStarted && String(newId) !== String(selectedGroupId)) {
                showError(t('lesson_group_locked_hint'));
                return;
            }
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
        [isRecording, isUploadingRecording, isLessonStarted, selectedGroupId, showError, t]
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
                        audio: MEDIA_RECORDER_AUDIO_CONSTRAINTS,
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
            socket.emit('kick_student', {
                sessionId: selectedGroupId,
                studentId: pid,
                participantId: pid,
            });
            setAttendees((prev) => prev.filter((p) => String(p.id) !== pid));
            setHandsRaised((prev) => {
                const n = { ...prev };
                delete n[pid];
                return n;
            });
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
        try {
            const res = await apiFetch('/api/specialists/lesson-start', {
                method: 'POST',
                body: JSON.stringify({
                    sessionId: gid,
                    mentorName: specialistDisplayName,
                    sessionStyle: 'mentor',
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                /** HTTP yo‘q / eski deploy — socket zaxira */
                if (socket?.connected && data?.message === 'Route not found') {
                    socket.emit('lesson_start', {
                        sessionId: gid,
                        mentorName: specialistDisplayName,
                        sessionStyle: 'mentor',
                    });
                } else {
                    showError(data?.message || t('socket_realtime_offline'));
                    return;
                }
            }
        } catch {
            if (socket?.connected) {
                socket.emit('lesson_start', {
                    sessionId: gid,
                    mentorName: specialistDisplayName,
                    sessionStyle: 'mentor',
                });
            } else {
                showError(t('network_error_retry'));
                return;
            }
        }
        showSuccess(`${t('lesson_started_broadcast')}`);
        setIsLessonStarted(true);
        setShowStartLessonModal(false);
    };

    const handleStartLesson = () => {
        const gid = String(selectedGroupId || '').trim();
        if (!gid || gid === 'demo-session-id') {
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
                    note_type: 'session',
                    // Faqat mentor uchun — guruh chatiga yuborilmaydi
                    shared_with_client: false,
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

    if (liveKitRoomId && (!lkToken || !lkWsUrl)) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(var(--glass-rgb),0.8)] text-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold animate-pulse text-slate-400">{t('connecting_to_video')}</p>
                </div>
            </div>
        );
    }

    if (!liveKitRoomId) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(var(--glass-rgb),0.8)] text-white px-6 text-center">
                <p className="text-sm text-slate-300">{t('select_or_create_group')}</p>
            </div>
        );
    }

    return (
        <LiveKitRoom
            key={liveKitRoomId}
            token={lkToken}
            serverUrl={lkWsUrl}
            video={false}
            audio={false}
            connect={true}
            options={liveKitRoomOptions('panel')}
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


