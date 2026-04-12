import React, { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { MessageBubble } from './MessageBubble';
import SendCoinModal from './SendCoinModal';
import MediaUploadModal from './MediaUploadModal';
import MediaViewerOverlay from './MediaViewerOverlay';
import LiveWorkspace from './LiveWorkspace';
import LiveKitRoomWrapper from './LiveKitRoomWrapper';
import { useSocket } from '@/context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch } from '@/lib/api';
import { TranslationKeys } from '@/lib/translations';
import { getUser } from '@/lib/auth-storage';
import { getExpertPanelMode } from '@/lib/expert-roles';
import { getExpertComplianceNotice } from '@/lib/expert-compliance-copy';
import ListingDealBar from './ListingDealBar';
import { summarizeChat } from '@/lib/summarize';
import { maliDB, OfflineMessage } from '@/lib/indexeddb';
import {
    readChatMessageCache,
    writeChatMessageCache,
    mapApiMessagesToLocal,
    sortChatMessagesLocal,
    mergeFetchedChatMessages,
    parseCreatedToMs,
    normalizeChatMessage,
    mergeIncomingSocketMessage,
    socketMessageTargetsChat,
    createOptimisticChatMessage,
} from '@/lib/chat-message-cache';
import { getPrivateChatPeerUserId } from '@/lib/private-chat-peer';
import type { ChatMessage } from '@/types/chat-message';
import type {
    ChatRoom,
    ContactListItem,
    ServiceSessionPayload,
    CallSignalPayload,
    TypingPayload,
    TradeDetails,
} from '@/types/chat-room';

const INITIAL_MESSAGES: ChatMessage[] = [];

/** Pastga avtomatik scroll: foydalanuvchi shu px dan yaqinroqda bo‘lsa */
const CHAT_NEAR_BOTTOM_PX = 72;

function parseMessageDate(msg: { created_at?: unknown; createdAt?: unknown }): Date | null {
    const ms = parseCreatedToMs(msg?.created_at ?? msg?.createdAt);
    if (ms == null) return null;
    return new Date(ms);
}

interface ChatWindowProps {
    chat?: ChatRoom;
    chats?: ChatRoom[];
    onToggleInfo?: () => void;
    onBack?: () => void;
    onMarkAsRead?: (chatId: string) => void;
    /** ChatCarouselPanel: karusel siljishi bilan ildiz fade ustma-ust tushmasin */
    suppressRootFade?: boolean;
}

export default function ChatWindow({
    chat,
    chats = [],
    onToggleInfo,
    onBack,
    onMarkAsRead,
    suppressRootFade = false,
}: ChatWindowProps) {
    const { t, tLines, language } = useLanguage();
    const { socket, isConnected } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [debugError, setDebugError] = useState<string | null>(null);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [showSendCoinModal, setShowSendCoinModal] = useState(false);
    const [activeSession, setActiveSession] = useState<ServiceSessionPayload | null>(null);
    const [tradeData, setTradeData] = useState<TradeDetails | null>(null);
    const [isContact, setIsContact] = useState<boolean>(false);
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [isComplianceDismissed, setIsComplianceDismissed] = useState(false);
    const [blockStatus, setBlockStatus] = useState<{ isBlocked: boolean, blockedByMe: boolean }>({ isBlocked: false, blockedByMe: false });

    // Media & Advanced Feature States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [mediaPreviewFile, setMediaPreviewFile] = useState<File | null>(null);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
    const [headerImageError, setHeaderImageError] = useState(false);

    const handleReplyClick = (parentId: string) => {
        const element = document.getElementById(`msg-${parentId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-message');
            setTimeout(() => element.classList.remove('highlight-message'), 2000);
        }
    };

    // Search & Calling
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [searchType, setSearchType] = useState<'all' | 'text' | 'media' | 'files'>('all');
    const [searchDateFrom, setSearchDateFrom] = useState<string>("");
    const [searchDateTo, setSearchDateTo] = useState<string>("");
    const [isIncomingCall, setIsIncomingCall] = useState(false);
    const [isCalling, setIsCalling] = useState(false);
    const [callData, setCallData] = useState<CallSignalPayload | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeaker, setIsSpeaker] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [callTimer, setCallTimer] = useState(0);
    const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [inputFocused, setInputFocused] = useState(false);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const [showPreCallModal, setShowPreCallModal] = useState(false);
    const [pendingCallType, setPendingCallType] = useState<'audio' | 'video'>('audio');
    const [lowBandwidth, setLowBandwidth] = useState(false);
    const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
    const [forwardAvatarErrors, setForwardAvatarErrors] = useState<Record<string, boolean>>({});

    // WebRTC Real-time Video
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const callRingRef = useRef<HTMLAudioElement | null>(null);
    const callRingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const [uploadProgresses, setUploadProgresses] = useState<Record<string, number>>({});
    const [isDragging, setIsDragging] = useState(false);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [viewerMedia, setViewerMedia] = useState<{ url: string, type: 'image' | 'video' | 'file' } | null>(null);

    // Selection Mode
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

    // AI Summarization
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [chatSummary, setChatSummary] = useState<string | null>(null);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    const handleSummarizeChat = async () => {
        if (chatSummary) {
            setChatSummary(null);
            return;
        }
        setIsSummarizing(true);
        setSummaryError(null);

        const textMessages = messages
            .filter(m => m.type === 'text')
            .slice(-50)
            .map(m => `${m.senderName || (m.sender === 'me' ? t('me') : t('interlocutor'))}: ${m.text}`)
            .join('. ');

        if (!textMessages.trim()) {
            setSummaryError(t('no_messages'));
            setIsSummarizing(false);
            return;
        }

        const summary = await summarizeChat(textMessages);
        if (summary === "XIZMAT_BAND") {
            setSummaryError(t('loading'));
        } else if (summary) {
            setChatSummary(summary);
        } else {
            setSummaryError(t('translation_error'));
        }
        setIsSummarizing(false);
    };

    const toggleSelection = (msgId: string) => {
        setSelectedMessageIds(prev =>
            prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
        );
    };

    const handleDeleteSelected = async () => {
        if (!chat || selectedMessageIds.length === 0) return;
        const ok = await confirm({
            title: t('delete_messages') as TranslationKeys,
            description: t('confirm_delete_msg') as TranslationKeys,
            variant: 'danger',
            confirmLabel: t('delete') as TranslationKeys
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id}/messages/bulk`, {
                method: 'DELETE',
                body: JSON.stringify({ messageIds: selectedMessageIds })
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m.id)));
                setIsSelecting(false);
                setSelectedMessageIds([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleReactMessage = (msg: ChatMessage, emoji: string) => {
        try {
            const currentUser = getUser() || {};
            const userId = String(currentUser?.id ?? '');
            if (!userId) return;

            setMessages(prev =>
                prev.map(m => {
                    if (m.id !== msg.id) return m;
                    const reactions = m.reactions || {};
                    const rawUsers = reactions[emoji]?.users;
                    const existing: string[] = Array.isArray(rawUsers)
                        ? rawUsers.map(u => String(u))
                        : [];
                    const hasReacted = existing.includes(userId);
                    const updatedUsers: string[] = hasReacted
                        ? existing.filter(id => id !== userId)
                        : [...existing, userId];
                    const next: ChatMessage = {
                        ...m,
                        reactions: {
                            ...reactions,
                            [emoji]: { emoji, users: updatedUsers }
                        }
                    };
                    return next;
                })
            );
        } catch {
            // ignore reaction errors
        }
    };

    // Offline / Online Status and Sync
    const [isNetworkOnline, setIsNetworkOnline] = useState(true);

    useEffect(() => {
        setIsNetworkOnline(navigator.onLine);
        const handleOnline = () => setIsNetworkOnline(true);
        const handleOffline = () => setIsNetworkOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Sync Offline Messages when coming back online
    useEffect(() => {
        if (isNetworkOnline && isConnected && socket && chat) {
            const syncMessages = async () => {
                try {
                    const pendingMsgs = await maliDB.getMessagesForChat(String(chat.id));
                    if (pendingMsgs.length > 0) {
                        for (const msg of pendingMsgs) {
                            if (msg.type === 'text') {
                                socket.emit('send_message', {
                                    roomId: msg.chatId,
                                    content: msg.text,
                                    type: 'text',
                                    clientSideId: msg.id,
                                    parentId: msg.parentId
                                });
                            }
                            // Media specific sync logic would go here if needed
                            await maliDB.deleteMessage(msg.id);
                        }
                    }
                } catch (e) {
                    console.error("Failed to sync offline messages:", e);
                }
            };
            syncMessages();
        }
    }, [isNetworkOnline, isConnected, socket, chat?.id]);

    const handleDeleteMessage = async (msg: ChatMessage) => {
        if (!chat || !msg.id) return;
        const ok = await confirm({
            title: t('delete_messages') as TranslationKeys,
            description: t('confirm_delete_msg') as TranslationKeys,
            variant: 'danger',
            confirmLabel: t('delete') as TranslationKeys
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id}/messages/bulk`, {
                method: 'DELETE',
                body: JSON.stringify({ messageIds: [msg.id] })
            });
            if (res.ok) {
                setMessages(prev => prev.filter(m => m.id !== msg.id));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleForwardMessage = (msg: ChatMessage) => {
        setForwardMessage(msg);
    };

    const handleForwardToChat = (targetChat: ChatRoom) => {
        if (!forwardMessage || !socket || !targetChat?.id) return;
        const content = forwardMessage.text || '';
        const type = forwardMessage.type || 'text';
        const url = (type !== 'text' && content && !content.startsWith('http'))
            ? `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}${content.startsWith('/') ? '' : '/'}${content}`
            : content;
        socket.emit('send_message', {
            roomId: targetChat.id,
            content: type === 'text' ? content : url,
            type,
            metadata: forwardMessage.metadata,
        });
        setForwardMessage(null);
    };

    const handleClearHistory = async () => {
        if (!chat) return;
        const ok = await confirm({
            title: t('clear_history') as TranslationKeys,
            description: t('confirm_delete_history') as TranslationKeys,
            variant: 'danger',
            confirmLabel: t('all') as TranslationKeys
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id}/messages`, { method: 'DELETE' });
            if (res.ok) {
                setMessages([]);
                setShowMoreMenu(false);
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteChat = async () => {
        if (!chat) return;
        const ok = await confirm({
            title: t('delete_chat') as TranslationKeys,
            description: t('confirm_delete_chat') as TranslationKeys,
            variant: 'danger',
            confirmLabel: t('delete') as TranslationKeys
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id}`, { method: 'DELETE' });
            if (res.ok) {
                if (onBack) onBack();
                else window.location.reload();
            }
        } catch (e) { console.error(e); }
    };

    const handleExportHistory = () => {
        if (!chat) return;
        if (messages.length === 0) {
            showError(t('no_messages'));
            return;
        }
        const textContent = messages.map(m => `[${m.time}] ${m.sender === 'me' ? t('me') : t('interlocutor')}: ${m.type === 'text' ? m.text : `[${m.type} - ${m.text}]`}`).join('\n');
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `chat_history_${String(chat.id).slice(0, 8)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setShowMoreMenu(false);
    };

    const fetchTradeDetails = useCallback(async () => {
        if (!chat || !chat.isTrade || !chat.tradeId) return;
        try {
            const res = await apiFetch(`/api/p2p/trade/${chat.tradeId}`);
            if (res.ok) {
                const data = (await res.json()) as TradeDetails;
                setTradeData(data);
            }
        } catch (e) { console.error(e); }
    }, [chat?.tradeId, chat?.isTrade]);

    const fetchActiveSession = useCallback(async () => {
        if (!chat || !chat.id) return;
        try {
            const res = await apiFetch(`/api/service/my-sessions`);
            if (res.ok) {
                const sessions = (await res.json()) as ServiceSessionPayload[];
                const current = sessions.find(
                    (s: ServiceSessionPayload) =>
                        String(s.chat_id) === String(chat.id) &&
                        (s.status === 'initiated' || s.status === 'ongoing')
                );
                setActiveSession(current || null);
            }
        } catch (e) {
            console.error(e);
        }
    }, [chat?.id]);

    const checkIfContact = useCallback(async () => {
        if (!chat || chat.type !== 'private' || chat.isTrade) {
            setIsContact(true);
            return;
        }

        try {
            const res = await apiFetch(`/api/users/contacts`);
            if (res.ok) {
                const contacts = (await res.json()) as ContactListItem[];
                const targetId = getPrivateChatPeerUserId(chat);
                const found = targetId
                    ? contacts.find((c: ContactListItem) => String(c.id || c.userId) === String(targetId))
                    : null;
                setIsContact(!!found);
            }
        } catch (e) { console.error("Contact check error:", e); }
    }, [chat?.id, chat?.type, chat?.isTrade, chat?.userId, chat?.participantId, chat?.participants, chat?.otherUser?.id, chat?.otherUser?.user_id]);

    const handleAddContact = async () => {
        if (!chat) return;
        setIsAddingContact(true);
        const targetId = getPrivateChatPeerUserId(chat);
        if (!targetId) {
            setIsAddingContact(false);
            showError(t('user_not_found'));
            return;
        }
        try {
            const res = await apiFetch(`/api/users/contacts`, {
                method: 'POST',
                body: JSON.stringify({
                    contactUserId: targetId,
                    name: chat.name || chat.otherUser?.name || 'User',
                    surname: chat.otherUser?.surname || ''
                })
            });
            if (res.ok) {
                setIsContact(true);
                showSuccess(t('uploaded_status')); // generic success
                window.dispatchEvent(new Event('contacts_updated'));
            } else {
                let msg = t('contact_save_error');
                try {
                    const data = await res.json();
                    if (data?.message && typeof data.message === 'string') msg = data.message;
                } catch {
                    /* ignore */
                }
                showError(msg);
            }
        } catch (e) {
            console.error(e);
            showError(t('server_error'));
        }
        finally { setIsAddingContact(false); }
    };

    const handleBlockUser = async () => {
        if (!chat) return;
        const userId = getPrivateChatPeerUserId(chat);
        if (!userId) return;
        const ok = await confirm({
            title: t('block') as TranslationKeys,
            description: t('delete_contact_desc') as TranslationKeys,
            variant: 'danger',
            confirmLabel: t('block') as TranslationKeys
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/users/block`, { method: 'POST', body: JSON.stringify({ targetId: userId }) });
            if (res.ok) {
                setBlockStatus({ isBlocked: true, blockedByMe: true });
                setIsContact(true);
                showSuccess(t('success_update'));
                window.dispatchEvent(new Event('contacts_updated'));
            } else {
                showError(t('contact_save_error'));
            }
        } catch (e) {
            console.error(e);
            showError(t('server_error'));
        }
    };

    const fetchBlockStatus = useCallback(async () => {
        if (!chat || chat.type !== 'private') return;
        try {
            const targetId = getPrivateChatPeerUserId(chat);
            if (!targetId) return;
            const res = await apiFetch(`/api/users/${targetId}`);
            if (res.ok) {
                const data = await res.json();
                setBlockStatus({ isBlocked: data.isBlocked, blockedByMe: data.blockedByMe });
            }
        } catch (e) { console.error("Block status check error:", e); }
    }, [chat?.id, chat?.type, chat?.userId, chat?.participantId, chat?.participants, chat?.otherUser?.id, chat?.otherUser?.user_id]);

    useEffect(() => {
        if (chat?.id) {
            fetchActiveSession();
            checkIfContact();
            fetchBlockStatus();
            if (chat.isTrade) fetchTradeDetails();
        }
    }, [chat?.id, chat?.isTrade, fetchActiveSession, checkIfContact, fetchTradeDetails, fetchBlockStatus]);

    useEffect(() => {
        setHeaderImageError(false);
    }, [chat?.id]);

    const stopCallRing = useCallback(() => {
        if (callRingIntervalRef.current) {
            clearInterval(callRingIntervalRef.current);
            callRingIntervalRef.current = null;
        }
        if (callRingRef.current) {
            callRingRef.current.pause();
            callRingRef.current.currentTime = 0;
        }
    }, []);

    useEffect(() => {
        if (socket && isConnected && chat?.id) {
            const handleSessionUpdate = (session: ServiceSessionPayload) => {
                const matches =
                    String(session.chat_id ?? '') === String(chat.id) ||
                    session.expert_id === chat.userId ||
                    session.client_id === chat.userId;

                if (matches) {
                    if (session.status === 'completed' || session.status === 'cancelled') {
                        setActiveSession(null);
                    } else {
                        setActiveSession(session);
                    }
                }
            };

            socket.on('service_session_updated', handleSessionUpdate);

            socket.on('incoming_call', (data: CallSignalPayload) => {
                setCallData(data);
                if (data.callType === 'video' || data.callType === 'audio') {
                    setCallType(data.callType);
                } else if (
                    data.signal &&
                    typeof data.signal === 'object' &&
                    'sdp' in data.signal &&
                    typeof (data.signal as { sdp?: string }).sdp === 'string' &&
                    (data.signal as { sdp: string }).sdp.includes('m=video')
                ) {
                    setCallType('video');
                } else {
                    setCallType('audio');
                }
                setIsIncomingCall(true);
                if (!callRingRef.current) callRingRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                try {
                    callRingRef.current.play().catch(() => {});
                    callRingIntervalRef.current = setInterval(() => {
                        if (callRingRef.current) {
                            callRingRef.current.currentTime = 0;
                            callRingRef.current.play().catch(() => {});
                        }
                    }, 2000);
                } catch (_) {}
            });

            socket.on('call_accepted', async (data: CallSignalPayload) => {
                stopCallRing();
                setIsCalling(true);
                startCallTimer();
                const sig = data.signal;
                if (
                    pcRef.current &&
                    sig &&
                    typeof sig === 'object' &&
                    'type' in sig &&
                    (sig as RTCSessionDescriptionInit).type === 'answer'
                ) {
                    try {
                        await pcRef.current.setRemoteDescription(
                            new RTCSessionDescription(sig as RTCSessionDescriptionInit)
                        );
                        pendingCandidatesRef.current.forEach(c => pcRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
                        pendingCandidatesRef.current = [];
                    } catch (e) {
                        console.error('Error setting remote description on accept', e);
                    }
                }
            });

            socket.on('call_rejected', () => {
                stopCallRing();
                setIsCalling(false);
                setCallData(null);
                showError(t('reject'));
            });

            socket.on('call_ended', () => {
                stopCallRing();
                endCallUI();
            });

            socket.on('call_signal', async (data: CallSignalPayload) => {
                if (!pcRef.current || !data?.signal || typeof data.signal !== 'object') return;
                const sig = data.signal as Record<string, unknown> & {
                    candidate?: unknown;
                    type?: string;
                };

                try {
                    if (sig.candidate !== undefined) {
                        // ICE candidate — avval tekshirish (offer/answer dan keyin qo‘shiladi)
                        if (pcRef.current.remoteDescription?.type) {
                            await pcRef.current.addIceCandidate(
                                new RTCIceCandidate(sig as RTCIceCandidateInit)
                            );
                        } else {
                            pendingCandidatesRef.current.push(sig as RTCIceCandidateInit);
                        }
                    } else if (sig.type === 'offer') {
                        await pcRef.current.setRemoteDescription(
                            new RTCSessionDescription(sig as RTCSessionDescriptionInit)
                        );
                        pendingCandidatesRef.current.forEach((c) => pcRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
                        pendingCandidatesRef.current = [];
                        const answer = await pcRef.current.createAnswer();
                        await pcRef.current.setLocalDescription(answer);
                        socket.emit('call_signal', { to: data.from, signal: answer });
                    } else if (sig.type === 'answer') {
                        await pcRef.current.setRemoteDescription(
                            new RTCSessionDescription(sig as RTCSessionDescriptionInit)
                        );
                        pendingCandidatesRef.current.forEach((c) => pcRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(() => {}));
                        pendingCandidatesRef.current = [];
                    }
                } catch (err) {
                    console.warn("WebRTC signal error:", err);
                }
            });

            return () => {
                if (callRingIntervalRef.current) clearInterval(callRingIntervalRef.current);
                socket.off('service_session_updated', handleSessionUpdate);
                socket.off('incoming_call');
                socket.off('call_accepted');
                socket.off('call_rejected');
                socket.off('call_ended');
                socket.off('call_signal');
            };
        }
    }, [chat?.id, chat?.userId, socket, isConnected, stopCallRing]);

    const startCallTimer = () => {
        setCallTimer(0);
        if (callIntervalRef.current) clearInterval(callIntervalRef.current);
        callIntervalRef.current = setInterval(() => {
            setCallTimer(prev => prev + 1);
        }, 1000);
    };


    const formatCallTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const initializePeerConnection = (targetUserId: string) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                console.log("[WebRTC] Sending ICE candidate to", targetUserId);
                socket.emit('call_signal', { to: targetUserId, signal: event.candidate });
            }
        };

        pc.ontrack = (event) => {
            const stream = event.streams[0];
            if (!stream) return;
            setRemoteStream(stream);
            const playRemote = () => {
                const el = remoteAudioRef.current;
                if (el) {
                    el.srcObject = stream;
                    el.play().catch(() => {});
                }
            };
            playRemote();
            setTimeout(playRemote, 150);
            requestAnimationFrame(() => setTimeout(playRemote, 50));
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'connected' && remoteAudioRef.current?.srcObject) {
                remoteAudioRef.current.play().catch(() => {});
            }
        };

        pcRef.current = pc;
        return pc;
    };

    const startLocalStream = async (wantVideo: boolean = false) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: wantVideo
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error("Media access error:", err);
            return null;
        }
    };

    const handleCall = async (typeOverride?: 'audio' | 'video') => {
        if (!socket || !chat) return;
        const targetUserId = String(chat.otherUser?.id || chat.userId || chat.id);
        const myName = (getUser() || {}).name || "User";

        const selectedType = typeOverride || callType;
        const finalType: 'audio' | 'video' = lowBandwidth ? 'audio' : selectedType;
        setCallType(finalType);
        setIsCalling(true);

        if (finalType === 'video') {
            // LiveKit handles media itself
            socket.emit('call_user', {
                targetUserId,
                fromName: myName,
                signal: { type: 'livekit' },
                callType: 'video'
            });
            return;
        }

        const stream = await startLocalStream(false); // audio only P2P
        const pc = initializePeerConnection(targetUserId);

        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call_user', {
            targetUserId,
            fromName: myName,
            signal: offer,
            callType: 'audio'
        });
    };

    const handleAcceptCall = async () => {
        if (!socket || !callData) return;
        const remotePeerId =
            callData.from != null && String(callData.from) !== ''
                ? String(callData.from)
                : String(chat?.otherUser?.id ?? chat?.userId ?? chat?.id ?? '');
        if (!remotePeerId) return;
        stopCallRing();
        setIsIncomingCall(false);
        setIsCalling(true);
        startCallTimer();

        const finalType: 'audio' | 'video' = lowBandwidth ? 'audio' : callType;
        setCallType(finalType);

        if (finalType === 'video') {
            socket.emit('accept_call', { to: remotePeerId, signal: { type: 'livekit' } });
            return;
        }

        const stream = await startLocalStream(false);
        const pc = initializePeerConnection(remotePeerId);

        if (stream) {
            stream.getTracks().forEach(track => pc.addTrack(track, stream));
        }

        // The offer came in the initial signal or will come through call_signal
        const incomingSig = callData.signal;
        if (
            incomingSig &&
            typeof incomingSig === 'object' &&
            'type' in incomingSig &&
            (incomingSig as RTCSessionDescriptionInit).type === 'offer'
        ) {
            await pc.setRemoteDescription(
                new RTCSessionDescription(incomingSig as RTCSessionDescriptionInit)
            );
            pendingCandidatesRef.current.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
            pendingCandidatesRef.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('accept_call', { to: remotePeerId, signal: answer });
        } else {
            socket.emit('accept_call', { to: remotePeerId, signal: { type: 'accept' } });
        }
    };

    const handleRejectCall = () => {
        stopCallRing();
        if (!socket || !callData) return;
        const to =
            callData.from != null && String(callData.from) !== ''
                ? String(callData.from)
                : String(chat?.otherUser?.id ?? chat?.userId ?? chat?.id ?? '');
        if (to) socket.emit('reject_call', { to });
        setIsIncomingCall(false);
        setCallData(null);
    };

    const handleEndCall = () => {
        stopCallRing();
        if (!socket) return;
        const targetId = callData?.from || chat?.otherUser?.id || chat?.userId || chat?.id;
        socket.emit('end_call', { to: String(targetId) });
        endCallUI();
    };

    const endCallUI = () => {
        setIsCalling(false);
        setIsIncomingCall(false);
        setCallData(null);
        if (callIntervalRef.current) clearInterval(callIntervalRef.current);

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        setRemoteStream(null);
        pendingCandidatesRef.current = [];
        setIsMuted(false);
        setLowBandwidth(false);
    };

    useEffect(() => {
        if (!remoteStream) return;
        const el = remoteAudioRef.current;
        if (!el) return;
        el.srcObject = remoteStream;
        const play = () => el.play().catch(() => {});
        play();
        const t = setTimeout(play, 200);
        return () => clearTimeout(t);
    }, [remoteStream, isCalling, isIncomingCall, callType]);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, isCalling, isIncomingCall, callType]);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    }, []);

    const messagesScrollRef = useRef<HTMLDivElement>(null);
    /** State — UI; ref — messages effect dependency bo‘lmasin (aks holda tepaga scroll qilinsa effect qayta ishlab !hasAppended bilan pastga tortadi) */
    const [isNearBottom, setIsNearBottom] = useState(true);
    const isNearBottomRef = useRef(true);
    const [newMessagesWhileUp, setNewMessagesWhileUp] = useState(0);
    const prevMessagesLengthRef = useRef(0);
    const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
        const el = messagesScrollRef.current;
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior });
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior });
        }
    };

    /** Chat almashganda xabarlar paint oldidan cache dan — bo'sh flash va animatsiya bilan birga ko'rinish */
    useLayoutEffect(() => {
        if (!chat?.id) {
            setMessages([]);
            return;
        }
        const cached = sortChatMessagesLocal(readChatMessageCache(chat.id));
        setMessages(cached);
        prevMessagesLengthRef.current = cached.length;
        setNewMessagesWhileUp(0);
        setIsNearBottom(true);
        isNearBottomRef.current = true;
        if (cached.length) {
            const el = messagesScrollRef.current;
            if (el) {
                el.scrollTop = el.scrollHeight;
            } else {
                messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            }
        }
    }, [chat?.id]);

    useEffect(() => {
        const prevLen = prevMessagesLengthRef.current;
        const hasAppended = messages.length > prevLen;
        const near = isNearBottomRef.current;

        if (hasAppended) {
            if (near) {
                scrollToBottom('auto');
                setNewMessagesWhileUp(0);
            } else {
                setNewMessagesWhileUp((c) => c + (messages.length - prevLen));
            }
        } else if (near) {
            // Uzunlik o‘zgarmagan/yetakchi patch (o‘qilgan, optimistic): faqat foydalanuvchi allaqachon pastda bo‘lsa
            scrollToBottom('auto');
            setNewMessagesWhileUp(0);
        }

        prevMessagesLengthRef.current = messages.length;
        if (chat?.id && messages.length) {
            writeChatMessageCache(chat.id, messages);
        }
    }, [messages, chat?.id]);

    const toggleMute = () => {
        setIsMuted(prev => {
            const next = !prev;
            if (localStream) {
                localStream.getAudioTracks().forEach(track => {
                    track.enabled = !next;
                });
            }
            return next;
        });
    };

    const [isSomeoneTyping, setIsSomeoneTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!socket || !chat) return;
        const handleTyping = (data: TypingPayload) => {
            if (String(data.roomId) === String(chat.id) && data.senderId !== (getUser() || {}).id) {
                setIsSomeoneTyping(true);
            }
        };
        const handleStopTyping = (data: TypingPayload) => {
            if (String(data.roomId) === String(chat.id)) setIsSomeoneTyping(false);
        };
        socket.on('typing', handleTyping);
        socket.on('stop_typing', handleStopTyping);
        return () => {
            socket.off('typing', handleTyping);
            socket.off('stop_typing', handleStopTyping);
        };
    }, [socket, chat]);

    const markAsRead = useCallback(async () => {
        if (!chat || !chat.id) return;
        if (onMarkAsRead) {
            onMarkAsRead(String(chat.id));
        } else {
            try {
                await apiFetch(`/api/chats/${chat.id}/read`, { method: 'POST' });
            } catch (e) { console.error("Mark as read error:", e); }
        }
    }, [chat?.id, onMarkAsRead]);

    // Handle incoming messages_read from socket
    useEffect(() => {
        if (!socket || !chat?.id) return;
        const handleMessagesRead = (data: { roomId: string, messageIds: string[], readBy: string }) => {
            if (String(data.roomId) === String(chat.id) && data.readBy !== (getUser() || {}).id) {
                setMessages(prev => prev.map(m =>
                    data.messageIds.includes(m.id) ? { ...m, is_read: true } : m
                ));
            }
        };
        socket.on('messages_read', handleMessagesRead);
        return () => { socket.off('messages_read', handleMessagesRead); };
    }, [socket, chat?.id]);

    // Intersection Observer for marking messages as read
    const observer = useRef<IntersectionObserver | null>(null);
    const observeMessage = useCallback((node: HTMLDivElement | null, msg: ChatMessage) => {
        if (!node || !socket || !chat?.id) return;
        if (msg.sender === 'me' || msg.is_read) return; // Only observe unread messages from them

        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                socket.emit('mark_messages_read', {
                    roomId: chat.id,
                    messageIds: [msg.id]
                });
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
                observer.current?.disconnect();
            }
        }, { threshold: 0.5 }); // Message should be at least 50% visible

        observer.current.observe(node);
    }, [socket, chat?.id]);

    useEffect(() => {
        if (!socket || !chat) return;

        const fetchHistory = async () => {
            if (!chat.id) return;
            try {
                const res = await apiFetch(`/api/chats/${chat.id}/messages`);
                if (res.ok) {
                    const history = await res.json();
                    const mapped = mapApiMessagesToLocal(history);
                    setMessages((prev) => {
                        const next = mergeFetchedChatMessages(prev, mapped);
                        writeChatMessageCache(chat.id, next);
                        return next;
                    });
                    setTimeout(() => {
                        const el = messagesScrollRef.current;
                        if (!el) return;
                        const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
                        if (dist < CHAT_NEAR_BOTTOM_PX) scrollToBottom('auto');
                    }, 50);
                    markAsRead(); // Mark as read when history is fetched
                }
            } catch (err) { console.error(err); }
        };
        fetchHistory();
        const joinCurrentRoom = () => {
            if (chat?.id) socket.emit('join_room', chat.id);
        };
        joinCurrentRoom();

        const handleReceiveMessage = (message: Record<string, unknown>) => {
            if (!socketMessageTargetsChat(message, String(chat.id))) return;
            const user = (getUser() || {});
            const senderId = message.sender_id ?? message.senderId;
            setMessages((prev) => mergeIncomingSocketMessage(prev, message, user.id != null ? String(user.id) : undefined));
            if (String(senderId) !== String(user.id)) {
                if (audioRef.current) audioRef.current.play().catch(() => { });
                markAsRead();
            }
        };
        socket.on('receive_message', handleReceiveMessage);
        socket.on('connect', joinCurrentRoom);

        const handleSocketError = (payload: { message?: string } | string) => {
            const msg = typeof payload === 'string' ? payload : payload?.message;
            if (msg) showError(msg);
        };
        socket.on('error', handleSocketError);

        const handleReconnect = () => {
            console.log("[ChatWindow] Reconnected, syncing history...");
            joinCurrentRoom();
            fetchHistory();
        };
        window.addEventListener('socket_reconnected', handleReconnect);

        return () => { 
            socket.off('receive_message', handleReceiveMessage);
            socket.off('connect', joinCurrentRoom);
            socket.off('error', handleSocketError);
            window.removeEventListener('socket_reconnected', handleReconnect);
        };
    }, [socket, chat, markAsRead, showError]);

    const sendMessage = async (textOverride?: string) => {
        const content = String(textOverride ?? inputValue ?? '').trim();
        if (!content || !chat) return;
        const clientSideId = `temp_${Date.now()}`;
        const inputContent = content;
        const currentReplyTo = replyTo;

        setInputValue("");
        setReplyTo(null);

        const meId = (getUser() as { id?: string } | null)?.id;
        const chatTimeLocale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
        setMessages((prev) => {
            const optimistic = createOptimisticChatMessage({
                id: clientSideId,
                text: inputContent,
                senderId: meId,
                prevMessages: prev,
                type: 'text',
                parentId: currentReplyTo?.id,
                parentMessage: currentReplyTo ?? undefined,
                isPending: !isNetworkOnline || !isConnected,
                locale: chatTimeLocale,
            });
            return sortChatMessagesLocal([...prev, optimistic]);
        });

        if (isNetworkOnline && isConnected && socket) {
            socket.emit('send_message', {
                roomId: chat.id,
                content: inputContent,
                type: 'text',
                clientSideId,
                parentId: currentReplyTo?.id
            });
        } else {
            // Offline - Save to IndexedDB
            const offlineMsg: OfflineMessage = {
                id: clientSideId,
                chatId: String(chat.id),
                text: inputContent,
                type: 'text',
                timestamp: Date.now(),
                status: 'pending',
                parentId: currentReplyTo?.id
            };
            try {
                await maliDB.saveMessage(offlineMsg);
            } catch (e) {
                console.error("Failed to save offline msg", e);
            }
        }
    };

    // O'ng panel (UserInfoPanel) dan xabar yuborishni qo'llab-quvvatlash
    useEffect(() => {
        const handler = (e: CustomEvent<{ text: string }>) => {
            if (chat && e.detail?.text?.trim()) sendMessage(e.detail.text.trim());
        };
        window.addEventListener('panel_quick_send', handler as EventListener);
        return () => window.removeEventListener('panel_quick_send', handler as EventListener);
    }, [chat?.id]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isFolder = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setPendingFiles(Array.from(files));
        if (e.target) e.target.value = '';
    };

    const handleConfirmUpload = async (files: File[], caption: string, compress: boolean) => {
        if (!chat) return;
        const currentReplyTo = replyTo; // Capture current reply state
        setPendingFiles([]);
        setReplyTo(null); // Clear reply state after starting upload
        setIsUploadingMedia(true);
        const { uploadFileWithProgress } = await import('@/lib/upload');

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const tempId = `temp_${Date.now()}_${i}`;

            // Optimistic UI for each file
            const initialType = file.type.startsWith('image/') ? 'image' : (file.type.startsWith('video/') ? 'video' : (file.type.startsWith('audio/') ? 'voice' : 'file'));

            const uid = (getUser() as { id?: string } | null)?.id;
            const chatTimeLocale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
            setMessages((prev) => {
                const row = createOptimisticChatMessage({
                    id: tempId,
                    text: file.name,
                    senderId: uid,
                    prevMessages: prev,
                    type: initialType,
                    parentId: currentReplyTo?.id,
                    parentMessage: currentReplyTo ?? undefined,
                    isUploading: true,
                    locale: chatTimeLocale,
                });
                return sortChatMessagesLocal([...prev, row]);
            });

            const formData = new FormData();
            formData.append('files', file);

            try {
                const data = await uploadFileWithProgress('/api/media/upload', formData, (progress) => {
                    setUploadProgresses(prev => ({ ...prev, [tempId]: progress.percent }));
                });

                if (data.files && data.files.length > 0) {
                    const uploadedFile = data.files[0];
                    if (socket) {
                        const mimetype = uploadedFile.mimetype || uploadedFile.type || '';
                        socket.emit('send_message', {
                            roomId: chat.id,
                            content: uploadedFile.url,
                            type: mimetype.startsWith('image/') ? 'image' : (mimetype.startsWith('video/') ? 'video' : (mimetype.startsWith('audio/') ? 'voice' : 'file')),
                            clientSideId: tempId,
                            caption: i === 0 ? caption : undefined,
                            metadata: {
                                name: file.name,
                                file_name: file.name,
                                size: file.size,
                                mimetype: mimetype
                            },
                            parentId: currentReplyTo?.id
                        });
                    }
                    // Update state to remove progress and mark as uploaded
                    setUploadProgresses(prev => {
                        const next = { ...prev };
                        delete next[tempId];
                        return next;
                    });
                }
            } catch (err) {
                console.error("Upload failed for", file.name, err);
                setMessages(prev =>
                    prev.map((m) =>
                        m.id === tempId
                            ? normalizeChatMessage({ ...(m as unknown as Record<string, unknown>), error: t('upload_error') })
                            : m
                    )
                );
            }
        }
        setIsUploadingMedia(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setPendingFiles(Array.from(e.dataTransfer.files));
        }
    };

    const startRecording = async () => {
        const roomId = chat?.id;
        if (roomId == null) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });

                setIsUploadingMedia(true);
                const { uploadFileWithProgress } = await import('@/lib/upload');
                const formData = new FormData();
                formData.append('files', file);

                try {
                    const data = await uploadFileWithProgress(`/api/media/upload`, formData);
                    const fileUrl = data.url || (data.urls && data.urls[0]) || (data.files && data.files[0]?.url);
                    if (!fileUrl) throw new Error("Upload response missing URL");

                    const clientSideId = `voice_${Date.now()}`;
                    if (socket) {
                        socket.emit('send_message', { roomId, content: fileUrl, type: 'voice', clientSideId });
                    }
                    const vUid = (getUser() as { id?: string } | null)?.id;
                    const chatTimeLocale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
                    setMessages((prev) => {
                        const row = createOptimisticChatMessage({
                            id: clientSideId,
                            text: fileUrl,
                            senderId: vUid,
                            prevMessages: prev,
                            type: 'voice',
                            locale: chatTimeLocale,
                        });
                        return sortChatMessagesLocal([...prev, row]);
                    });
                } catch (err) { console.error("Voice upload error:", err); }
                finally { setIsUploadingMedia(false); }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Microphone access error:", err);
            showError(t('mic_access_denied'));
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const filteredMessages = useMemo(() => {
        const filtered = messages.filter((m) => {
            // Text search
            if (searchQuery.trim()) {
                const text = (m.text || '').toLowerCase();
                if (!text.includes(searchQuery.toLowerCase())) return false;
            }

            // Type filter
            if (searchType === 'text' && m.type !== 'text') return false;
            if (searchType === 'media' && !['image', 'video', 'voice'].includes(m.type)) return false;
            if (searchType === 'files' && m.type !== 'file') return false;

            // Date filter
            const created = parseMessageDate(m) ?? new Date();
            if (searchDateFrom) {
                const from = new Date(searchDateFrom);
                from.setHours(0, 0, 0, 0);
                if (created < from) return false;
            }
            if (searchDateTo) {
                const to = new Date(searchDateTo);
                to.setHours(23, 59, 59, 999);
                if (created > to) return false;
            }

            return true;
        });
        return sortChatMessagesLocal(filtered);
    }, [messages, searchQuery, searchType, searchDateFrom, searchDateTo]);

    // Performance: DOM ga faqat ko'rinadigan "oyna" render qilinadi.
    const BASE_RENDER_WINDOW = searchQuery.trim() ? 200 : 120;
    const RENDER_WINDOW_STEP = searchQuery.trim() ? 120 : 80;
    const [visibleCount, setVisibleCount] = useState(BASE_RENDER_WINDOW);
    const loadingOlderRef = useRef(false);

    useEffect(() => {
        setVisibleCount(BASE_RENDER_WINDOW);
        loadingOlderRef.current = false;
    }, [chat?.id, BASE_RENDER_WINDOW, searchQuery, searchType, searchDateFrom, searchDateTo]);

    const renderStartIndex = Math.max(0, filteredMessages.length - visibleCount);
    const renderedMessages = filteredMessages.slice(renderStartIndex);

    const handleMessagesScroll = useCallback(() => {
        const el = messagesScrollRef.current;
        if (!el) return;
        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const nearBottomNow = distanceToBottom < CHAT_NEAR_BOTTOM_PX;
        isNearBottomRef.current = nearBottomNow;
        setIsNearBottom(nearBottomNow);
        if (nearBottomNow && newMessagesWhileUp) {
            setNewMessagesWhileUp(0);
        }

        if (el.scrollTop > 120) return;
        if (renderStartIndex <= 0) return;
        if (loadingOlderRef.current) return;

        loadingOlderRef.current = true;
        const prevHeight = el.scrollHeight;
        setVisibleCount((prev) => prev + RENDER_WINDOW_STEP);

        requestAnimationFrame(() => {
            const node = messagesScrollRef.current;
            if (node) {
                const nextHeight = node.scrollHeight;
                node.scrollTop += Math.max(0, nextHeight - prevHeight);
            }
            loadingOlderRef.current = false;
        });
    }, [renderStartIndex, RENDER_WINDOW_STEP, newMessagesWhileUp]);

    const jumpToLatestMessage = useCallback(() => {
        scrollToBottom('smooth');
        isNearBottomRef.current = true;
        setIsNearBottom(true);
        setNewMessagesWhileUp(0);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') window.currentSearchQuery = searchQuery;
    }, [searchQuery]);

    if (!chat) return <div className="flex-1 flex items-center justify-center text-white/40">{t('select_chat')}</div>;

    const currentUser = getUser() || {};
    const chatCompliance =
        chat?.type === 'private' && chat?.otherUser
            ? getExpertComplianceNotice(
                  getExpertPanelMode(
                      chat.otherUser as Parameters<typeof getExpertPanelMode>[0]
                  ),
                  'client',
                  t,
                  tLines
              )
            : null;
    const isChannelCreator = chat?.type === 'channel' && (chat?.creator_id ?? chat?.creatorId) === currentUser?.id;
    const isTrade = chat?.isTrade;
    const isBuyer = tradeData?.buyer_id === currentUser.id;
    const isSeller = tradeData?.seller_id === currentUser.id;
    const roleLabel = isTrade ? (isBuyer ? t('buyer') : isSeller ? t('seller') : t('trade_participant')) : null;
    const displayName = isTrade ? roleLabel : chat.name;

    const isOnlineHeader = chat.online || isOnline || chat.otherUser?.online;

    return (
        <div
            className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden relative lg:glass-premium lg:rounded-3xl lg:border lg:border-white/10 ${suppressRootFade ? '' : 'animate-fade-in'}`}
        >
            {/* Header — tepada qotib turadi */}
            <header className={`flex items-center justify-between border-b border-white/10 z-20 shrink-0 backdrop-blur-xl bg-white/5 transition-all duration-200 ${inputFocused ? 'py-2 px-3 lg:py-4 lg:px-4 lg:pt-4 pt-[max(1.25rem,env(safe-area-inset-top))]' : 'p-4 lg:pt-4 pt-[max(2rem,env(safe-area-inset-top))]'}`}>
                {debugError && (
                    <div className="absolute top-full left-0 right-0 bg-red-500/80 text-white text-[10px] p-1 text-center animate-shake">
                        {debugError}
                    </div>
                )}
                {isSelecting ? (
                    <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setIsSelecting(false); setSelectedMessageIds([]); }} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <span className="text-white font-medium">{selectedMessageIds.length} {t('delete_messages')}</span>
                        </div>
                        {selectedMessageIds.length > 0 && (
                            <button onClick={handleDeleteSelected} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors flex items-center gap-2 px-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                <span className="text-sm font-bold hidden sm:block">{t('delete_messages')}</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    className="lg:hidden p-2 -ml-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all active:scale-95"
                                    aria-label="Back"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <div className="flex items-center gap-2 cursor-pointer group min-w-0 flex-1" onClick={onToggleInfo}>
                                <div className="relative flex-shrink-0">
                                    <div className={`rounded-full border-2 border-white/10 flex items-center justify-center text-white font-bold overflow-hidden transition-transform group-hover:scale-105 ${inputFocused ? 'w-8 h-8 lg:w-10 lg:h-10' : 'w-10 h-10'} ${isTrade ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                                        {(() => {
                                            const avatar = chat.avatar || chat.avatar_url || chat.otherUser?.avatar || chat.otherUser?.avatar_url;
                                            if (avatar && avatar !== 'null' && avatar !== '' && !headerImageError) {
                                                const src = avatar.startsWith('http') || avatar.startsWith('data:')
                                                    ? avatar
                                                    : `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
                                                return <img src={src} className="w-full h-full object-cover" onError={() => setHeaderImageError(true)} alt="" />;
                                            }
                                            return displayName ? displayName[0].toUpperCase() : '?';
                                        })()}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1c20] ${isOnlineHeader ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-500'}`}></div>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold leading-tight truncate max-w-[120px] sm:max-w-[300px] group-hover:text-blue-400 transition-colors">{displayName}</h3>
                                    <p className={`text-white/40 uppercase tracking-widest font-bold ${inputFocused ? 'hidden lg:block text-[10px]' : 'text-[10px]'}`}>
                                        {isTrade ? t('trade_dialog') : (isOnlineHeader ? t('online') : t('offline'))}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-2">
                            {showSearch && (
                                <div className="hidden md:flex items-center gap-2 animate-scale-in">
                                    <input
                                        autoFocus
                                        className="bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-xs text-white outline-none w-40"
                                        placeholder={t('search_messages') as string}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    <select
                                        className="bg-white/5 border border-white/10 rounded-full px-2 py-1 text-[11px] text-white outline-none"
                                        value={searchType}
                                        onChange={(e) =>
                                            setSearchType(e.target.value as 'all' | 'text' | 'media' | 'files')
                                        }
                                    >
                                        <option value="all">{t('all')}</option>
                                        <option value="text">{t('file')}</option>
                                        <option value="media">{t('image')}/{t('video')}</option>
                                        <option value="files">{t('file')}</option>
                                    </select>
                                    <input
                                        type="date"
                                        className="bg-white/5 border border-white/10 rounded-full px-2 py-1 text-[11px] text-white outline-none"
                                        value={searchDateFrom}
                                        onChange={e => setSearchDateFrom(e.target.value)}
                                        title={t('start_date') as string}
                                    />
                                    <input
                                        type="date"
                                        className="bg-white/5 border border-white/10 rounded-full px-2 py-1 text-[11px] text-white outline-none"
                                        value={searchDateTo}
                                        onChange={e => setSearchDateTo(e.target.value)}
                                        title={t('end_date') as string}
                                    />
                                </div>
                            )}
                            <button
                                onClick={() => setShowSearch(!showSearch)}
                                className={`p-2 rounded-full transition-all ${showSearch ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                                title="Qidiruv"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </button>
                            {!isTrade && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => {
                                            setPendingCallType('audio');
                                            setShowPreCallModal(true);
                                        }}
                                        className="p-2 text-white/60 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                                        title="Ovozli chaqiruv"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setPendingCallType('video');
                                            setShowPreCallModal(true);
                                        }}
                                        className="p-2 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full transition-colors"
                                        title="Videochaqiruv"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                    </button>
                                </div>
                            )}
                            <div className="relative">
                                <button onClick={() => setShowMoreMenu(!showMoreMenu)} className={`p-2 rounded-full transition-all ${showMoreMenu ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                </button>

                                {showMoreMenu && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                                        <div className="absolute top-full right-0 mt-2 w-64 glass-premium border border-white/10 rounded-2xl shadow-2xl py-2 z-40 animate-scale-in">
                                            <button onClick={() => { setIsSelecting(true); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <span>{t('select_messages')}</span>
                                            </button>
                                            <button onClick={() => { handleSummarizeChat(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                {isSummarizing ? (
                                                    <svg className="h-5 w-5 animate-spin opacity-60" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                ) : (
                                                    <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                )}
                                                <span>{isSummarizing ? t('translating') : t('ai_summary')}</span>
                                            </button>
                                            <div className="h-px bg-white/5 my-1" />
                                            <button onClick={() => { onToggleInfo?.(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                <span>{t('show_profile')}</span>
                                            </button>
                                            <button onClick={() => { handleExportHistory(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                                <span>{t('export_history')}</span>
                                            </button>
                                            <button onClick={() => { handleClearHistory(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                <span>{t('clear_history')}</span>
                                            </button>
                                            <button onClick={() => { handleDeleteChat(); setShowMoreMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                                <svg className="h-5 w-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                <span>{t('delete_chat')}</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </header>

            {/* AI Summary Banner */}
            {chatSummary && (
                <div className="z-10 px-4 mt-2">
                    <div className="bg-purple-900/40 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-4 shadow-lg animate-slide-down relative">
                        <button onClick={() => setChatSummary(null)} className="absolute top-2 right-2 p-1 text-white/50 hover:text-white bg-white/5 rounded-full">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            <span className="text-sm font-bold text-purple-200">{t('ai_summary')} {t('ai_summary_desc')}</span>
                        </div>
                        <p className="text-sm text-white/90 leading-relaxed pl-7">{chatSummary}</p>
                    </div>
                </div>
            )}

            {summaryError && (
                <div className="z-10 px-4 mt-2">
                    <div className="bg-red-900/40 backdrop-blur-xl border border-red-500/30 rounded-2xl p-3 shadow-lg flex justify-between items-center animate-slide-down">
                        <span className="text-xs text-red-200">{summaryError}</span>
                        <button onClick={() => setSummaryError(null)} className="text-white/50 hover:text-white p-1 ml-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
            )}

            {/* Special Banners Container */}
            <div className="z-10 px-4 space-y-2 mt-2">
                {chatCompliance && !isTrade && !isComplianceDismissed && (
                    <div className="bg-amber-900/30 backdrop-blur-xl border border-amber-400/30 rounded-2xl p-3 shadow-lg text-[11px] text-amber-50/95 leading-snug">
                        <p className="font-bold text-amber-100 mb-1">{chatCompliance.title}</p>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-50/90 mb-3">
                            {chatCompliance.lines.map((ln, i) => (
                                <li key={i}>{ln}</li>
                            ))}
                        </ul>
                        <button
                            onClick={() => setIsComplianceDismissed(true)}
                            className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-xl text-amber-100 font-bold transition-all active:scale-[0.98]"
                        >
                            {t('i_have_read')}
                        </button>
                    </div>
                )}
                {/* Unknown Contact Bar */}
                {!isContact && !isTrade && (
                    <div className="bg-[#1e293b]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-3 flex items-center justify-between shadow-lg animate-slide-up">
                        <div className="flex items-center gap-3 pl-2">
                            <div className="text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-white/80 text-xs font-medium">{t('not_in_contacts')}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddContact}
                                disabled={isAddingContact}
                                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-[10px] font-bold transition-all disabled:opacity-50"
                            >
                                {isAddingContact ? t('adding') : t('add')}
                            </button>
                            <button onClick={handleBlockUser} className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-bold transition-all">{t('block')}</button>
                        </div>
                    </div>
                )}

                {/* P2P Trade Banner */}
                {isTrade && tradeData && (
                    <div className="bg-emerald-600/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 flex justify-between items-center shadow-lg animate-fade-in relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">
                                    {t('p2p_trade')} #{String(tradeData.id ?? '').slice(0, 8)}
                                </h4>
                                <p className="text-emerald-400/70 text-[10px] font-medium uppercase tracking-wider">
                                    {tradeData.status} • {(Number(tradeData.amount_uzs) || 0).toLocaleString()} UZS
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Service Escrow Banner */}
                {activeSession && (
                    <div className="bg-blue-600/10 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-4 flex justify-between items-center shadow-lg animate-fade-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm">{t('service_session')}</h4>
                                <p className="text-blue-400/70 text-[10px] font-medium uppercase tracking-wider">{activeSession.status} • {activeSession.amount_mali} MALI {t('in_escrow')}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Messages Area — min-h-0 klaviatura ochilganda qisqaradi, xabarlar + input birga ko'tariladi */}
            <div
                ref={messagesScrollRef}
                className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 sm:p-4 space-y-1 custom-scrollbar relative pb-4 ${isDragging ? 'bg-blue-500/10' : ''}`}
                onScroll={handleMessagesScroll}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm pointer-events-none">
                        <div className="bg-[#1e293b] border-2 border-dashed border-blue-500 p-8 rounded-3xl flex flex-col items-center gap-4 animate-scale-in">
                            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <span className="text-white font-bold">{t('drop_files')}</span>
                        </div>
                    </div>
                )}
                {renderStartIndex > 0 && (
                    <div className="flex items-center justify-center my-2">
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                            Tepaga chiqing: yana {renderStartIndex} ta eski xabar yuklanadi
                        </div>
                    </div>
                )}
                {renderedMessages.map((msg, i) => {
                    const prevMsg = renderedMessages[i - 1];
                    const msgDate = parseMessageDate(msg);
                    const prevMsgDate = prevMsg ? parseMessageDate(prevMsg) : null;
                    const senderKey = (m: ChatMessage) =>
                        m.sender_id != null && m.sender_id !== ''
                            ? String(m.sender_id)
                            : String(m.sender ?? '');
                    /** Matn / media turini ajratish — rasm yoki videodan keyingi matn rasm “tagidagi davom” deb yopishilmasin */
                    const isNonTextBubble = (t: string) =>
                        ['image', 'video', 'voice', 'file'].includes(t);
                    const prevT = String(prevMsg?.type ?? 'text');
                    const currT = String(msg.type ?? 'text');
                    const mediaTextBoundary =
                        prevMsg && isNonTextBubble(prevT) !== isNonTextBubble(currT);
                    const isContinuation = Boolean(
                        prevMsg &&
                        !mediaTextBoundary &&
                        senderKey(prevMsg) === senderKey(msg) &&
                        msgDate &&
                        prevMsgDate &&
                        msgDate.getTime() - prevMsgDate.getTime() < 300000
                    );
                    const isNewDay = Boolean(
                        msgDate &&
                        (!prevMsgDate || msgDate.toDateString() !== prevMsgDate.toDateString())
                    );

                    const formatDateLabel = (d: Date) => {
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(today.getDate() - 1);
                        if (d.toDateString() === today.toDateString()) return t('today');
                        if (d.toDateString() === yesterday.toDateString()) return t('yesterday');
                        return d.toLocaleDateString(language === 'uz' ? 'uz-UZ' : (language === 'ru' ? 'ru-RU' : 'en-US'), { day: '2-digit', month: 'short', year: 'numeric' });
                    };

                    return (
                        <React.Fragment key={msg.id || i}>
                            {isNewDay && msgDate && (
                                <div className="flex items-center justify-center my-4">
                                    <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-wider text-white/50">
                                        {formatDateLabel(msgDate)}
                                    </div>
                                </div>
                            )}
                            <div ref={(node) => observeMessage(node, msg)}>
                                <MessageBubble
                                    message={msg}
                                    chatId={chat?.id ? String(chat.id) : undefined}
                                    onImageLoad={() => {
                                        if (isNearBottomRef.current) {
                                            requestAnimationFrame(() => scrollToBottom('auto'));
                                        }
                                    }}
                                    onReply={setReplyTo}
                                    isSelecting={isSelecting}
                                    isSelected={selectedMessageIds.includes(msg.id)}
                                    onSelect={() => toggleSelection(msg.id)}
                                    uploadProgress={uploadProgresses[msg.id]}
                                    onMediaClick={(url, type) => setViewerMedia({ url, type })}
                                    onForward={handleForwardMessage}
                                    onDelete={handleDeleteMessage}
                                    isContinuation={isContinuation}
                                    onReplyClick={handleReplyClick}
                                    activeAudioId={activeAudioId}
                                    onAudioPlay={setActiveAudioId}
                                    onReact={(emoji) => handleReactMessage(msg, emoji)}
                                />
                            </div>
                        </React.Fragment>
                    );
                })}
                {!isNearBottom && newMessagesWhileUp > 0 && (
                    <div className="sticky bottom-3 z-30 flex justify-end pr-1 pointer-events-none">
                        <button
                            type="button"
                            onClick={jumpToLatestMessage}
                            className="pointer-events-auto rounded-full bg-blue-500/90 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 shadow-lg border border-white/20 backdrop-blur animate-pulse"
                        >
                            {t('new_messages')} ({newMessagesWhileUp}) ↓
                        </button>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area — kanalda faqat yaratuvchi xabar/fayl qo'yadi; boshqalar faqat ko'radi */}
            <div className="shrink-0 w-full z-30 px-4 pt-0 pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+1rem))]">
                {chat?.type === 'private' && (
                    <ListingDealBar
                        chat={chat}
                        currentUserId={currentUser?.id != null ? String(currentUser.id) : undefined}
                    />
                )}
                {chat?.type === 'channel' && !isChannelCreator && (
                    <div className="py-3 px-4 rounded-2xl bg-white/5 border border-white/10 text-center text-white/50 text-sm">
                        {t('channel_admin_only')}
                    </div>
                )}
                {(!chat || chat.type !== 'channel' || isChannelCreator) && (
                <>
                {isSomeoneTyping && (
                    <div className="flex items-center gap-2 px-1 pb-1 text-[11px] text-white/60">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-bounce [animation-delay:120ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40 animate-bounce [animation-delay:240ms]" />
                        </div>
                        <span>{t('typing')}</span>
                    </div>
                )}
                <div className="flex items-center gap-2 p-2 rounded-[25px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-lg">
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="*" onChange={handleFileUpload} />
                    <input
                        type="file"
                        ref={folderInputRef}
                        className="hidden"
                        multiple
                        {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                        onChange={(e) => handleFileUpload(e, true)}
                    />

                    {replyTo && (
                        <div className="absolute bottom-full left-4 right-4 mb-2 animate-slide-up">
                            <div className="glass-premium border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-2xl overflow-hidden min-h-[50px] bg-[#1a1c20]/80 backdrop-blur-3xl">
                                <div className="w-1 h-full bg-blue-500 rounded-full absolute left-0 top-0 bottom-0" />
                                <div className="flex-1 min-w-0 ml-1">
                                    <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">
                                        {replyTo.sender === 'me' ? t('me') : (replyTo.senderName || t('interlocutor'))} {t('reply_to')}
                                    </p>
                                    <p className="text-xs text-white/60 truncate italic font-medium">
                                        {replyTo.type === 'text' ? replyTo.text : (replyTo.type === 'image' ? `🖼️ ${t('image')}` : (replyTo.type === 'video' ? `🎥 ${t('video')}` : `📄 ${t('file')}`))}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setReplyTo(null)}
                                    className="p-1.5 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-1">
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title={t('send_file') as string}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <button onClick={() => folderInputRef.current?.click()} className="p-2 text-white/50 hover:text-amber-400 transition-colors" title={t('send_folder') as string}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 flex items-center bg-transparent border-none outline-none text-white text-sm min-h-[40px]">
                        {isRecording ? (
                            <div className="flex items-center gap-3 w-full animate-pulse text-red-400 font-bold">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                                <span>{t('recording')} {formatCallTime(recordingTime)}</span>
                                <button onClick={() => {
                                    setIsRecording(false);
                                    if (timerRef.current) clearInterval(timerRef.current);
                                    if (mediaRecorderRef.current) mediaRecorderRef.current.ondataavailable = null;
                                    mediaRecorderRef.current?.stop();
                                }} className="ml-auto text-[10px] uppercase tracking-widest text-white/40 hover:text-white">{t('cancel')}</button>
                            </div>
                        ) : (
                            <input
                                ref={chatInputRef}
                                className="w-full bg-transparent border-none outline-none text-white placeholder-white/40"
                                placeholder={t('message_placeholder') as string}
                                style={{ fontSize: '16px' }}
                                value={inputValue}
                                onChange={e => {
                                    setInputValue(e.target.value);
                                    if (socket && chat) {
                                        socket.emit('typing', { roomId: chat.id });
                                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                                        typingTimeoutRef.current = setTimeout(() => {
                                            socket.emit('stop_typing', { roomId: chat.id });
                                        }, 2000);
                                    }
                                }}
                                onFocus={() => {
                                    setInputFocused(true);
                                    setTimeout(() => {
                                        const el = messagesScrollRef.current;
                                        if (!el) return;
                                        if (el.scrollHeight - el.scrollTop - el.clientHeight < CHAT_NEAR_BOTTOM_PX) {
                                            scrollToBottom('auto');
                                        }
                                    }, 100);
                                }}
                                onBlur={() => setInputFocused(false)}
                                onKeyPress={e => e.key === 'Enter' && sendMessage()}
                            />
                        )}
                    </div>
                    {inputValue.trim() || isRecording ? (
                        <button
                            type="button"
                            onClick={isRecording ? stopRecording : () => sendMessage()}
                            className={`p-2 rounded-full text-white transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}
                        >
                            {isRecording ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H9a1 1 0 01-1-1V7z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={startRecording}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                        </button>
                    )}
                </div>
                </>
                )}
            </div>

            {/* Premium Call Interface */}
            {(isIncomingCall || isCalling) && (
                currentUser?.is_expert && callType === 'video' && !isIncomingCall ? (
                    <LiveWorkspace
                        chat={chat}
                        user={currentUser}
                        localStream={localStream}
                        remoteStream={remoteStream}
                        onEndCall={handleEndCall}
                        callType={callType}
                    />
                ) : (
                    <div className="absolute inset-0 z-[100] bg-[#0d0d0f]/90 backdrop-blur-2xl flex flex-col items-center justify-between py-4 sm:py-6 md:py-8 animate-fade-in shadow-2xl overflow-hidden min-h-0">
                        {/* Remote audio — ovozli chaqiruvda sherik ovozini ijro qilish (ref doim overlayda) */}
                        <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only absolute opacity-0 w-0 h-0 pointer-events-none" aria-hidden />
                        {/* Elegant floating background glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

                        <div className="flex flex-col items-center z-10 w-full px-3 sm:px-6 md:px-8 flex-1 min-h-0 min-w-0">
                            <div className="text-center mb-3 sm:mb-4 md:mb-6 animate-slide-down shrink-0">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-wide mb-1 sm:mb-2 truncate max-w-[90vw]">{callData?.fromName || displayName}</h2>
                                {isIncomingCall ? (
                                    <p className="text-blue-400 font-medium tracking-widest uppercase text-xs sm:text-sm animate-pulse flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                        {t('incoming_call')}... ({callType === 'video' ? t('video_call') : t('voice_call')})
                                    </p>
                                ) : (
                                    <div className="flex flex-col items-center gap-1 sm:gap-2">
                                        <p className="text-white/40 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] px-2 sm:px-3 py-0.5 sm:py-1 bg-white/5 rounded-full">{callType === 'video' ? t('video_call') : t('voice_call')}</p>
                                        <p className="text-blue-400 font-mono text-lg sm:text-xl md:text-2xl tracking-widest font-light">{formatCallTime(callTimer)}</p>
                                    </div>
                                )}
                            </div>

                            <div className="relative group flex-1 min-h-0 w-full max-w-4xl flex flex-col min-w-0">
                                {callType === 'video' ? (
                                    <div className="relative w-full flex-1 min-h-[180px] sm:min-h-[200px] max-h-[40vh] sm:max-h-[50vh] md:max-h-[55vh] bg-black/60 rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-2xl ring-2 ring-white/5 mali-video-call-container">
                                        <LiveKitRoomWrapper
                                            sessionId={String(chat?.id ?? 'demo-room')}
                                            onDisconnected={handleEndCall}
                                        />
                                    </div>
                                ) : (
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 rounded-full animate-ping-slow bg-blue-500/20" />
                                        <div className="absolute -inset-2 sm:-inset-4 rounded-full animate-ping-slower bg-blue-500/10" />
                                        <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full glass-premium border-2 border-white/20 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-bold text-white shadow-[0_0_50px_rgba(59,130,246,0.5)] overflow-hidden relative z-10">
                                            {(() => {
                                                const avatarRaw =
                                                    chat?.avatar ??
                                                    chat?.otherUser?.avatar ??
                                                    chat?.otherUser?.avatar_url ??
                                                    callData?.fromAvatar;
                                                const avatar =
                                                    typeof avatarRaw === 'string'
                                                        ? avatarRaw
                                                        : avatarRaw != null
                                                          ? String(avatarRaw)
                                                          : '';
                                                if (avatar && avatar !== 'null' && avatar !== '') {
                                                    const src = avatar.startsWith('http')
                                                        ? avatar
                                                        : avatar.startsWith('data:')
                                                          ? avatar
                                                          : `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}${avatar.startsWith('/') ? '' : '/'}${avatar}`;
                                                    return <img src={src} className="w-full h-full object-cover" />;
                                                }
                                                return String(displayName || callData?.fromName || '?')[0].toUpperCase();
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-center w-full z-10 pt-2 sm:pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] shrink-0">
                            {isIncomingCall ? (
                                <div className="flex items-center gap-6 sm:gap-8 md:gap-10">
                                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                                        <button onClick={handleRejectCall} className="min-w-[48px] min-h-[48px] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 touch-manipulation" aria-label={t('reject') as string}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.15 10.85 21.56 21 21v-5.54z" /></svg>
                                        </button>
                                        <span className="text-white/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{t('reject')}</span>
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/40" />
                                            <button onClick={handleAcceptCall} className="relative min-w-[48px] min-h-[48px] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 touch-manipulation" aria-label={t('accept') as string}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                            </button>
                                        </div>
                                        <span className="text-white/60 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{t('accept')}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-premium px-3 py-2.5 sm:px-5 sm:py-3 rounded-full border border-white/10 flex items-center gap-3 sm:gap-5 shadow-2xl bg-black/40">
                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={async () => {
                                                const newType = callType === 'video' ? 'audio' : 'video';
                                                setCallType(newType);
                                                if (isCalling && !isIncomingCall) {
                                                    const stream = await startLocalStream(newType === 'video');
                                                    if (stream && pcRef.current) {
                                                        const videoTrack = stream.getVideoTracks()[0];
                                                        const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
                                                        if (sender && videoTrack) {
                                                            sender.replaceTrack(videoTrack);
                                                        } else if (videoTrack) {
                                                            pcRef.current.addTrack(videoTrack, stream);
                                                        }
                                                    }
                                                }
                                            }}
                                            className={`min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 active:scale-95 touch-manipulation ${callType === 'video' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-white/10 hover:bg-white/20 border border-white/10'}`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                        </button>
                                        <span className="text-white/50 text-[8px] sm:text-[9px] uppercase font-bold tracking-wider">{t('camera')}</span>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <button onClick={handleEndCall} className="min-w-[52px] min-h-[52px] w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 active:bg-red-600 text-white flex items-center justify-center shadow-[0_0_24px_rgba(239,68,68,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 touch-manipulation" aria-label={t('exit') as string}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 rotate-[135deg]" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15.46l-5.27-.61-2.52 2.52c-2.83-1.44-5.15-3.75-6.59-6.59l2.53-2.53L8.54 3H3.03C2.45 13.15 10.85 21.56 21 21v-5.54z" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <button
                                            onClick={toggleMute}
                                            className={`min-w-[44px] min-h-[44px] w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white transition-all shadow-xl hover:scale-105 active:scale-95 touch-manipulation ${
                                                isMuted ? 'bg-red-500/80 border-red-400 shadow-red-500/40' : 'bg-white/10 hover:bg-white/20 border border-white/10'
                                            }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                        </button>
                                        <span className="text-white/50 text-[8px] sm:text-[9px] uppercase font-bold tracking-wider">{isMuted ? t('mic_off') : t('mic_on')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            )}

            <MediaUploadModal
                open={pendingFiles.length > 0}
                files={pendingFiles}
                onClose={() => setPendingFiles([])}
                onSend={handleConfirmUpload}
            />

            {/* Pre-call modal */}
            {showPreCallModal && (
                <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
                    <div className="w-full max-w-md glass-premium border border-white/10 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white">
                                {pendingCallType === 'video' ? t('video_call') : t('voice_call')}
                            </h2>
                            <button
                                onClick={() => setShowPreCallModal(false)}
                                className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <p className="text-xs text-white/60 leading-relaxed">
                            {t('expert_mode_desc')}
                        </p>

                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-bold">
                                {(displayName || 'U')[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-white font-semibold truncate">{displayName}</p>
                                <p className="text-[11px] text-white/40 uppercase tracking-widest">
                                    {pendingCallType === 'video' ? t('video_call') : t('voice_call')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl px-4 py-3">
                            <div>
                                <p className="text-sm text-white font-semibold">{t('low_bandwidth')}</p>
                                <p className="text-[11px] text-white/40">
                                    {t('low_bandwidth_desc')}
                                </p>
                            </div>
                            <button
                                onClick={() => setLowBandwidth(prev => !prev)}
                                className={`w-11 h-6 rounded-full flex items-center px-1 transition-all ${
                                    lowBandwidth ? 'bg-emerald-500' : 'bg-white/20'
                                }`}
                            >
                                <span
                                    className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                                        lowBandwidth ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {pendingCallType === 'video' && lowBandwidth && (
                            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/40 rounded-2xl px-3 py-2">
                                {t('low_bandwidth_warning')}
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setShowPreCallModal(false)}
                                className="px-4 py-2 rounded-full text-xs font-semibold text-white/70 bg-white/5 hover:bg-white/10 border border-white/10"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={async () => {
                                    setShowPreCallModal(false);
                                    await handleCall(pendingCallType);
                                }}
                                className="px-5 py-2 rounded-full text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-500/40"
                            >
                                {t('start')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Forward to chat modal */}
            {forwardMessage && (
                <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={() => { setForwardMessage(null); setForwardAvatarErrors({}); }}>
                    <div className="w-full max-w-md max-h-[70vh] overflow-hidden glass-premium border border-white/10 rounded-3xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-bold text-white">{t('forward_to')}</h2>
                            <button onClick={() => { setForwardMessage(null); setForwardAvatarErrors({}); }} className="p-1.5 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                            {chats.filter((c) => c.id !== chat?.id).length === 0 ? (
                                <p className="text-white/50 text-sm py-6 text-center">{t('no_messages')}</p>
                            ) : (
                                chats.filter((c) => c.id !== chat?.id).map((c) => {
                                    const displayName = c.type === 'group' ? c.name : (c.otherUser ? `${c.otherUser.name || ''} ${c.otherUser.surname || ''}`.trim() || c.name : c.name) || 'Chat';
                                    const avatar = c.avatar || c.otherUser?.avatar || c.otherUser?.avatar_url;
                                    const avatarSrc = avatar && avatar !== 'null' && avatar !== '' && avatar !== 'use_initials'
                                        ? (avatar.startsWith('http') || avatar.startsWith('data:') ? avatar : `${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}${avatar.startsWith('/') ? '' : '/'}${avatar}`)
                                        : null;
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => handleForwardToChat(c)}
                                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold shrink-0 overflow-hidden">
                                                {avatarSrc && !forwardAvatarErrors[c.id] ? (
                                                    <img
                                                        src={avatarSrc}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                        onError={() => setForwardAvatarErrors(prev => ({ ...prev, [c.id]: true }))}
                                                    />
                                                ) : (
                                                    (displayName || '?')[0].toUpperCase()
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-medium truncate">{displayName}</p>
                                                <p className="text-[11px] text-white/40 truncate">{c.message || ''}</p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isUploadingMedia && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-4 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span className="text-white text-sm font-medium">{t('loading')}</span>
                </div>
            )}

            {viewerMedia && (
                <MediaViewerOverlay
                    url={viewerMedia.url}
                    type={viewerMedia.type}
                    onClose={() => setViewerMedia(null)}
                />
            )}
        </div>
    );
}

