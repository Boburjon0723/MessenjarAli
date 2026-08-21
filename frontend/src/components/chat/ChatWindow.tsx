import React, { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo, useSyncExternalStore } from 'react';
import SendCoinModal from './SendCoinModal';
import MediaUploadModal from './MediaUploadModal';
import MediaViewerOverlay from './MediaViewerOverlay';
import { useSocket } from '@/context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch } from '@/lib/api';
import { TranslationKeys } from '@/lib/translations';
import { getUser } from '@/lib/auth-storage';
import { getExpertPanelMode, isMentorPanelMode } from '@/lib/expert-roles';
import { getExpertComplianceNotice } from '@/lib/expert-compliance-copy';
import {
    isExpertListingChat,
    isApplicationRejected,
    isListingExpertSide,
    isListingMarketplacePrivateChat,
} from '@/lib/listing-chat';
import { isListingChat, isMessagingUnlocked } from '@/lib/chat-consent';
import ListingDealBar from './ListingDealBar';
import { MentorGroupInviteBar } from './MentorGroupInviteBar';
import ChatForwardModal from './ChatForwardModal';
import ChatWindowHeader from './ChatWindowHeader';
import PinnedMessageBar from './PinnedMessageBar';
import ChatComposer from './ChatComposer';
import type { Sticker } from '@/lib/sticker-packs';
import ChatCallOverlay from './ChatCallOverlay';
import ChatMessageList from './ChatMessageList';
import ChatWindowBanners from './ChatWindowBanners';
import { songPlayer } from '@/lib/song-player-store';
import { getChatDraft, setChatDraft, clearChatDraft, getChatDraftReply, setChatDraftReply } from '@/lib/chat-draft-store';
import { setChatTyping } from '@/lib/chat-typing-store';
import { toggleChatMuted, syncChatPrefToServer } from '@/lib/chat-list-prefs';
import { useChatListPrefs } from '@/hooks/useChatListPrefs';
import { summarizeChat } from '@/lib/summarize';
import { maliDB, OfflineMessage } from '@/lib/indexeddb';
import {
    readChatMessageCache,
    writeChatMessageCache,
    mapApiMessagesToLocal,
    sortChatMessagesLocal,
    mergeFetchedChatMessages,
    normalizeChatMessage,
    mergeIncomingSocketMessage,
    socketMessageTargetsChat,
    createOptimisticChatMessage,
    normalizeMessageType,
    getMessageCopyText,
} from '@/lib/chat-message-cache';
import { getPrivateChatPeerUserId, isPrivatePeerUnavailable } from '@/lib/private-chat-peer';
import { encryptTextForPeer } from '@/lib/e2e-crypto';
import { decryptChatMessage, decryptChatMessages } from '@/lib/e2e-chat';
import { E2E_SEND_ENABLED, isE2eEnvelope } from '@/lib/e2e-envelope';
import { chatDebug } from '@/lib/chat-debug';
import type { ChatMessage } from '@/types/chat-message';
import { logChatEmitSend, inferMessageTypeFromFile, parseMessageDate } from './chatWindowHelpers';
import { mimeFromFilename } from '@/lib/telegram-message-kind';
import { playMessageNotificationSound } from '@/lib/message-alert';
import type {
    ChatRoom,
    ContactListItem,
    ServiceSessionPayload,
    CallSignalPayload,
    TypingPayload,
    TradeDetails,
} from '@/types/chat-room';

const INITIAL_MESSAGES: ChatMessage[] = [];

/** Pastga avtomatik scroll: foydalanuvchi shu px dan yaqinroqda boвЂlsa */
const CHAT_NEAR_BOTTOM_PX = 72;
import { CHAT_CALLS_ALLOWED, canShowVideoCall } from '@/lib/chat-calls';

interface ChatWindowProps {
    chat?: ChatRoom;
    chats?: ChatRoom[];
    onToggleInfo?: () => void;
    onBack?: () => void;
    onMarkAsRead?: (chatId: string) => void;
    onChatMetadataUpdate?: (metadata: Record<string, unknown>) => void;
    /** ChatCarouselPanel: karusel siljishi bilan ildiz fade ustma-ust tushmasin */
    suppressRootFade?: boolean;
    /** Ikkita ChatWindow bir vaqtda (exit + active) boвЂlsa, faqat bittasiga socket obuna */
    subscribeSocket?: boolean;
    chatBgImage?: string;
    chatBgImageBlur?: number;
}

export default function ChatWindow({
    chat,
    chats = [],
    onToggleInfo,
    onBack,
    onMarkAsRead,
    onChatMetadataUpdate,
    suppressRootFade = false,
    subscribeSocket = true,
    chatBgImage,
    chatBgImageBlur,
}: ChatWindowProps) {
    const { t, tLines, language } = useLanguage();
    const { socket, isConnected } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const { prefOf } = useChatListPrefs();
    const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
    const [inputValue, setInputValue] = useState("");
    const editingMessageRef = useRef<ChatMessage | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [debugError, setDebugError] = useState<string | null>(null);
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const [showSendCoinModal, setShowSendCoinModal] = useState(false);
    const [activeSession, setActiveSession] = useState<ServiceSessionPayload | null>(null);
    const [tradeData, setTradeData] = useState<TradeDetails | null>(null);
    const [isContact, setIsContact] = useState<boolean>(false);
    const [isAddingContact, setIsAddingContact] = useState(false);
    const [isComplianceDismissed, setIsComplianceDismissed] = useState(false);
    const [blockStatus, setBlockStatus] = useState<{ isBlocked: boolean, blockedByMe: boolean }>({ isBlocked: false, blockedByMe: false });

    const chatRef = useRef(chat);
    chatRef.current = chat;

    // Media & Advanced Feature States
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingCancelledRef = useRef(false);
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
    const [peerLastSeen, setPeerLastSeen] = useState<string | number | Date | null>(null);
    const [callTimer, setCallTimer] = useState(0);
    const callIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const callTimerRef = useRef(0);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [callType, setCallType] = useState<'audio' | 'video'>('audio');
    const [inputFocused, setInputFocused] = useState(false);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
    const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);
    const [forwardAvatarErrors, setForwardAvatarErrors] = useState<Record<string, boolean>>({});

    // WebRTC Real-time Video
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const callRingRef = useRef<HTMLAudioElement | null>(null);
    const callRingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const outgoingRingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const stopIncomingToneRef = useRef<(() => void) | null>(null);
    const stopOutgoingToneRef = useRef<(() => void) | null>(null);
    const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
    const [uploadProgresses, setUploadProgresses] = useState<Record<string, number>>({});
    const [isDragging, setIsDragging] = useState(false);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [pendingCaption, setPendingCaption] = useState('');
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

    const handleCopySelected = async () => {
        const selected = selectedMessageIds
            .map(id => messages.find(m => m.id === id))
            .filter((m): m is NonNullable<typeof m> => Boolean(m));
        const texts = selected.map(m => getMessageCopyText(m)).filter(Boolean);
        if (texts.length) {
            try {
                await navigator.clipboard.writeText(texts.join('\n'));
                showSuccess(t('msg_copied'));
            } catch {
                showError('Copy failed');
            }
            return;
        }
        if (selected.length === 1 && normalizeMessageType(selected[0].type) === 'image') {
            const raw = selected[0].text || '';
            const url = /^https?:\/\//i.test(raw)
                ? raw
                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${raw.startsWith('/') ? '' : '/'}${raw}`;
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                const clipType = blob.type.startsWith('image/') ? blob.type : 'image/png';
                await navigator.clipboard.write([new ClipboardItem({ [clipType]: blob })]);
                showSuccess(t('msg_copied'));
            } catch {
                showError('Copy failed');
            }
            return;
        }
    };

    const handleForwardSelected = () => {
        const first = messages.find(m => selectedMessageIds.includes(m.id));
        if (!first) return;
        setForwardMessage(first);
        setIsSelecting(false);
        setSelectedMessageIds([]);
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
                                const offlinePayload = {
                                    roomId: msg.chatId,
                                    content: msg.text,
                                    type: 'text' as const,
                                    clientSideId: msg.id,
                                    parentId: msg.parentId
                                };
                                logChatEmitSend(offlinePayload);
                                socket.emit('send_message', offlinePayload);
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

    const handleEditMessage = (msg: ChatMessage) => {
        if (msg.type === 'text' && msg.sender === 'me') {
            setInputValue(msg.text || '');
            setReplyTo(null);
            setEditingMessage(msg);
        }
    };

    const setComposerValue = useCallback(
        (v: string) => {
            setInputValue(v);
            if (chat?.id && !editingMessageRef.current) {
                setChatDraft(String(chat.id), v);
            }
        },
        [chat?.id]
    );

    const cancelEditing = useCallback(() => {
        setEditingMessage(null);
        setInputValue(chat?.id ? getChatDraft(String(chat.id)) : '');
    }, [chat?.id]);

    const handlePinMessage = async (msg: ChatMessage) => {
        if (!chat?.id) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id}/pin`, {
                method: 'POST',
                body: JSON.stringify({ messageId: msg.id }),
            });
            if (res.ok) {
                showSuccess(t('pin_msg') || 'Xabar qadaldi');
            } else {
                showError('Pin qilishda xatolik');
            }
        } catch {
            showError('Pin qilishda xatolik');
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
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${content.startsWith('/') ? '' : '/'}${content}`
            : content;
        const forwardPayload = {
            roomId: targetChat.id,
            content: type === 'text' ? content : url,
            type,
            metadata: forwardMessage.metadata,
        };
        logChatEmitSend(forwardPayload);
        socket.emit('send_message', forwardPayload);
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
        if (!chat || chat.type !== 'private' || chat.isTrade || chat.is_saved_messages) {
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
    }, [chat?.id, chat?.type, chat?.isTrade, chat?.is_saved_messages, chat?.userId, chat?.participantId, chat?.participants, chat?.otherUser?.id, chat?.otherUser?.user_id]);

    const handleAddContact = async () => {
        if (!chat) return;
        if (isPrivatePeerUnavailable(chat)) {
            showError(t('peer_account_deleted'));
            return;
        }
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
        const onContactsUpdated = () => {
            void checkIfContact();
        };
        window.addEventListener('contacts_updated', onContactsUpdated);
        return () => window.removeEventListener('contacts_updated', onContactsUpdated);
    }, [checkIfContact]);

    useEffect(() => {
        setHeaderImageError(false);
    }, [chat?.id]);

    // Fetch pinned message on chat open + listen for pin changes
    useEffect(() => {
        if (!chat?.id) { setPinnedMessage(null); return; }
        let cancelled = false;
        apiFetch(`/api/chats/${chat.id}`).then(async (r) => {
            if (cancelled || !r.ok) return;
            const data = await r.json();
            if (data.pinnedMessage && !cancelled) setPinnedMessage(data.pinnedMessage);
            else if (!cancelled) setPinnedMessage(null);
        }).catch(() => {});

        const handler = (ev: { chatId: string; messageId: string | null }) => {
            if (String(ev.chatId) !== String(chat.id)) return;
            if (!ev.messageId) { setPinnedMessage(null); return; }
            apiFetch(`/api/chats/${chat.id}`).then(async (r) => {
                if (!r.ok) return;
                const data = await r.json();
                if (data.pinnedMessage) setPinnedMessage(data.pinnedMessage);
                else setPinnedMessage(null);
            }).catch(() => {});
        };
        socket?.on('message_pinned', handler);
        return () => { cancelled = true; socket?.off('message_pinned', handler); };
    }, [chat?.id, socket]);

    const stopCallRing = useCallback(() => {
        if (callRingIntervalRef.current) {
            clearInterval(callRingIntervalRef.current);
            callRingIntervalRef.current = null;
        }
        if (callRingRef.current) {
            callRingRef.current.pause();
            callRingRef.current.currentTime = 0;
        }
        stopIncomingToneRef.current?.();
        stopIncomingToneRef.current = null;
        stopOutgoingToneRef.current?.();
        stopOutgoingToneRef.current = null;
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
                    if (
                        session.status === 'initiated' ||
                        session.status === 'ongoing'
                    ) {
                        setMessages((prev) =>
                            prev.map((msg) => {
                                const md = msg.metadata as Record<string, unknown> | undefined;
                                if (md?.kind === 'payment_request') {
                                    return {
                                        ...msg,
                                        metadata: { ...md, kind: 'panel_open' },
                                    };
                                }
                                return msg;
                            })
                        );
                    }
                }
            };

            socket.on('service_session_updated', handleSessionUpdate);

            // incoming_call is now handled globally in SocketContext + callStore

            // call_accepted is now handled globally in callStore

            // call_rejected and call_ended are now handled globally in callStore

            /* call_signal removed: LiveKit handles media
            socket.on('call_signal', async (data: CallSignalPayload) => {
                if (!CHAT_CALLS_ALLOWED) return;
                if (!pcRef.current || !data?.signal || typeof data.signal !== 'object') return;
                const sig = data.signal as Record<string, unknown> & {
                    candidate?: unknown;
                    type?: string;
                };

                try {
                    if (sig.candidate !== undefined) {
                        // ICE candidate — avval tekshirish (offer/answer dan keyin qoвЂshiladi)
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
            }); */

            return () => {
                socket.off('service_session_updated', handleSessionUpdate);
            };
        }
    }, [chat?.id, chat?.userId, socket, isConnected, stopCallRing]);

    const startCallTimer = () => {
        setCallTimer(0);
        callTimerRef.current = 0;
        if (callIntervalRef.current) clearInterval(callIntervalRef.current);
        callIntervalRef.current = setInterval(() => {
            setCallTimer(prev => {
                const next = prev + 1;
                callTimerRef.current = next;
                return next;
            });
        }, 1000);
    };

    useEffect(() => {
        const stopOutgoingRing = () => {
            if (outgoingRingIntervalRef.current) {
                clearInterval(outgoingRingIntervalRef.current);
                outgoingRingIntervalRef.current = null;
            }
            if (callRingRef.current) {
                callRingRef.current.pause();
                callRingRef.current.currentTime = 0;
            }
        };
        if (!CHAT_CALLS_ALLOWED || !isCalling || isIncomingCall || callTimerRef.current > 0) {
            stopOutgoingRing();
            stopOutgoingToneRef.current?.();
            stopOutgoingToneRef.current = null;
            return;
        }
        import('@/lib/call-tones').then(({ playOutgoingTone }) => {
            stopOutgoingToneRef.current?.();
            stopOutgoingToneRef.current = playOutgoingTone();
        }).catch(() => {});
        return () => {
            stopOutgoingRing();
            stopOutgoingToneRef.current?.();
            stopOutgoingToneRef.current = null;
        };
    }, [isCalling, isIncomingCall, callTimer]);


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
        if (!CHAT_CALLS_ALLOWED) {
            showError("Chat call o'chirilgan. Faqat xizmat panelidan foydalaning.");
            return;
        }
        if (!socket || !chat) return;
        const targetUserId = String(
            getPrivateChatPeerUserId(chat) || chat.otherUser?.id || chat.userId || ''
        );
        if (!targetUserId) {
            showError(t('user_not_found'));
            return;
        }
        const myName = (getUser() || {}).name || "User";
        const finalType: 'audio' | 'video' = typeOverride || callType;

        const { startOutgoingCall } = await import('@/lib/callStore');
        startOutgoingCall(targetUserId, chat.otherUser?.name || 'User', String(chat.id), finalType);

        socket.emit('call_user', {
            targetUserId,
            chatId: chat.id,
            fromName: myName,
            signal: { type: 'livekit' },
            callType: finalType,
        });
    };
    const handleCallRef = useRef(handleCall);
    handleCallRef.current = handleCall;

    const handleAcceptCall = async () => {
        if (!CHAT_CALLS_ALLOWED) {
            if (socket && callData?.from) socket.emit('reject_call', { to: String(callData.from) });
            setIsIncomingCall(false);
            setCallData(null);
            return;
        }
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

        const finalType: 'audio' | 'video' = callType;
        setCallType(finalType);

        socket.emit('accept_call', {
            to: remotePeerId,
            chatId: chat?.id,
            signal: { type: 'livekit' },
        });
    };

    const handleRejectCall = () => {
        stopCallRing();
        if (!socket || !callData) return;
        const to =
            callData.from != null && String(callData.from) !== ''
                ? String(callData.from)
                : String(chat?.otherUser?.id ?? chat?.userId ?? chat?.id ?? '');
        if (to) {
            socket.emit('reject_call', { to, chatId: chat?.id });
        }
        setIsIncomingCall(false);
        setCallData(null);
    };

    const handleEndCall = () => {
        stopCallRing();
        if (!socket) return;
        const targetId = callData?.from || chat?.otherUser?.id || chat?.userId || chat?.id;
        socket.emit('end_call', {
            to: String(targetId),
            chatId: chat?.id,
            durationSeconds: callTimerRef.current,
        });
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

    const messagesScrollRef = useRef<HTMLDivElement>(null);
    /** State — UI; ref — messages effect dependency boвЂlmasin (aks holda tepaga scroll qilinsa effect qayta ishlab !hasAppended bilan pastga tortadi) */
    const [isNearBottom, setIsNearBottom] = useState(true);
    const isNearBottomRef = useRef(true);
    const forceScrollBottomRef = useRef(false);
    const [newMessagesWhileUp, setNewMessagesWhileUp] = useState(0);
    const prevMessagesLengthRef = useRef(0);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
        const el = messagesScrollRef.current;
        if (!el) {
            messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
            return;
        }
        const target = Math.max(0, el.scrollHeight - el.clientHeight);
        if (behavior === 'smooth') {
            el.scrollTo({ top: target, behavior: 'smooth' });
            return;
        }
        if (Math.abs(el.scrollTop - target) <= 1) return;
        el.scrollTop = target;
    }, []);

    const stickToBottomIfNeeded = useCallback(() => {
        if (!isNearBottomRef.current && !forceScrollBottomRef.current) return;
        scrollToBottom('auto');
    }, [scrollToBottom]);

    const markScrollToBottomOnSend = useCallback(() => {
        forceScrollBottomRef.current = true;
        isNearBottomRef.current = true;
        setNewMessagesWhileUp(0);
    }, []);

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

    useLayoutEffect(() => {
        const prevLen = prevMessagesLengthRef.current;
        const hasAppended = messages.length > prevLen;
        const force = forceScrollBottomRef.current;
        const near = isNearBottomRef.current;

        if (force) {
            forceScrollBottomRef.current = false;
            scrollToBottom('auto');
            isNearBottomRef.current = true;
            setIsNearBottom(true);
            setNewMessagesWhileUp(0);
        } else if (hasAppended && near) {
            scrollToBottom('auto');
            setNewMessagesWhileUp(0);
        } else if (hasAppended && !near) {
            setNewMessagesWhileUp((c) => c + (messages.length - prevLen));
        }

        prevMessagesLengthRef.current = messages.length;
    }, [messages, scrollToBottom]);

    /** Rasm / textarea balandligi o‘zgarganda pastda qolish — Telegram preservePaddingScroll ga o‘xshash */
    useEffect(() => {
        const el = messagesScrollRef.current;
        const inner = el?.querySelector('.tg-chat-bubbles-inner');
        if (!el || !inner) return;

        const ro = new ResizeObserver(() => {
            stickToBottomIfNeeded();
        });
        ro.observe(inner);
        return () => ro.disconnect();
    }, [chat?.id, stickToBottomIfNeeded]);

    useEffect(() => {
        if (chat?.id && messages.length) {
            writeChatMessageCache(chat.id, messages);
        }
    }, [messages, chat?.id]);

    /** Strict Mode / ketma-ket renderda bir xil snapshot uchun takroriy CHAT_DEBUG oldini olish */
    const lastDebugLast10KeyRef = useRef<string>('');
    useEffect(() => {
        if (!messages.length) return;
        const items = messages.slice(-10).map((m) => ({
            id: m.id,
            clientSideId: m.clientSideId,
            created_at: m.created_at,
            sender: m.sender,
            text: (m.text || '').length > 40 ? `${(m.text || '').slice(0, 40)}вЂ¦` : (m.text || ''),
        }));
        const key = JSON.stringify(items);
        if (key === lastDebugLast10KeyRef.current) return;
        lastDebugLast10KeyRef.current = key;
        chatDebug('state last10 (after sort)', { items });
    }, [messages]);

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
        editingMessageRef.current = editingMessage;
    }, [editingMessage]);

    useLayoutEffect(() => {
        if (!chat?.id) return;
        setEditingMessage(null);
        setInputValue(getChatDraft(String(chat.id)));
        const savedReply = getChatDraftReply(String(chat.id));
        if (savedReply?.id) {
            setReplyTo({
                id: savedReply.id,
                text: savedReply.text || '',
                sender: (savedReply.sender as ChatMessage['sender']) || 'them',
                senderName: savedReply.senderName,
                type: (savedReply.type as ChatMessage['type']) || 'text',
            } as ChatMessage);
        } else {
            setReplyTo(null);
        }
        setShowSearch(false);
        setSearchQuery('');
        setIsSomeoneTyping(false);
        if (chatInputRef.current) {
            chatInputRef.current.style.height = 'auto';
        }
        setPeerLastSeen(
            (chat as any).lastSeen ??
                chat.otherUser?.last_seen ??
                chat.otherUser?.lastSeen ??
                null
        );
    }, [chat?.id]);

    useEffect(() => {
        if (!chat?.id || editingMessage) return;
        if (!replyTo?.id) {
            setChatDraftReply(chat.id, null);
            return;
        }
        setChatDraftReply(chat.id, {
            id: String(replyTo.id),
            text: replyTo.text,
            sender: typeof replyTo.sender === 'string' ? replyTo.sender : undefined,
            senderName: replyTo.senderName,
            type: replyTo.type,
        });
    }, [replyTo, chat?.id, editingMessage]);

    useEffect(() => {
        if (!showSearch || !chat?.id) return;
        const q = searchQuery.trim();
        if (q.length < 2) return;
        let cancelled = false;
        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const res = await apiFetch(
                        `/api/chats/${chat.id}/search?q=${encodeURIComponent(q)}`
                    );
                    if (!res.ok || cancelled) return;
                    const found = await res.json();
                    if (!Array.isArray(found) || cancelled) return;
                    const mapped = mapApiMessagesToLocal(found);
                    if (!mapped.length) return;
                    setMessages((prev) => mergeFetchedChatMessages(prev, mapped));
                } catch {
                    /* ignore */
                }
            })();
        }, 280);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [showSearch, searchQuery, chat?.id]);

    useEffect(() => {
        if (!socket || !chat) return;
        const peerId = chat.participantId ?? chat.otherUser?.id;
        const syncOnline = () => {
            const fromChat =
                chat.status === 'online' ||
                chat.online === true ||
                chat.otherUser?.online === true ||
                chat.otherUser?.status === 'online';
            setIsOnline(!!fromChat);
        };
        syncOnline();
        const handleStatus = (data: {
            userId?: string | number;
            status?: string;
            lastSeen?: string | number | Date;
        }) => {
            if (peerId == null || data?.userId == null) return;
            if (String(data.userId) !== String(peerId)) return;
            setIsOnline(data.status === 'online');
            if (data.lastSeen != null) {
                setPeerLastSeen(data.lastSeen);
            } else if (data.status === 'offline') {
                setPeerLastSeen(Date.now());
            }
        };
        socket.on('user_status_change', handleStatus);
        return () => {
            socket.off('user_status_change', handleStatus);
        };
    }, [socket, chat?.id, chat?.participantId, chat?.status, chat?.online, chat?.otherUser?.online, chat?.otherUser?.status, chat?.otherUser?.id]);

    useEffect(() => {
        if (!socket || !chat) return;
        const meId = (getUser() || {}).id;
        const handleTyping = (data: TypingPayload) => {
            if (String(data.roomId) === String(chat.id) && String(data.senderId) !== String(meId)) {
                setIsSomeoneTyping(true);
                setChatTyping(data.roomId, true);
            }
        };
        const handleStopTyping = (data: TypingPayload) => {
            if (String(data.roomId) === String(chat.id)) {
                setIsSomeoneTyping(false);
                setChatTyping(data.roomId, false);
            }
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

    const handleReceiveMessage = useCallback(
        (message: Record<string, unknown>) => {
            const cid = chatRef.current?.id;
            if (!cid) return;
            if (!socketMessageTargetsChat(message, String(cid))) return;
            void (async () => {
                let incoming = message;
                if (isE2eEnvelope(message.metadata)) {
                    const normalized = normalizeChatMessage({
                        ...message,
                        text: message.content ?? message.text ?? '',
                    });
                    const decrypted = await decryptChatMessage(normalized);
                    incoming = { ...message, content: decrypted.text, text: decrypted.text };
                }
                chatDebug('receive_message raw', {
                    incomingId: incoming.id,
                    incomingClientSideId: incoming.clientSideId,
                    incomingCreatedAt: incoming.created_at ?? incoming.createdAt,
                    sender_id: incoming.sender_id ?? incoming.senderId,
                    textPreview: String(incoming.content ?? incoming.text ?? '').slice(0, 60),
                });
                const user = (getUser() || {}) as { id?: string };
                const senderId = incoming.sender_id ?? incoming.senderId;
                setMessages((prev) =>
                    mergeIncomingSocketMessage(prev, incoming, user.id != null ? String(user.id) : undefined)
                );
                if (String(senderId) !== String(user.id)) {
                    playMessageNotificationSound();
                    markAsRead();
                }
            })();
        },
        [markAsRead]
    );

    // Handle incoming messages_read from socket (Telegram: 2 checks)
    useEffect(() => {
        if (!socket || !chat?.id) return;
        const applyRead = (roomId: string, messageIds: string[], readBy: string) => {
            const myId = String((getUser() as { id?: string } | null)?.id ?? '');
            if (String(roomId) !== String(chat.id)) return;
            if (myId && String(readBy) === myId) return;
            const idSet = new Set((messageIds || []).map(String));
            if (idSet.size === 0) return;
            setMessages((prev) =>
                prev.map((m) => (idSet.has(String(m.id)) ? { ...m, is_read: true } : m))
            );
        };
        const handleMessagesRead = (data: { roomId: string; messageIds: string[]; readBy: string }) => {
            applyRead(data.roomId, data.messageIds || [], data.readBy);
        };
        const handleMessagesReadWindow = (ev: Event) => {
            const detail = (ev as CustomEvent<{ roomId?: string; messageIds?: string[]; readBy?: string }>)
                .detail;
            if (!detail?.roomId) return;
            applyRead(detail.roomId, detail.messageIds || [], detail.readBy || '');
        };
        const handleMessageEdited = (data: {
            chatId?: string;
            roomId?: string;
            messageId?: string;
            content?: string;
        }) => {
            const cid = String(data.chatId || data.roomId || '');
            if (cid !== String(chat.id) || !data.messageId || data.content == null) return;
            setMessages((prev) =>
                prev.map((m) =>
                    String(m.id) === String(data.messageId)
                        ? { ...m, text: data.content!, content: data.content }
                        : m
                )
            );
        };
        const handleMessagesDeleted = (data: { chatId?: string; messageIds?: string[] }) => {
            if (String(data.chatId) !== String(chat.id)) return;
            const idSet = new Set((data.messageIds || []).map(String));
            if (!idSet.size) return;
            setMessages((prev) => prev.filter((m) => !idSet.has(String(m.id))));
        };
        socket.on('messages_read', handleMessagesRead);
        socket.on('message_edited', handleMessageEdited);
        socket.on('messages_deleted', handleMessagesDeleted);
        window.addEventListener('el_messages_read', handleMessagesReadWindow);
        return () => {
            socket.off('messages_read', handleMessagesRead);
            socket.off('message_edited', handleMessageEdited);
            socket.off('messages_deleted', handleMessagesDeleted);
            window.removeEventListener('el_messages_read', handleMessagesReadWindow);
        };
    }, [socket, chat?.id]);

    // Intersection Observer: ko‘rinadigan barcha peer xabarlarini batch o‘qildi qilish
    const readObserverRef = useRef<IntersectionObserver | null>(null);
    const pendingReadIdsRef = useRef<Set<string>>(new Set());
    const flushReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!socket || !chat?.id) return;
        const roomId = String(chat.id);
        readObserverRef.current = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const id = (entry.target as HTMLElement).dataset.msgId;
                    if (!id || id.startsWith('temp_')) continue;
                    pendingReadIdsRef.current.add(id);
                    readObserverRef.current?.unobserve(entry.target);
                }
                if (pendingReadIdsRef.current.size === 0) return;
                if (flushReadTimerRef.current) clearTimeout(flushReadTimerRef.current);
                flushReadTimerRef.current = setTimeout(() => {
                    const ids = [...pendingReadIdsRef.current];
                    pendingReadIdsRef.current.clear();
                    if (!ids.length || !socket) return;
                    socket.emit('mark_messages_read', { roomId, messageIds: ids });
                    // Local: bu mening kiruvchi xabarlarim — UI da is_read faqat senderga muhim
                    setMessages((prev) =>
                        prev.map((m) => (ids.includes(String(m.id)) ? { ...m, is_read: true } : m))
                    );
                }, 120);
            },
            { threshold: 0.35 }
        );
        return () => {
            if (flushReadTimerRef.current) clearTimeout(flushReadTimerRef.current);
            readObserverRef.current?.disconnect();
            readObserverRef.current = null;
            pendingReadIdsRef.current.clear();
        };
    }, [socket, chat?.id]);

    const observeMessage = useCallback((node: HTMLDivElement | null, msg: ChatMessage) => {
        const obs = readObserverRef.current;
        if (!node || !obs) return;
        if (msg.sender === 'me' || msg.is_read) return;
        const id = String(msg.id || '');
        if (!id || id.startsWith('temp_') || id.startsWith('voice_')) return;
        node.dataset.msgId = id;
        obs.observe(node);
    }, []);

    useEffect(() => {
        if (!socket || !chat?.id || subscribeSocket === false) return;

        const fetchHistory = async () => {
            const c = chatRef.current;
            if (!c?.id) return;
            try {
                const res = await apiFetch(`/api/chats/${c.id}/messages`);
                if (res.ok) {
                    const history = await res.json();
                    const mapped = mapApiMessagesToLocal(history);
                    const decrypted = await decryptChatMessages(mapped);
                    setMessages((prev) => {
                        const next = mergeFetchedChatMessages(prev, decrypted);
                        writeChatMessageCache(c.id!, next);
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
            const id = chatRef.current?.id;
            if (id) socket.emit('join_room', id);
        };
        joinCurrentRoom();

        socket.on('receive_message', handleReceiveMessage);
        socket.on('connect', joinCurrentRoom);

        const handleMessageMetadataUpdated = (data: {
            chatId?: string;
            updates?: { id: string; metadata: Record<string, unknown> }[];
        }) => {
            const c = chatRef.current;
            if (!c?.id || !data?.chatId || String(data.chatId) !== String(c.id) || !data.updates?.length) {
                return;
            }
            setMessages((prev) =>
                prev.map((msg) => {
                    const upd = data.updates!.find((u) => String(u.id) === String(msg.id));
                    if (!upd) return msg;
                    return { ...msg, metadata: { ...(msg.metadata as object), ...upd.metadata } };
                })
            );
        };
        socket.on('message_metadata_updated', handleMessageMetadataUpdated);

        const handleSocketError = (payload: { message?: string } | string) => {
            const msg = typeof payload === 'string' ? payload : payload?.message;
            if (msg) showError(msg);
        };
        socket.on('error', handleSocketError);

        const handleReconnect = () => {
            joinCurrentRoom();
            fetchHistory();
        };
        window.addEventListener('socket_reconnected', handleReconnect);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('connect', joinCurrentRoom);
            socket.off('message_metadata_updated', handleMessageMetadataUpdated);
            socket.off('error', handleSocketError);
            window.removeEventListener('socket_reconnected', handleReconnect);
        };
    }, [socket, chat?.id, subscribeSocket, markAsRead, showError, handleReceiveMessage]);

    /** Bir xil tickda ikki marta chaqirish (masalan, gвЂayriixtiyoriy re-entrancy) oldini olish */
    const sendMessageReentrantGuardRef = useRef(false);

    const sendMessageRef = useRef<(textOverride?: string) => void | Promise<void>>(() => {});
    const sendMessage = async (textOverride?: string) => {
        if (sendMessageReentrantGuardRef.current) return;
        const content = String(textOverride ?? inputValue ?? '').trim();
        if (!content || !chat) return;
        if (isListingChat(chat) && !isMessagingUnlocked(chat)) return;
        sendMessageReentrantGuardRef.current = true;
        try {
            if (editingMessage) {
                const editId = editingMessage.id;
                setInputValue("");
                setEditingMessage(null);
                if (chatInputRef.current) chatInputRef.current.style.height = 'auto';
                setMessages(prev => prev.map(m => m.id === editId ? { ...m, text: content } : m));
                if (isNetworkOnline && isConnected && socket) {
                    socket.emit('edit_message', { roomId: chat.id, messageId: editId, content });
                }
                // restore draft after edit (edit text was not persisted as draft)
                setInputValue(getChatDraft(String(chat.id)));
                sendMessageReentrantGuardRef.current = false;
                return;
            }
            const clientSideId = `temp_${Date.now()}`;
            const inputContent = content;
            const currentReplyTo = replyTo;

            setInputValue("");
            clearChatDraft(chat.id);
            setReplyTo(null);
            if (chatInputRef.current) {
                chatInputRef.current.style.height = 'auto';
            }
            if (socket) {
                try {
                    socket.emit('stop_typing', chat.id);
                } catch { /* ignore */ }
            }
            markScrollToBottomOnSend();

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
                const sendPayload: Record<string, unknown> = {
                    roomId: chat.id,
                    content: inputContent,
                    type: 'text' as const,
                    clientSideId,
                    parentId: currentReplyTo?.id
                };
                const meIdForE2e = meId;
                const peerId = getPrivateChatPeerUserId(chat);
                // E2E_SEND_ENABLED=false: ko‘p brauzerda «Shifrlangan xabar» noqulayligi yo‘q
                const allowE2e =
                    E2E_SEND_ENABLED &&
                    !!meIdForE2e &&
                    !!peerId &&
                    !isListingMarketplacePrivateChat(chat) &&
                    !isExpertListingChat(chat);
                if (allowE2e) {
                    try {
                        const enc = await encryptTextForPeer(String(meIdForE2e), String(peerId), inputContent);
                        if (enc) {
                            sendPayload.content = enc.content;
                            sendPayload.metadata = enc.metadata;
                        }
                    } catch (e) {
                        console.warn('[e2e] encrypt failed, sending plaintext', e);
                    }
                }
                logChatEmitSend(sendPayload);
                socket.emit('send_message', sendPayload);
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
        } finally {
            queueMicrotask(() => {
                sendMessageReentrantGuardRef.current = false;
            });
        }
    };
    sendMessageRef.current = sendMessage;

    const sendSticker = useCallback((sticker: Sticker) => {
        if (!chat || !socket) return;
        if (isListingChat(chat) && !isMessagingUnlocked(chat)) return;
        const clientSideId = `temp_${Date.now()}`;
        const meId = (getUser() as { id?: string } | null)?.id;
        const chatTimeLocale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
        const stickerMeta = {
            emoji: sticker.emoji,
            stickerCode: sticker.code,
            code: sticker.code,
            mimetype: 'image/webp',
            url: sticker.webp,
        };
        markScrollToBottomOnSend();
        setMessages(prev => {
            const optimistic = createOptimisticChatMessage({
                id: clientSideId,
                text: sticker.webp,
                senderId: meId,
                prevMessages: prev,
                type: 'sticker',
                isPending: !isNetworkOnline || !isConnected,
                locale: chatTimeLocale,
            });
            return sortChatMessagesLocal([
                ...prev,
                {
                    ...optimistic,
                    metadata: {
                        ...(optimistic.metadata && typeof optimistic.metadata === 'object'
                            ? (optimistic.metadata as Record<string, unknown>)
                            : {}),
                        ...stickerMeta,
                    },
                },
            ]);
        });
        if (isNetworkOnline && isConnected && socket) {
            socket.emit('send_message', {
                roomId: chat.id,
                content: sticker.webp,
                type: 'sticker',
                clientSideId,
                metadata: stickerMeta,
                parentId: replyTo?.id,
            });
            if (replyTo) setReplyTo(null);
        }
    }, [chat, socket, isNetworkOnline, isConnected, language, replyTo]);

    // O'ng panel (UserInfoPanel) dan xabar yuborishni qo'llab-quvvatlash
    useEffect(() => {
        const handler = (e: CustomEvent<{ text: string }>) => {
            if (chat && e.detail?.text?.trim()) void sendMessageRef.current(e.detail.text.trim());
        };
        window.addEventListener('panel_quick_send', handler as EventListener);
        return () => window.removeEventListener('panel_quick_send', handler as EventListener);
    }, [chat?.id]);

    // Profil: ovozli chaqiruv
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ chatId?: string; callType?: 'audio' | 'video' }>).detail;
            if (!chat?.id || !detail?.chatId) return;
            if (String(detail.chatId) !== String(chat.id)) return;
            void handleCallRef.current(detail.callType === 'video' ? 'video' : 'audio');
        };
        window.addEventListener('panel_start_call', handler);
        return () => window.removeEventListener('panel_start_call', handler);
    }, [chat?.id]);

    // Profil shared media: xabarga sakrash
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ chatId?: string; messageId?: string }>).detail;
            if (!chat?.id || !detail?.messageId) return;
            if (detail.chatId && String(detail.chatId) !== String(chat.id)) return;
            const el = document.getElementById(`msg-${detail.messageId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-[#8774e1]/60');
                window.setTimeout(() => el.classList.remove('ring-2', 'ring-[#8774e1]/60'), 1600);
            }
        };
        window.addEventListener('panel_jump_message', handler);
        return () => window.removeEventListener('panel_jump_message', handler);
    }, [chat?.id]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isFolder = false) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        if (chat && isListingChat(chat) && !isMessagingUnlocked(chat)) return;
        setPendingCaption('');
        setPendingFiles(Array.from(files));
        if (e.target) e.target.value = '';
    };

    /** Telegram: Ctrl+V rasm/fayl → preview + caption (darhol yubormaydi) */
    const handlePasteFiles = useCallback(
        (files: File[]) => {
            if (!files.length || !chat) return;
            if (isListingChat(chat) && !isMessagingUnlocked(chat)) return;
            if (isPrivatePeerUnavailable(chat)) return;
            const draft = inputValue.trim();
            if (draft) {
                setPendingCaption(draft);
                setComposerValue('');
                if (chatInputRef.current) {
                    chatInputRef.current.style.height = 'auto';
                }
            }
            setPendingFiles((prev) => [...prev, ...files]);
        },
        [chat, inputValue, setComposerValue]
    );

    const handleConfirmUpload = async (files: File[], caption: string, compress: boolean) => {
        if (!chat) return;
        if (isListingChat(chat) && !isMessagingUnlocked(chat)) return;
        const currentReplyTo = replyTo; // Capture current reply state
        setPendingFiles([]);
        setPendingCaption('');
        setReplyTo(null); // Clear reply state after starting upload
        setIsUploadingMedia(true);
        const { uploadFileWithRetry } = await import('@/lib/upload');

        /** Bir tanlovda bir nechta fayl: temp id `i` indeksi sortda ketma-katlikni mustahkamlaydi */
        const uploadBatchMs = Date.now();

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const tempId = `temp_${uploadBatchMs}_${i}`;

            // Optimistic UI for each file
            const initialType = inferMessageTypeFromFile(file.name, file.type);

            const uid = (getUser() as { id?: string } | null)?.id;
            const chatTimeLocale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
            markScrollToBottomOnSend();
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
                const data = await uploadFileWithRetry('/api/media/upload', formData, (progress) => {
                    setUploadProgresses(prev => ({ ...prev, [tempId]: progress.percent }));
                });

                if (data.files && data.files.length > 0) {
                    const uploadedFile = data.files[0];
                    if (socket) {
                        const originalName = uploadedFile.originalname || uploadedFile.name || file.name;
                        const mimetype = mimeFromFilename(
                            originalName,
                            uploadedFile.mimetype || uploadedFile.type || file.type
                        );
                        const detectedType = inferMessageTypeFromFile(originalName, mimetype);
                        const mediaPayload = {
                            roomId: chat.id,
                            content: uploadedFile.url,
                            type: detectedType,
                            clientSideId: tempId,
                            caption: i === 0 ? caption : undefined,
                            metadata: {
                                name: originalName,
                                file_name: originalName,
                                size: uploadedFile.size || file.size,
                                mimetype
                            },
                            parentId: currentReplyTo?.id
                        };
                        logChatEmitSend(mediaPayload);
                        socket.emit('send_message', mediaPayload);
                    }
                    // Update state to remove progress and mark as uploaded
                    setUploadProgresses(prev => {
                        const next = { ...prev };
                        delete next[tempId];
                        return next;
                    });
                }
            } catch (err: any) {
                const msg = err?.status === 429
                    ? (err?.message || t('upload_error'))
                    : t('upload_error');
                showError(msg);
                setMessages(prev =>
                    prev.map((m) =>
                        m.id === tempId
                            ? normalizeChatMessage({ ...(m as unknown as Record<string, unknown>), error: msg })
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
        if (chat && isListingChat(chat) && !isMessagingUnlocked(chat)) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setPendingCaption(inputValue.trim());
            if (inputValue.trim()) {
                setComposerValue('');
                clearChatDraft(chat?.id);
            }
            setPendingFiles(Array.from(e.dataTransfer.files));
        }
    };

    const startRecording = async () => {
        const roomId = chat?.id;
        if (roomId == null) return;
        if (chat && isListingChat(chat) && !isMessagingUnlocked(chat)) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            recordingCancelledRef.current = false;

            mediaRecorder.ondataavailable = (e) => {
                if (recordingCancelledRef.current) return;
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop());
                if (recordingCancelledRef.current) {
                    audioChunksRef.current = [];
                    recordingCancelledRef.current = false;
                    return;
                }
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                if (audioBlob.size < 64) return;
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
                        const voicePayload = { roomId, content: fileUrl, type: 'voice' as const, clientSideId };
                        logChatEmitSend(voicePayload);
                        socket.emit('send_message', voicePayload);
                    }
                    const vUid = (getUser() as { id?: string } | null)?.id;
                    const chatTimeLocale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
                    markScrollToBottomOnSend();
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
            recordingCancelledRef.current = false;
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = useCallback(() => {
        recordingCancelledRef.current = true;
        audioChunksRef.current = [];
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecording(false);
        setRecordingTime(0);
        const rec = mediaRecorderRef.current;
        if (rec && rec.state !== 'inactive') {
            try {
                rec.ondataavailable = null;
                rec.stop();
            } catch {
                /* ignore */
            }
        }
        mediaRecorderRef.current = null;
    }, []);

    const filteredMessages = useMemo(() => {
        const filtered = messages.filter((m) => {
            // Text search
            if (searchQuery.trim()) {
                const text = (m.text || '').toLowerCase();
                if (!text.includes(searchQuery.toLowerCase())) return false;
            }

            // Type filter (legacy `img` в†’ `image` bilan bir xil)
            const nt = normalizeMessageType(m.type);
            if (searchType === 'text' && nt !== 'text') return false;
            if (searchType === 'media' && !['image', 'video', 'voice'].includes(nt)) return false;
            if (searchType === 'files' && nt !== 'file') return false;

            // Date filter — vaqt parse boвЂlmasa, san oraligвЂida xabarni yoвЂqotmaymiz
            const created = parseMessageDate(m);
            if (searchDateFrom) {
                if (!created) return true;
                const from = new Date(searchDateFrom);
                from.setHours(0, 0, 0, 0);
                if (created < from) return false;
            }
            if (searchDateTo) {
                if (!created) return true;
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
    }, [scrollToBottom]);

    useEffect(() => {
        if (typeof window !== 'undefined') window.currentSearchQuery = searchQuery;
    }, [searchQuery]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (forwardMessage) { setForwardMessage(null); return; }
            if (showMoreMenu) { setShowMoreMenu(false); return; }
            if (editingMessage) { cancelEditing(); return; }
            if (isSelecting) { setIsSelecting(false); setSelectedMessageIds([]); return; }
            if (showSearch) { setShowSearch(false); setSearchQuery(''); return; }
            if (replyTo) { setReplyTo(null); return; }
            onBack?.();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [forwardMessage, showMoreMenu, editingMessage, isSelecting, showSearch, replyTo, onBack, cancelEditing]);

    const songTrack = useSyncExternalStore(songPlayer.subscribe, songPlayer.getSnapshot, songPlayer.getSnapshot).track;

    if (!chat) return <div className="flex-1 flex items-center justify-center text-white/40">{t('select_chat')}</div>;

    const currentUser = getUser() || {};
    const myUserId = currentUser?.id != null ? String(currentUser.id) : null;
    const continuationOpts = {
        peerUserId: getPrivateChatPeerUserId(chat),
        myUserId,
    };
    const onListingExpertSide = isListingExpertSide(chat, myUserId);
    const chatCompliance =
        chat?.type === 'private' && isExpertListingChat(chat) && chat?.otherUser
            ? getExpertComplianceNotice(
                  getExpertPanelMode(
                      (onListingExpertSide
                          ? currentUser
                          : chat.otherUser) as Parameters<typeof getExpertPanelMode>[0]
                  ),
                  onListingExpertSide ? 'expert' : 'client',
                  t,
                  tLines
              )
            : null;
    const isChannelCreator = chat?.type === 'channel' && String(chat?.creator_id ?? chat?.creatorId ?? '') === String(myUserId ?? '');
    const isTrade = chat?.isTrade;
    const isBuyer = tradeData?.buyer_id != null && myUserId != null && String(tradeData.buyer_id) === myUserId;
    const isSeller = tradeData?.seller_id != null && myUserId != null && String(tradeData.seller_id) === myUserId;
    const roleLabel = isTrade ? (isBuyer ? t('buyer') : isSeller ? t('seller') : t('trade_participant')) : null;
    const displayName = isTrade ? roleLabel : chat.name;

    const isOnlineHeader =
        chat.status === 'online' ||
        chat.online === true ||
        isOnline ||
        chat.otherUser?.online === true ||
        chat.otherUser?.status === 'online';

    const lastSeenLabel = (() => {
        if (isOnlineHeader || chat.type !== 'private') return undefined;
        const raw =
            peerLastSeen ??
            (chat as any).lastSeen ??
            chat.otherUser?.last_seen ??
            chat.otherUser?.lastSeen ??
            null;
        if (raw == null) return undefined;
        const ms = typeof raw === 'number' ? raw : new Date(raw).getTime();
        if (!Number.isFinite(ms)) return undefined;
        const diff = Date.now() - ms;
        if (diff < 60_000) return t('last_seen_recent') as string;
        const d = new Date(ms);
        const time = d.toLocaleTimeString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const today = new Date();
        const sameDay =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();
        if (sameDay) {
            return language === 'uz'
                ? `oxirgi marta ${time}`
                : language === 'ru'
                  ? `был(а) в ${time}`
                  : `last seen at ${time}`;
        }
        const date = d.toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'uz' ? 'uz-UZ' : 'en-US', {
            day: 'numeric',
            month: 'short',
        });
        return language === 'uz'
            ? `oxirgi marta ${date}`
            : language === 'ru'
              ? `был(а) ${date}`
              : `last seen ${date}`;
    })();

    const chatMuted = !!prefOf(chat.id).muted;
    const handleHeaderMute = () => {
        if (!chat?.id) return;
        const muted = toggleChatMuted(chat.id);
        void syncChatPrefToServer(chat.id, { muted });
        showSuccess(muted ? t('mute_chat') : t('unmute_chat'));
    };
    const composerLocked = Boolean(
        (chat && isListingChat(chat) && !isMessagingUnlocked(chat)) ||
            (chat && isPrivatePeerUnavailable(chat))
    );
    const composerLockedHint = chat && isPrivatePeerUnavailable(chat)
        ? (t('peer_account_deleted') as string)
        : chat && isApplicationRejected(chat)
        ? (t('application_rejected_banner') as string)
        : (t('consent_waiting_message') as string);
    const groupCreatorId = chat?.creator_id ?? chat?.creatorId ?? null;
    const isMentorMode = isMentorPanelMode(
        getExpertPanelMode(currentUser as Parameters<typeof getExpertPanelMode>[0])
    );
    const showMentorGroupInvite =
        chat?.type === 'private' && !!currentUser?.is_expert && isMentorMode;
    const mentorDisplayName =
        [currentUser?.name, currentUser?.surname].filter(Boolean).join(' ').trim() ||
        String(currentUser?.name || 'Ustoz');
    // Mentor: to'lov = guruh taklifi + oylik obuna. Escrow (Job Payment) faqat
    // maslahat/yurist/psixolog e'lon chatlarida.
    const showListingDealBar =
        chat?.type === 'private' &&
        isExpertListingChat(chat) &&
        isListingExpertSide(chat, myUserId) &&
        !isMentorMode;

    return (
        <div
            className={`flex-1 flex flex-col min-h-0 h-full overflow-hidden relative ${suppressRootFade ? '' : 'animate-fade-in'}`}
        >
            {chatBgImage && (
                <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                    <div
                        className="absolute -inset-10 bg-cover bg-center"
                        style={{
                            backgroundImage: `url(${chatBgImage})`,
                            filter: chatBgImageBlur ? `blur(${chatBgImageBlur}px)` : undefined,
                            transform: 'scale(1.06)',
                        }}
                    />
                </div>
            )}

            {/* Header — Telegram Web: floating plate; pleyer main ustunda bo‘lsa pt kamayadi */}
            <div
                className={`relative z-20 shrink-0 px-2 lg:px-4 ${
                    songTrack
                        ? 'pt-1 lg:pt-1'
                        : 'pt-[max(1rem,env(safe-area-inset-top))] lg:pt-4'
                }`}
            >
                <div className="tg-chat-column">
                    <ChatWindowHeader
                chat={chat}
                displayName={displayName || ''}
                isTrade={!!isTrade}
                isOnlineHeader={!!isOnlineHeader}
                isSomeoneTyping={isSomeoneTyping}
                lastSeenLabel={lastSeenLabel}
                chatMuted={chatMuted}
                inputFocused={inputFocused}
                debugError={debugError}
                isSelecting={isSelecting}
                selectedCount={selectedMessageIds.length}
                headerImageError={headerImageError}
                onHeaderImageError={() => setHeaderImageError(true)}
                showSearch={showSearch}
                searchQuery={searchQuery}
                searchType={searchType}
                searchDateFrom={searchDateFrom}
                searchDateTo={searchDateTo}
                showMoreMenu={showMoreMenu}
                isSummarizing={isSummarizing}
                onBack={onBack}
                onToggleInfo={onToggleInfo}
                onCancelSelecting={() => { setIsSelecting(false); setSelectedMessageIds([]); }}
                onDeleteSelected={handleDeleteSelected}
                onCopySelected={handleCopySelected}
                onForwardSelected={handleForwardSelected}
                onSearchQueryChange={setSearchQuery}
                onSearchTypeChange={setSearchType}
                onSearchDateFromChange={setSearchDateFrom}
                onSearchDateToChange={setSearchDateTo}
                onToggleSearch={() => {
                    setShowSearch((v) => {
                        if (v) setSearchQuery('');
                        return !v;
                    });
                }}
                onStartAudioCall={() => void handleCall('audio')}
                onStartVideoCall={() => void handleCall('video')}
                onToggleMoreMenu={() => setShowMoreMenu(!showMoreMenu)}
                onCloseMoreMenu={() => setShowMoreMenu(false)}
                onStartSelecting={() => { setIsSelecting(true); setShowMoreMenu(false); }}
                onSummarize={() => { handleSummarizeChat(); setShowMoreMenu(false); }}
                onExportHistory={() => { handleExportHistory(); setShowMoreMenu(false); }}
                onClearHistory={() => { handleClearHistory(); setShowMoreMenu(false); }}
                onDeleteChat={() => { handleDeleteChat(); setShowMoreMenu(false); }}
                onToggleMute={handleHeaderMute}
            />
                </div>
            </div>

            {pinnedMessage && (
                <div className="relative z-20 shrink-0 px-2 lg:px-4">
                    <div className="tg-chat-column">
                        <PinnedMessageBar
                            message={pinnedMessage}
                            onClickMessage={() => {
                                const el = document.getElementById(`msg-${pinnedMessage.id}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    el.classList.add('bg-[#8774e1]/10');
                                    setTimeout(() => el.classList.remove('bg-[#8774e1]/10'), 2000);
                                }
                            }}
                            onUnpin={async () => {
                                if (!chat?.id) return;
                                await apiFetch(`/api/chats/${chat.id}/pin`, {
                                    method: 'POST',
                                    body: JSON.stringify({ messageId: null }),
                                });
                                setPinnedMessage(null);
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="relative z-20 shrink-0 px-2 lg:px-4">
                <div className="tg-chat-column">
                    <ChatWindowBanners
                        t={t}
                        chat={chat}
                        currentUserId={currentUser?.id != null ? String(currentUser.id) : undefined}
                        onChatMetadataUpdate={onChatMetadataUpdate}
                        chatSummary={chatSummary}
                        setChatSummary={setChatSummary}
                        summaryError={summaryError}
                        setSummaryError={setSummaryError}
                        chatCompliance={chatCompliance}
                        isTrade={!!isTrade}
                        isComplianceDismissed={isComplianceDismissed}
                        setIsComplianceDismissed={setIsComplianceDismissed}
                        isContact={!!isContact}
                        handleAddContact={handleAddContact}
                        isAddingContact={isAddingContact}
                        handleBlockUser={handleBlockUser}
                        tradeData={tradeData}
                        activeSession={activeSession}
                    />
                </div>
            </div>

            <ChatMessageList
                t={t}
                language={language}
                messagesScrollRef={messagesScrollRef}
                messagesEndRef={messagesEndRef}
                isDragging={isDragging}
                handleMessagesScroll={handleMessagesScroll}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                renderStartIndex={renderStartIndex}
                renderedMessages={renderedMessages}
                filteredMessages={filteredMessages}
                continuationOpts={continuationOpts}
                observeMessage={observeMessage}
                chatId={chat?.id ? String(chat.id) : undefined}
                isNearBottomRef={isNearBottomRef}
                scrollToBottom={scrollToBottom}
                setReplyTo={setReplyTo}
                isSelecting={isSelecting}
                selectedMessageIds={selectedMessageIds}
                toggleSelection={toggleSelection}
                setSelectedMessageIds={setSelectedMessageIds}
                uploadProgresses={uploadProgresses}
                setViewerMedia={setViewerMedia}
                handleForwardMessage={handleForwardMessage}
                handleDeleteMessage={handleDeleteMessage}
                handleEditMessage={handleEditMessage}
                handlePinMessage={handlePinMessage}
                handleReplyClick={handleReplyClick}
                onStartSelecting={() => setIsSelecting(true)}
                activeAudioId={activeAudioId}
                setActiveAudioId={setActiveAudioId}
                isNearBottom={isNearBottom}
                newMessagesWhileUp={newMessagesWhileUp}
                jumpToLatestMessage={jumpToLatestMessage}
                showPeerAvatar={chat?.type === 'group' || chat?.type === 'channel'}
                chatType={chat?.type}
                groupCreatorId={groupCreatorId != null ? String(groupCreatorId) : null}
                currentUserId={currentUser?.id != null ? String(currentUser.id) : null}
            />

            {/* Input Area — kanalda faqat yaratuvchi xabar/fayl qo'yadi; boshqalar faqat ko'radi */}
            <div className="relative z-30 shrink-0 w-full px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:px-4 lg:pb-4">
                <div className="tg-chat-column">
                {chat?.type === 'private' && showMentorGroupInvite && chat?.id && (
                    <MentorGroupInviteBar chatId={String(chat.id)} expertName={mentorDisplayName} />
                )}
                {showListingDealBar && (
                    <ListingDealBar
                        chat={chat}
                        currentUserId={currentUser?.id != null ? String(currentUser.id) : undefined}
                    />
                )}
                {chat?.type === 'channel' && !isChannelCreator && (
                    <div className="mb-2 flex h-12 items-center justify-center rounded-[24px] bg-[#212121] text-[16px] font-medium text-[#8774e1] shadow-[0_1px_8px_rgba(0,0,0,0.12)]">
                        {t('channel_admin_only')}
                    </div>
                )}
                {(!chat || chat.type !== 'channel' || isChannelCreator) && (
                <ChatComposer
                    t={t}
                    isSomeoneTyping={isSomeoneTyping}
                    fileInputRef={fileInputRef}
                    folderInputRef={folderInputRef}
                    chatInputRef={chatInputRef}
                    handleFileUpload={handleFileUpload}
                    replyTo={replyTo}
                    setReplyTo={setReplyTo}
                    editingMessage={editingMessage}
                    setEditingMessage={setEditingMessage}
                    isRecording={isRecording}
                    recordingTime={recordingTime}
                    formatCallTime={formatCallTime}
                    setIsRecording={setIsRecording}
                    timerRef={timerRef}
                    mediaRecorderRef={mediaRecorderRef}
                    inputValue={inputValue}
                    setInputValue={setComposerValue}
                    socket={socket}
                    chat={chat}
                    typingTimeoutRef={typingTimeoutRef}
                    setInputFocused={setInputFocused}
                    messagesScrollRef={messagesScrollRef}
                    nearBottomPx={CHAT_NEAR_BOTTOM_PX}
                    scrollToBottom={scrollToBottom}
                    sendMessage={sendMessage}
                    stopRecording={stopRecording}
                    startRecording={startRecording}
                    cancelRecording={cancelRecording}
                    onSendSticker={sendSticker}
                    composerLocked={composerLocked}
                    composerLockedHint={composerLockedHint}
                    onPasteFiles={handlePasteFiles}
                    onCancelEdit={cancelEditing}
                />
                )}
                </div>
            </div>

            {/* Call overlay moved to GlobalCallOverlay (rendered in MessagesPageContent) */}

            <MediaUploadModal
                open={pendingFiles.length > 0}
                files={pendingFiles}
                initialCaption={pendingCaption}
                onClose={() => {
                    setPendingFiles([]);
                    setPendingCaption('');
                }}
                onSend={handleConfirmUpload}
            />

            {forwardMessage && (
                <ChatForwardModal
                    forwardMessage={forwardMessage}
                    chats={chats}
                    currentChatId={chat?.id}
                    avatarErrors={forwardAvatarErrors}
                    onAvatarError={(id) => setForwardAvatarErrors(prev => ({ ...prev, [id]: true }))}
                    onClose={() => { setForwardMessage(null); setForwardAvatarErrors({}); }}
                    onForward={handleForwardToChat}
                />
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



