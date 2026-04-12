"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import ChatList, { CATEGORIES } from "@/components/chat/ChatList";
import ChatCarouselPanel from "@/components/chat/ChatCarouselPanel";
import GroupInfoPanel from "@/components/chat/GroupInfoPanel";
import ServicesList from "@/components/chat/ServicesList";
import ProfileViewer from "@/components/chat/ProfileViewer";
import ProfileEditor from "@/components/chat/ProfileEditor";
import WalletPanel from "@/components/chat/WalletPanel";
import ExpenseTracker from "@/components/chat/ExpenseTracker";
import CommunitiesList from "@/components/chat/CommunitiesList";
import JobsPanel from "@/components/jobs/JobsPanel";
import ChannelInfoPanel from "@/components/chat/ChannelInfoPanel";
import UserInfoPanel from "@/components/chat/UserInfoPanel";
import ExpertActionsPanel from "@/components/chat/ExpertActionsPanel";
import AddContactModal from "@/components/chat/AddContactModal";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import CreateChannelModal from "@/components/chat/CreateChannelModal";
import ContactsModal from "@/components/chat/ContactsModal";
import BotsPanel from "@/components/chat/BotsPanel";
import { useSocket } from "@/context/SocketContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useHorizontalNavWheel } from "@/hooks/useHorizontalNavWheel";
import NotificationPopover from "@/components/chat/NotificationPopover";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import SpecialistDashboard from "@/components/dashboard/SpecialistDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import RoomAccessGate from "@/components/dashboard/RoomAccessGate";
import {
    Menu as MenuIcon,
    PenSquare,
    Search,
    X,
    UserCircle,
    Wallet,
    HelpCircle,
    Bell,
    Users,
    Megaphone,
    Contact,
    PhoneCall,
    Bookmark,
    Settings,
    Moon,
    LogOut,
    MessageSquare,
    User,
    Bot,
    ArrowLeft,
    Layout
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationKeys } from "@/lib/translations";
import { parseCreatedToMs, prefetchChatMessagesCache } from "@/lib/chat-message-cache";
import { getPrivateChatPeerUserId } from "@/lib/private-chat-peer";
import { getExpertPanelMode, parseStudentSessionStyle, type ExpertPanelMode } from "@/lib/expert-roles";
import { getToken, getUser, clearAuth, setUser, AUTH_USER_UPDATED_EVENT } from "@/lib/auth-storage";
import { useSearchParams, useRouter } from "next/navigation";
import { DEFAULT_PLATFORM_BACKGROUND } from "@/lib/default-background";
import { alertIncomingChatMessage, getMessageChatId, promptMobileNotificationPermissionEarly } from "@/lib/message-alert";

import { Suspense } from "react";

/** API ro'yxatida guruh hali ko'rinmasa ham ChatWindow ochilsin */
function lessonGroupPlaceholder(id: string) {
    return {
        id,
        name: 'Dars guruhi',
        type: 'group' as const,
        message: "Guruhga qo'shildingiz",
        time: '',
        unread: 0,
        avatar: null,
        status: 'offline',
        _lessonPlaceholder: true as const,
    };
}

function MessagesPageContent() {
    const { socket, isConnected } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const { t } = useLanguage();

    // Core State
    const [activeCategory, setActiveCategory] = useState("all");
    const [selectedChat, setSelectedChat] = useState<any | null>(null);
    /** SSR bilan bir xil: birinchi renderda har doim null; keyin loadInitial / storage da getUser() — hydration buzilmaydi */
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [chats, setChats] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    /** Dastlab yopiq: avval chat; info faqat header bosilganda (mobil animatsiya, desktop yon panel) */
    const [showRightPanel, setShowRightPanel] = useState(false);
    const [isExpertMode, setIsExpertMode] = useState(false);
    /** SSR / birinchi kadr: doim false — keyin useLayoutEffect */
    const [isMobile, setIsMobile] = useState(false);
    const searchParams = useSearchParams();
    const roomParam = searchParams.get('room');
    /** Guruhga qo'shilgandan keyin chatni ochish (?room= emas — RoomAccessGate ishlamasin) */
    const openChatParam = searchParams.get('openChat');
    /** E'lon / havola: mutaxassis kartasini ochish — /messages?expert=<userId> */
    const expertParam = searchParams.get('expert');
    const router = useRouter();
    const [roomGateState, setRoomGateState] = useState<'checking' | 'payment' | 'joined' | null>(roomParam ? 'checking' : null);

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Modal & Menu Visibility State
    const [showMenu, setShowMenu] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
    const [showContactsModal, setShowContactsModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const { unreadCount } = useNotifications();

    // BACKGROUND & THEME SETTINGS
    const [bgBlur, setBgBlur] = useState(8);
    const [bgImageBlur, setBgImageBlur] = useState(20);
    const [bgImage, setBgImage] = useState(DEFAULT_PLATFORM_BACKGROUND);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Sidebar -> services selected expert
    const [selectedExpertFromSidebar, setSelectedExpertFromSidebar] = useState<any | null>(null);
    // Markazda tanlangan ekspert (ServicesList dan)
    const [selectedExpertInView, setSelectedExpertInView] = useState<any | null>(null);
    /** Talaba ?room= bilan muvaffaqiyatli kirganda video dars paneli */
    const [studentLiveRoomId, setStudentLiveRoomId] = useState<string | null>(null);
    const [studentSessionStyle, setStudentSessionStyle] = useState<ExpertPanelMode>('mentor');

    const selectedChatIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedChatIdRef.current = selectedChat?.id != null ? String(selectedChat.id) : null;
    }, [selectedChat?.id]);

    /** Parallel fetchChats chaqiruqlarida eski javob yangi ro‘yxatni qayta yozmasin */
    const fetchChatsSeqRef = useRef(0);
    /** Ro‘yxatda chat topilmasa — cache bust bilan qayta yuklash (bir nechta xabar uchun bitta) */
    const chatListResyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const savedBlur = localStorage.getItem('app-bg-blur');
        const savedImageBlur = localStorage.getItem('app-bg-image-blur');
        const savedImage = localStorage.getItem('app-bg-image');
        const savedTheme = localStorage.getItem('app-theme');
        if (savedBlur) setBgBlur(parseInt(savedBlur));
        if (savedImageBlur) setBgImageBlur(parseInt(savedImageBlur));
        if (savedImage) {
            if (savedImage === "/platform-default-bg.png") {
                localStorage.removeItem("app-bg-image");
                setBgImage(DEFAULT_PLATFORM_BACKGROUND);
            } else {
                setBgImage(savedImage);
            }
        }
        if (savedTheme) setIsDarkMode(savedTheme === 'dark');
    }, []);

    // Mobile / Desktop — Tailwind `lg` (1024px); layout effect: paint oldin to‘g‘ri `isMobile`
    useLayoutEffect(() => {
        const update = () => setIsMobile(window.innerWidth < 1024);
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    /** Mobil: boshqa chat tanlanganda avval suhbat oynasi — info yopiladi (desktopda yon panel ochiq qolishi mumkin) */
    useEffect(() => {
        if (!isMobile || !selectedChat) return;
        setShowRightPanel(false);
    }, [isMobile, selectedChat?.id]);

    const updateBgBlur = (val: number) => {
        setBgBlur(val);
        localStorage.setItem('app-bg-blur', val.toString());
    };

    const updateBgImageBlur = (val: number) => {
        setBgImageBlur(val);
        localStorage.setItem('app-bg-image-blur', val.toString());
    };

    const updateBgImage = (url: string) => {
        setBgImage(url);
        localStorage.setItem('app-bg-image', url);
    };

    const updateTheme = (dark: boolean) => {
        setIsDarkMode(dark);
        localStorage.setItem('app-theme', dark ? 'dark' : 'light');
    };

    const openMentorPanelForGroup = useCallback(
        (g: { id?: string; chatId?: string }) => {
            const gid = String(g.chatId || g.id || '');
            if (!gid) return;
            const roomChat = chats.find((c: any) => String(c.id) === gid);
            if (roomChat) setSelectedChat(roomChat);
            else setSelectedChat(lessonGroupPlaceholder(gid));
            setShowRightPanel(false);
            setIsExpertMode(true);
            setActiveCategory('all');
        },
        [chats]
    );

    const handleToggleExpertPanel = useCallback(async () => {
        if (isExpertMode) {
            setIsExpertMode(false);
            return;
        }
        if (!currentUser?.is_expert) return;

        const panelMode = getExpertPanelMode(currentUser);
        const isMentorExpert = panelMode === 'mentor';

        const isOwner =
            selectedChat &&
            (selectedChat.type === 'group' || selectedChat.type === 'channel') &&
            String(selectedChat.creator_id ?? selectedChat.creatorId ?? '') === String(currentUser.id);

        // Psixolog / huquqshunos / konsultant: chat tanlash shart emas — panel ichida «Mijozlar»dan qabul xabari yuboriladi
        if (!isMentorExpert) {
            setIsExpertMode(true);
            setActiveCategory('all');
            return;
        }

        // Mentor: shaxsiy chatda ham (1:1 dars) panel ochiladi; guruh faqat jamoaviy dars uchun
        if (selectedChat?.type === 'private') {
            setIsExpertMode(true);
            setActiveCategory('all');
            return;
        }

        // Mentor: o‘z guruhida — darhol panel; aks holda dars guruhlari ro‘yxati
        if (isOwner) {
            setIsExpertMode(true);
            setActiveCategory('all');
            return;
        }
        try {
            const res = await apiFetch(`/api/chats/expert/${currentUser.id}`);
            if (!res.ok) {
                showError("Guruhlar ro'yxatini yuklab bo'lmadi.");
                return;
            }
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) {
                showError("Sizda dars guruhi yo'q. Profilda guruh qo'shing.");
                return;
            }
            if (data.length === 1) {
                openMentorPanelForGroup(data[0]);
                return;
            }
            // Bir nechta guruh: modalsiz panel; chap ro‘yxat va xona konteksti uchun birinchi guruhni tanlash. «Darsni boshlash»da yana tanlash modali.
            openMentorPanelForGroup(data[0]);
        } catch (e) {
            console.error(e);
            showError('Xatolik yuz berdi. Qayta urinib ko‘ring.');
        }
    }, [isExpertMode, currentUser, selectedChat, openMentorPanelForGroup]);

    const handleCategoryNavChange = useCallback((catId: string) => {
        setActiveCategory(catId);
        if (catId !== 'all') setSelectedChat(null);
        if (catId === 'wallet') setIsExpertMode(false);
    }, []);

    // FETCH CHATS (refresh = true: backend cache dan o'tkazmaydi)
    const fetchChats = useCallback(async (refresh = false) => {
        const token = getToken();
        if (!token) {
            console.warn("[MessagesPage] No token found, redirecting to login");
            setLoading(false);
            window.location.href = '/login';
            return;
        }
        const seq = ++fetchChatsSeqRef.current;
        console.log("[MessagesPage] fetchChats starting...");
        try {
            const url = refresh ? `/api/chats?refresh=1` : `/api/chats`;
            const res = await apiFetch(url);
            console.log("[MessagesPage] fetchChats status:", res.status);
            if (res.ok) {
                const data = await res.json();
                if (seq !== fetchChatsSeqRef.current) return;
                console.log("[MessagesPage] fetchChats count:", data.length);
                const mappedChats = data.map((chat: any) => {
                    const chatId = chat.id || chat._id;
                    return {
                        ...chat,
                        id: chatId,
                        name: chat.type === 'group' ? chat.name : (chat.otherUser?.name ? `${chat.otherUser.name} ${chat.otherUser.surname || ''}` : 'Unknown User'),
                        message: chat.lastMessage || "No messages yet",
                        time: chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                        unread: (String(chatId) === String(selectedChat?.id)) ? 0 : (chat.unread || 0),
                        avatar: chat.type === 'group' ? (chat.avatar_url ?? chat.avatar ?? null) : (chat.otherUser?.avatar || "use_initials"),
                        status: "offline",
                        type: chat.type || "private",
                        participantId: getPrivateChatPeerUserId({
                            ...chat,
                            type: chat.type || "private",
                        }) ?? chat.otherUser?.id,
                    };
                });
                setChats(mappedChats);
            }
        } catch (err) {
            console.error("Failed to load chats:", err);
        } finally {
            if (seq === fetchChatsSeqRef.current) {
                setLoading(false);
            }
        }
    }, [selectedChat?.id]);

    // FETCH CONTACTS
    const fetchContacts = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        console.log("[MessagesPage] fetchContacts starting...");
        try {
            const res = await apiFetch(`/api/users/contacts`);
            console.log("[MessagesPage] fetchContacts status:", res.status);
            if (res.ok) {
                const users = await res.json();
                console.log("[MessagesPage] fetchContacts count:", users.length);
                if (Array.isArray(users)) {
                    const mappedContacts = users.map((u: any) => ({
                        ...u,
                        id: u.id,
                        name: u.name ? `${u.name} ${u.surname || ''}`.trim() : (u.phone || u.username || "Unknown Contact"),
                        message: u.bio || "No status",
                        time: "",
                        unread: 0,
                        avatar: u.avatar || u.avatar_url || "use_initials",
                        status: "offline",
                        type: "contact",
                    }));
                    setContacts(mappedContacts);
                }
            }
        } catch (err) {
            console.error("Failed to load contacts:", err);
        }
    }, []);
    // HANDLERS
    const handleAddContact = async (user: any) => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await apiFetch(`/api/chats`, {
                method: 'POST',
                body: JSON.stringify({
                    participantId: user.id || user.userId,
                    ...(user.fromExpertListing ? { fromExpertListing: true } : {}),
                })
            });
            if (res.ok) {
                const enriched = await res.json();
                await fetchContacts();
                await fetchChats(true);

                const chatId = enriched.id || enriched._id;
                const fullChat = {
                    ...enriched,
                    id: chatId,
                    name:
                        enriched.otherUser?.name ?
                            `${enriched.otherUser.name} ${enriched.otherUser.surname || ''}`.trim()
                        :   `${user.name} ${user.surname || ''}`.trim(),
                    message: 'No messages yet',
                    time: '',
                    unread: 0,
                    avatar: enriched.otherUser?.avatar || user.avatar || user.avatar_url || 'use_initials',
                    type: 'private',
                    participantId: enriched.otherUser?.id,
                };
                if (chatId) void prefetchChatMessagesCache(chatId);
                setSelectedChat(fullChat);
                setShowRightPanel(false);
                setActiveCategory('all');
                setIsExpertMode(false);
            }
        } catch (err) { console.error(err); }
        setShowContactModal(false);
    };

    const handleCreateGroup = async (name: string, participantIds: string[], avatarUrl?: string) => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await apiFetch(`/api/chats`, {
                method: 'POST',
                body: JSON.stringify({
                    type: 'group',
                    name,
                    participants: participantIds,
                    ...(avatarUrl && { avatar_url: avatarUrl }),
                }),
            });
            if (res.ok) {
                const newChat = await res.json();
                const id = newChat.id || newChat._id;
                const avatar = newChat.avatar_url ?? avatarUrl ?? null;
                if (id) {
                    const checkRes = await apiFetch(`/api/chats/${id}`);
                    if (!checkRes.ok) {
                        console.warn("[handleCreateGroup] Guruh yaratildi lekin GET tekshiruv 404 – ehtimol cache yoki boshqa backend. chatId:", id);
                    }
                    const mappedNew = {
                        ...newChat,
                        id,
                        creator_id: newChat.creator_id ?? newChat.creatorId ?? currentUser?.id,
                        name: newChat.name || name,
                        message: "No messages yet",
                        time: "",
                        unread: 0,
                        avatar: avatar,
                        avatar_url: avatar,
                        status: "offline",
                        type: "group",
                        participantId: undefined,
                    };
                    setChats(prev => [mappedNew, ...prev]);
                    if (id) void prefetchChatMessagesCache(id);
                    setSelectedChat(mappedNew);
                    /** Desktop: guruh profili yon panelda; mobil: avval chat (useEffect ham yopadi) */
                    setShowRightPanel(typeof window !== 'undefined' && window.innerWidth >= 1024);
                    setIsExpertMode(false);
                }
                await fetchChats(true);
                setActiveCategory('all');
                setShowGroupModal(false);
            }
        } catch (err) { console.error(err); }
    };

    const handleCreateChannel = async (data: any) => {
        try {
            const res = await apiFetch(`/api/chats`, {
                method: 'POST',
                body: JSON.stringify({ type: 'channel', ...data })
            });
            if (res.ok) {
                await fetchChats();
                setShowCreateChannelModal(false);
            }
        } catch (err) { console.error(err); }
    };

    const handleSupport = async () => {
        try {
            const res = await apiFetch(`/api/users`);
            if (res.ok) {
                const users = await res.json();
                const admin = users.find((u: any) => u.phone === '+998950203601' || u.role === 'admin');
                if (admin) handleAddContact(admin);
            }
        } catch (e) { console.error(e); }
        setShowMenu(false);
    };

    const handleMarkAsRead = useCallback(async (chatId: string) => {
        try {
            await apiFetch(`/api/chats/${chatId}/read`, { method: 'POST' });
            // Update local state immediately
            setChats(prev => prev.map(c =>
                String(c.id) === String(chatId) ? { ...c, unread: 0 } : c
            ));
        } catch (err) {
            console.error("Failed to mark chat as read:", err);
        }
    }, []);

    const handleDeleteContact = async (contactId: string) => {
        const ok = await confirm({
            title: t('delete_contact') as TranslationKeys,
            description: t('confirm_delete_contact') as TranslationKeys,
            variant: 'danger',
            confirmLabel: t('delete') as TranslationKeys
        });
        if (!ok) return;
        const token = getToken();
        if (!token) return;
        try {
            const res = await apiFetch(`/api/users/contacts/${contactId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                await fetchContacts();
                await fetchChats();
                if (selectedChat && (String(selectedChat.participantId) === String(contactId) || String(selectedChat.otherUser?.id) === String(contactId))) {
                    setSelectedChat(null);
                }
            }
        } catch (err) { console.error(err); }
    };

    // Enhanced search: filters local chats/contacts AND searches global users
    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        const trimmed = query.trim();

        if (!trimmed) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        // 1. Local filtering
        const localChats = chats
            .filter(c => {
                const nameMatch = c.name?.toLowerCase().includes(trimmed.toLowerCase());
                const userMatch = c.username?.toLowerCase().includes(trimmed.toLowerCase());
                return nameMatch || userMatch;
            })
            .map(c => ({ ...c, searchSource: 'chat' }));

        const localContacts = contacts
            .filter(c => {
                const nameMatch = c.name?.toLowerCase().includes(trimmed.toLowerCase());
                const userMatch = c.username?.toLowerCase().includes(trimmed.toLowerCase());
                const phoneMatch = c.phone?.includes(trimmed);
                return nameMatch || userMatch || phoneMatch;
            })
            // Exclude if already in localChats to avoid duplicates
            .filter(c => !localChats.some(lc => String(lc.participantId || lc.id) === String(c.participantId || c.id)))
            .map(c => ({ ...c, searchSource: 'contact' }));

        const combinedLocal = [...localChats, ...localContacts];
        setSearchResults(combinedLocal);

        // 2. Global search (only if length >= 2)
        if (trimmed.length < 2) {
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(trimmed)}&searchBy=username`);
            if (res.ok) {
                const list = await res.json();
                const globalMapped = list
                    .filter((u: any) => !combinedLocal.some(lc => String(lc.participantId || lc.id) === String(u.id)))
                    .map((u: any) => ({
                        id: u.id,
                        name: u.name ? `${u.name} ${u.surname || ''}`.trim() : (u.username ? `@${u.username}` : 'User'),
                        username: u.username,
                        message: u.is_expert ? (u.profession || 'Ekspert') : 'Foydalanuvchi nomi',
                        avatar: u.avatar_url || u.avatar || 'use_initials',
                        type: 'contact',
                        isGlobal: true,
                        searchSource: 'global',
                    }));
                
                setSearchResults([...combinedLocal, ...globalMapped]);
            }
        } catch (err) {
            console.error('Search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Barcha chat xonalariga qo‘shilish — boshqa qurilmadan xabar kelsa real-time yangilanadi
    useEffect(() => {
        if (socket && isConnected && Array.isArray(chats) && chats.length > 0) {
            chats.forEach((c: any) => {
                const roomId = c.id || c._id;
                if (roomId) socket.emit('join_room', roomId);
            });
        }
    }, [socket, isConnected, chats]);

    // Faqat bir marta (va ?room= o'zgaganda) — selectedChat o'zgarganda qayta fetch qilinmasin
    useEffect(() => {
        const loadInitial = async () => {
            const parsed = getUser();
            if (parsed) {
                setCurrentUser(parsed);
                if (roomParam) {
                    console.log("[MessagesPage] Room parameter detected:", roomParam);
                    setIsExpertMode(false);
                    setShowRightPanel(false);
                    setSelectedChat(lessonGroupPlaceholder(String(roomParam)));
                }
            }
            await fetchChats();
            await fetchContacts();
        };
        loadInitial();
    }, [fetchChats, fetchContacts, roomParam]);

    /** Profildan `setUser` chaqirilganda yon menyu `currentUser` darhol yangilansin (socketdan mustaqil) */
    useEffect(() => {
        const syncFromStorage = () => {
            const u = getUser();
            if (u) setCurrentUser(u);
        };
        if (typeof window !== 'undefined') {
            window.addEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage);
            }
        };
    }, []);

    /** Mobil: sahifa ochilganda bildirishnomalarga ruxsatni oldindan so‘rash (bitta marta) */
    useEffect(() => {
        promptMobileNotificationPermissionEarly();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const handleProfileUpdate = (data: any) => {
            const current = getUser();
            const myId = current?.id != null ? String(current.id) : '';
            const incomingId = String(data?.userId ?? data?.id ?? '');
            if (myId && incomingId && incomingId !== myId) {
                void fetchChats(true);
                fetchContacts();
                return;
            }
            if (myId && data && typeof data === 'object') {
                const pic = data.avatar_url ?? data.avatar;
                const updated = {
                    ...(current || {}),
                    ...data,
                    ...(pic ? { avatar: pic, avatar_url: pic } : {}),
                };
                setUser(updated as Record<string, unknown>);
                setCurrentUser(updated);
            }
            void fetchChats(true);
            fetchContacts();
        };

        const handleReceiveMessage = (message: any) => {
            setChats((prev) => {
                const chatId = getMessageChatId(message);
                if (!chatId) return prev;
                const index = prev.findIndex(c => String(c.id) === chatId);
                if (index === -1) {
                    if (chatListResyncTimerRef.current) clearTimeout(chatListResyncTimerRef.current);
                    chatListResyncTimerRef.current = setTimeout(() => {
                        chatListResyncTimerRef.current = null;
                        void fetchChats(true);
                    }, 180);
                    return prev;
                }
                const updatedChats = [...prev];
                const chat = { ...updatedChats[index] };
                const msgType = message.type || 'text';
                chat.message =
                    msgType === 'text'
                        ? (message.content || '')
                        : msgType === 'image'
                          ? 'Rasm'
                          : msgType === 'video'
                            ? 'Video'
                            : msgType === 'voice'
                              ? 'Ovozli xabar'
                              : msgType === 'file'
                                ? 'Fayl'
                                : (message.content || '');
                const createdRaw = message.created_at ?? message.createdAt ?? message.timestamp;
                const createdMs = parseCreatedToMs(createdRaw);
                if (createdMs != null) {
                    const createdIso = new Date(createdMs).toISOString();
                    chat.time = new Date(createdMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    chat.lastMessageAt = createdIso;
                } else if (!chat.time) {
                    chat.time = '';
                }

                const myId = getUser()?.id;
                const senderId = message.sender_id || message.senderId;
                const isFromMe = String(senderId) === String(myId);
                const isCurrentChat = chatId === String(selectedChatIdRef.current);

                if (isCurrentChat) {
                    chat.unread = 0;
                } else if (!isFromMe) {
                    chat.unread = (chat.unread || 0) + 1;

                    const senderName = chat.name || (message.sender_name as string) || (message.senderName as string) || 'Yangi xabar';
                    const body =
                        msgType === 'text'
                            ? (message.content || '').slice(0, 100)
                            : msgType === 'image'
                              ? '📷 Rasm'
                              : msgType === 'video'
                                ? '🎬 Video'
                                : msgType === 'voice'
                                  ? '🎤 Ovozli xabar'
                                  : msgType === 'file'
                                    ? '📎 Fayl'
                                    : 'Yangi xabar';
                    alertIncomingChatMessage({
                        title: senderName,
                        body,
                        tag: `chat-${chatId}`,
                    });
                }

                updatedChats.splice(index, 1);
                updatedChats.unshift(chat);
                return updatedChats;
            });
        };

        const handleChatUpdated = (data: { chatId: string; name?: string; avatar_url?: string }) => {
            const { chatId, name, avatar_url } = data;
            if (!chatId) return;
            setChats((prev) => {
                const index = prev.findIndex(c => String(c.id) === String(chatId));
                if (index === -1) return prev;
                const updatedChats = [...prev];
                const chat = { ...updatedChats[index] };
                if (name !== undefined) chat.name = name;
                if (avatar_url !== undefined) {
                    chat.avatar_url = avatar_url;
                    chat.avatar = avatar_url;
                }
                updatedChats[index] = chat;
                return updatedChats;
            });
            setSelectedChat((prev: any) => {
                if (!prev || String(prev.id) !== String(chatId)) return prev;
                return {
                    ...prev,
                    ...(name !== undefined && { name }),
                    ...(avatar_url !== undefined && { avatar_url, avatar: avatar_url }),
                };
            });
        };

        socket.on('profile_updated', handleProfileUpdate);
        socket.on('receive_message', handleReceiveMessage);
        socket.on('chat_updated', handleChatUpdated);

        const handleReconnect = () => {
            console.log("[MessagesPage] Reconnected, syncing all data...");
            fetchChats(true);
            fetchContacts();
        };
        window.addEventListener('socket_reconnected', handleReconnect);

        return () => {
            socket.off('profile_updated', handleProfileUpdate);
            socket.off('receive_message', handleReceiveMessage);
            socket.off('chat_updated', handleChatUpdated);
            window.removeEventListener('socket_reconnected', handleReconnect);
            if (chatListResyncTimerRef.current) {
                clearTimeout(chatListResyncTimerRef.current);
                chatListResyncTimerRef.current = null;
            }
        };
    }, [socket, fetchChats, fetchContacts]);

    // Reset unread count locally when a chat is selected
    useEffect(() => {
        if (selectedChat?.id) {
            setChats(prev => prev.map(c =>
                String(c.id) === String(selectedChat.id) ? { ...c, unread: 0 } : c
            ));
        }
    }, [selectedChat?.id]);

    // Placeholder tanlanganida ro'yxat kelgach to'liq chat ma'lumotiga yangilash
    useEffect(() => {
        if (!selectedChat?._lessonPlaceholder || !selectedChat?.id || !chats.length || !currentUser?.id) return;
        const full = chats.find((c: any) => String(c.id) === String(selectedChat.id));
        if (!full) return;
        setSelectedChat(full);
        setShowRightPanel(false);
        setIsExpertMode(false);
    }, [chats, selectedChat?._lessonPlaceholder, selectedChat?.id, currentUser]);

    // roomParam: obunani tekshirish, guruhga qo'shilish, guruh chatini ko'rsatish
    useEffect(() => {
        if (!roomParam || !currentUser?.id) return;
        let cancelled = false;
        (async () => {
            try {
                const roomRes = await apiFetch(`/api/chats/${roomParam}/room-info`);
                if (cancelled) return;
                if (!roomRes.ok) {
                    setRoomGateState('payment');
                    return;
                }
                const room = await roomRes.json();
                const creatorId = room.creator_id;
                if (creatorId) {
                    const subRes = await apiFetch(`/api/wallet/subscription-status?mentorId=${encodeURIComponent(creatorId)}`);
                    if (cancelled) return;
                    const subData = await subRes.json();
                    if (!subData?.active) {
                        setRoomGateState('payment');
                        return;
                    }
                }
                const joinRes = await apiFetch(`/api/chats/${roomParam}/join-with-subscription`, { method: 'POST' });
                if (cancelled) return;
                if (!joinRes.ok) {
                    setRoomGateState('payment');
                    return;
                }
                const chatsRes = await apiFetch('/api/chats?refresh=1');
                if (cancelled) return;
                if (chatsRes.ok) {
                    const data = await chatsRes.json();
                    const mappedChats = data.map((chat: any) => {
                        const chatId = chat.id || chat._id;
                        return {
                            ...chat,
                            id: chatId,
                            name: chat.type === 'group' ? chat.name : (chat.otherUser?.name ? `${chat.otherUser.name} ${chat.otherUser.surname || ''}` : 'Unknown User'),
                            message: chat.lastMessage || "No messages yet",
                            time: chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                            unread: 0,
                            avatar: chat.type === 'group' ? (chat.avatar_url ?? chat.avatar ?? null) : (chat.otherUser?.avatar || "use_initials"),
                            status: "offline",
                            type: chat.type || "private",
                            participantId: chat.otherUser?.id,
                        };
                    });
                    setChats(mappedChats);
                    const roomChat = mappedChats.find((c: any) => String(c.id) === String(roomParam));
                    const isMentorOwner =
                        roomChat &&
                        currentUser?.id &&
                        String(roomChat.creator_id ?? roomChat.creatorId ?? '') === String(currentUser.id);
                    if (roomChat) {
                        setSelectedChat(roomChat);
                        setShowRightPanel(false);
                        setIsExpertMode(false);
                        if (!isMentorOwner && roomParam) {
                            setStudentLiveRoomId(String(roomParam));
                            setStudentSessionStyle(parseStudentSessionStyle(searchParams.get('style')));
                        }
                    } else {
                        setSelectedChat(lessonGroupPlaceholder(String(roomParam)));
                        setShowRightPanel(false);
                        setIsExpertMode(false);
                    }
                }
                setRoomGateState('joined');
                setLoading(false);
                router.replace('/messages');
            } catch {
                if (!cancelled) setRoomGateState('payment');
            }
        })();
        return () => { cancelled = true; };
    }, [roomParam, currentUser?.id, router, searchParams]);

    // Darsga qo'shilgandan keyin: chat ro'yxatini yangilash
    useEffect(() => {
        if (!openChatParam || !currentUser?.id) return;
        fetchChats(true);
    }, [openChatParam, currentUser?.id, fetchChats]);

    // openChat guruhini tanlash va URL dan parameterni olib tashlash
    useEffect(() => {
        if (!openChatParam || !currentUser?.id) return;
        if (!chats.length) return;
        const chat = chats.find((c: any) => String(c.id) === String(openChatParam));
        if (!chat) {
            setSelectedChat(lessonGroupPlaceholder(String(openChatParam)));
            setShowRightPanel(false);
            setIsExpertMode(false);
            setActiveCategory('all');
            router.replace('/messages', { scroll: false });
            return;
        }
        if (chat?.id) void prefetchChatMessagesCache(chat.id);
        setSelectedChat(chat);
        setShowRightPanel(false);
        setIsExpertMode(false);
        setActiveCategory('all');
        router.replace('/messages', { scroll: false });
    }, [openChatParam, chats, currentUser, router]);

    // Profil havolasi: expert UUID → Xizmatlar + o'ng panel
    useEffect(() => {
        if (!expertParam || !currentUser?.id) return;
        let cancelled = false;
        (async () => {
            const stripExpert = () => {
                const next = new URLSearchParams(searchParams.toString());
                next.delete('expert');
                const qs = next.toString();
                router.replace(qs ? `/messages?${qs}` : '/messages', { scroll: false });
            };
            try {
                const res = await apiFetch(`/api/users/${encodeURIComponent(expertParam)}`);
                if (cancelled) return;
                if (!res.ok) {
                    stripExpert();
                    return;
                }
                const profile = await res.json();
                if (cancelled) return;
                setSelectedExpertFromSidebar(profile);
                setSelectedExpertInView(profile);
                setActiveCategory('services');
                setShowRightPanel(true);
                setIsExpertMode(false);
                stripExpert();
            } catch (e) {
                console.error('[messages] expert param', e);
                if (!cancelled) stripExpert();
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [expertParam, currentUser?.id, router, searchParams]);

    const isPanelCategory = ['jobs', 'services', 'finance', 'communities', 'wallet', 'profile', 'settings', 'profile_edit', 'bots'].includes(activeCategory);
    /** Konsultant/ustoz paneli chat tanlamasdan: main oynasi mobilda ham ko'rinsin (oldingi holatda showDetail false → main `hidden`) */
    const showDetail =
        !!selectedChat ||
        (isPanelCategory &&
            !(activeCategory === 'services' && !selectedExpertInView) &&
            !(activeCategory === 'wallet' && isMobile)) ||
        (isExpertMode && !!currentUser?.is_expert);

    /** Shaxsiy chat yoki o‘z guruhim: ekspert xizmat paneli. Kanal/guruhda boshqa odam yaratuvchisi bo‘lsa — panel yo‘q. */
    const isGroupOrChannel = selectedChat?.type === 'group' || selectedChat?.type === 'channel';
    const userOwnsThisGroupChat =
        !!isGroupOrChannel &&
        !!currentUser?.id &&
        String(selectedChat?.creator_id ?? selectedChat?.creatorId ?? '') === String(currentUser.id);
    const expertPanelKindUi = currentUser ? getExpertPanelMode(currentUser) : 'mentor';
    const consultPanelNoChatRequired = !!currentUser?.is_expert && expertPanelKindUi !== 'mentor';
    const consultLobbySessionId = currentUser?.id ? `consult-lobby-${currentUser.id}` : 'demo-session-id';
    /** Mentor: panel rejimi yoqilganda asosiy oynada SpecialistDashboard (chat tanlanmagan yoki placeholder guruhda ham). Konsultant: avvalgi qoida. */
    const showSpecialistDashboard =
        isExpertMode &&
        !!currentUser?.is_expert &&
        (consultPanelNoChatRequired ||
            expertPanelKindUi === 'mentor' ||
            (!!selectedChat && (userOwnsThisGroupChat || !isGroupOrChannel)));

    /** Jonli ustoz/konsultant paneli ochilganda o‘ngdagi guruh profili (GroupInfoPanel va hokazo) chiqmasin */
    const hideRightPanelForSpecialistDashboard = showSpecialistDashboard;

    /**
     * lg dan kichik ekranda: asosiy chatda (`activeCategory === 'all'`) info ochiq bo‘lsa `<main>` yashirinadi.
     * Servislar/hamyon va h.k. da `selectedChat` qolgan bo‘lsa ham noto‘g‘ri yashirmaslik uchun.
     */
    const hideMainUnderChatInfo =
        activeCategory === 'all' &&
        showRightPanel &&
        !!selectedChat &&
        !hideRightPanelForSpecialistDashboard;

    const mobileCategoryNavRef = useRef<HTMLDivElement | null>(null);
    useHorizontalNavWheel(mobileCategoryNavRef, !showDetail);

    // roomParam + to'lov talab qilinadi – RoomAccessGate (obuna oynasi)
    if (roomParam && roomGateState === 'payment') {
        return (
            <RoomAccessGate
                roomId={roomParam}
                user={currentUser}
                sessionStyle={parseStudentSessionStyle(searchParams.get('style'))}
                onLeave={() => window.location.href = '/messages'}
            />
        );
    }
    // roomParam + tekshirilmoqda
    if (roomParam && roomGateState === 'checking') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white gap-4">
                <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-sm text-white/60">Guruhga qo&apos;shilmoqda...</p>
            </div>
        );
    }

    if (studentLiveRoomId && currentUser) {
        return (
            <StudentDashboard
                user={currentUser}
                sessionId={studentLiveRoomId}
                sessionStyle={studentSessionStyle}
                onLeave={() => {
                    setStudentLiveRoomId(null);
                    setStudentSessionStyle('mentor');
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black animate-fade-in">
            {/* Global Dynamic Background Image */}
            <div
                className="absolute inset-0 z-0 transition-all duration-700 ease-in-out"
                style={{
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: `blur(${bgImageBlur}px) brightness(${isDarkMode ? 0.6 : 0.9})`,
                    transform: `scale(${1.1 + (bgImageBlur / 100)})` // Dynamically adjust scale to hide blur edges
                }}
            />

            {/* Scaled/Responsive Main Application Frame */}
            <div className={`w-full min-w-0 h-dvh ${isExpertMode ? '' : 'max-w-[1800px] lg:h-[calc(100vh-2rem)] lg:rounded-[2rem]'} flex flex-col lg:flex-row gap-2 lg:gap-4 relative z-10 overflow-hidden`}>

                {/* Global Navigation Drawer (Menu) - Premium Glass Style */}
                {showMenu && (
                    <>
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-[4px] z-[100] animate-fade-in" onClick={() => setShowMenu(false)}></div>
                        <div className="fixed top-0 left-0 bottom-0 w-[300px] z-[110] flex flex-col animate-slide-drawer-left bg-white/30 backdrop-blur-[25px] brightness-[0.85] border-r border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                            <div className="flex items-center justify-between p-5 px-6 border-b border-white/10">
                                <div className="min-w-0">
                                    <h2 className="text-white font-bold text-xl tracking-tight drop-shadow-md leading-tight">ExpertLine</h2>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/45 mt-0.5 leading-snug">Mutaxassislarni toping · xavfsiz muloqot</p>
                                </div>
                                <button onClick={() => setShowMenu(false)} className="text-white/80 hover:text-white transition-colors shrink-0"><X className="h-5 w-5" /></button>
                            </div>

                            {/* Drawer User Info */}
                            <div className="px-6 py-8 flex items-center gap-5 border-b border-white/10 group cursor-pointer hover:bg-white/10 transition-all"
                                onClick={() => { setShowMenu(false); setActiveCategory('profile'); }}>
                                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl relative">
                                    {currentUser?.avatar || currentUser?.avatar_url ? (
                                        <img
                                            src={(() => {
                                                const path = currentUser.avatar || currentUser.avatar_url;
                                                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
                                                if (path.startsWith('http') || path.startsWith('data:')) return path;
                                                return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
                                            })()}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xl">
                                            {currentUser?.name?.[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold truncate text-lg drop-shadow-sm">{currentUser?.name}</h3>
                                    <p className="text-white/60 text-[13px] font-medium truncate">@{currentUser?.username}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
                                <button onClick={() => { setShowMenu(false); setActiveCategory('profile'); }} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                                    <UserCircle className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('profile')}
                                </button>
                                <button onClick={() => { setShowMenu(false); setActiveCategory('wallet'); }} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                                    <Wallet className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('wallet')}
                                </button>
                                <button onClick={() => { setShowMenu(false); handleSupport(); }} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                                    <HelpCircle className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('support')}
                                </button>
                                <div className="h-[1px] bg-white/10 my-4 mx-6"></div>
                                {(!currentUser?.is_expert || getExpertPanelMode(currentUser) === 'mentor') && (
                                    <button onClick={() => { setShowMenu(false); setShowGroupModal(true); }} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                                        <Users className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('create_group')}
                                    </button>
                                )}
                                <button onClick={() => { setShowMenu(false); setShowCreateChannelModal(true); }} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                                    <Megaphone className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('create_channel')}
                                </button>
                                <button onClick={() => { setShowMenu(false); setShowContactsModal(true); }} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                                    <Contact className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('contacts')}
                                </button>
                                <button onClick={() => { setShowMenu(false); setActiveCategory('settings'); }} className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/10 text-white font-medium transition-all group">
                                    <Settings className="h-[22px] w-[22px] text-white/50 group-hover:text-blue-400" /> {t('settings')}
                                </button>
                            </div>

                            <div className="p-6 border-t border-white/10 space-y-4">
                                <div className="flex items-center justify-between text-white/50 px-2">
                                    <span className="text-xs uppercase font-bold tracking-widest">v 1.2.0</span>
                                    <Moon className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {showNotifications && (
                    <NotificationPopover onClose={() => setShowNotifications(false)} />
                )}

                {/* Modals */}
                <AddContactModal
                    open={showContactModal}
                    onClose={() => setShowContactModal(false)}
                    onStartChat={handleAddContact}
                />
                <CreateGroupModal
                    open={showGroupModal}
                    onClose={() => setShowGroupModal(false)}
                    onCreateGroup={handleCreateGroup}
                />
                <CreateChannelModal
                    open={showCreateChannelModal}
                    onClose={() => setShowCreateChannelModal(false)}
                    onCreateChannel={handleCreateChannel}
                />
                <ContactsModal
                    open={showContactsModal}
                    contacts={contacts}
                    onClose={() => setShowContactsModal(false)}
                    onStartChat={handleAddContact}
                    onAddContact={() => { setShowContactsModal(false); setShowContactModal(true); }}
                    onDeleteContact={handleDeleteContact}
                />

                {/* Global Mobile Header - Only visible on mobile, hidden when chat is open */}
                {!showDetail && (
                    <div className="lg:hidden sticky top-0 z-50 glass-premium bg-[#0f1117]/80 shadow-lg !border-t-0 !border-x-0 !rounded-none pt-[max(2.5rem,env(safe-area-inset-top))]">
                        <div className="p-4 pb-1 pt-0 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => setShowMenu(true)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"><MenuIcon className="h-6 w-6" /></button>
                                <div className="text-center min-w-0 px-1">
                                    <h2 className="text-white font-bold text-lg leading-tight">ExpertLine</h2>
                                    <p className="text-[8px] font-semibold uppercase tracking-wider text-white/45 leading-tight px-1">Ekspertlar va mijozlar</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {currentUser?.is_expert && (
                                        <button
                                            type="button"
                                            onClick={handleToggleExpertPanel}
                                            title={
                                                isExpertMode
                                                    ? "Mijoz ko'rinishi"
                                                    : getExpertPanelMode(currentUser) === 'mentor'
                                                      ? "Ustoz paneli"
                                                      : "Xizmat paneli"
                                            }
                                            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 ${isExpertMode ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                                        >
                                            <Layout className="h-5 w-5" />
                                        </button>
                                    )}
                                    <button type="button" onClick={() => setShowContactModal(true)} className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all duration-300"><PenSquare className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-white/30" /></div>
                                <input
                                    type="text"
                                    placeholder="Foydalanuvchi nomi (@username)"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full bg-white/5 border-none outline-none text-white rounded-full py-2.5 pl-11 pr-4 placeholder-white/30 text-sm"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => handleSearch("")}
                                        className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div
                            ref={mobileCategoryNavRef}
                            className="nav-scroll-x flex gap-4 px-4 py-3 mb-2 flex-nowrap border-b border-white/5 min-w-0 w-full lg:flex"
                        >
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleCategoryNavChange(cat.id)}
                                    className={`flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full transition-colors duration-150 ${activeCategory === cat.id ? 'bg-[#3b82f6] text-white' : 'bg-white/5 text-white/40'}`}
                                >
                                    <div className="w-6 h-6">{cat.icon}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Left Panel: ChatList */}
                <aside className={` ${showDetail ? 'hidden lg:flex' : 'flex'} ${isExpertMode ? 'lg:w-0 lg:p-0 w-0 p-0 opacity-0 pointer-events-none absolute lg:relative z-0' : 'lg:w-[380px] lg:px-4 w-full px-2 opacity-100 relative z-10'} transition-all duration-500 ease-in-out lg:h-full flex-1 min-h-0 lg:flex-none lg:min-h-0 min-w-0 flex-col overflow-hidden `}>
                    <ChatList
                        activeCategory={activeCategory}
                        onCategoryChange={handleCategoryNavChange}
                        onChatSelect={(chat) => {
                            if (chat?.id != null) void prefetchChatMessagesCache(chat.id);
                            setSelectedChat(chat);
                            if (activeCategory !== 'all') setActiveCategory('all');
                            /** Har doim avval chat; info faqat headerdan */
                            setShowRightPanel(false);
                            // Guruhga kirganda mentor paneli avtomatik ochilmasin — faqat Layout (ekspert) tugmasi
                            setIsExpertMode(false);
                        }}
                        hideHeader={true}
                        hideCategories={true}
                        showMenu={showMenu} setShowMenu={setShowMenu}
                        showContactModal={showContactModal} setShowContactModal={setShowContactModal}
                        showGroupModal={showGroupModal} setShowGroupModal={setShowGroupModal}
                        showCreateChannelModal={showCreateChannelModal} setShowCreateChannelModal={setShowCreateChannelModal}
                        showContactsModal={showContactsModal} setShowContactsModal={setShowContactsModal}
                        currentUser={currentUser}
                        chats={chats}
                        contacts={contacts}
                        loading={loading}
                        handleAddContact={handleAddContact}
                        handleSupport={handleSupport}
                        handleDeleteContact={handleDeleteContact}
                        searchQuery={searchQuery}
                        onSearchChange={handleSearch}
                        searchResults={searchResults}
                        isSearching={isSearching}
                        isExpertMode={isExpertMode}
                        onToggleExpertMode={handleToggleExpertPanel}
                        showNotifications={showNotifications}
                        setShowNotifications={setShowNotifications}
                        unreadCount={unreadCount}
                            isMobile={isMobile}
                        onExpertSelect={(exp) => {
                            setSelectedExpertFromSidebar(exp);
                            setSelectedExpertInView(exp);
                            setActiveCategory('services');
                        }}
                    />
                </aside>

                <main
                    className={
                        hideMainUnderChatInfo
                            ? 'hidden lg:flex lg:flex-col flex-1 min-h-0 h-full min-w-0 relative overflow-hidden w-full'
                            : ` ${!showDetail ? 'hidden lg:block' : 'w-full'} flex-1 min-h-0 h-full min-w-0 relative overflow-hidden flex flex-col`
                    }
                >
                    {activeCategory === 'jobs' ? (
                        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
                            <header className="lg:hidden shrink-0 p-4 border-b border-white/5 flex items-center gap-3 bg-[#1a1c20]/80 backdrop-blur-xl pt-[max(2rem,env(safe-area-inset-top))]">
                                <button onClick={() => setActiveCategory('all')} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/70 shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h2 className="text-white font-bold">Ish qidirish</h2>
                            </header>
                            <div className="flex-1 min-h-0 w-full flex flex-col p-4 overflow-hidden">
                                <JobsPanel />
                            </div>
                        </div>
                    )
                        : activeCategory === 'services' ? (
                            <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
                                {/* Desktop: chatlar ro'yxatiga qaytish (oldingi holatda tugma yo'q edi) */}
                                <header className="hidden lg:flex shrink-0 items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#14161c]/90 backdrop-blur-xl">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveCategory('all');
                                            setSelectedExpertInView(null);
                                            setSelectedExpertFromSidebar(null);
                                            setShowRightPanel(false);
                                        }}
                                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-white/90 hover:bg-white/10 transition-colors"
                                    >
                                        <ArrowLeft className="h-5 w-5 shrink-0" />
                                        <span className="text-sm font-semibold">Chatlarga qaytish</span>
                                    </button>
                                    <span className="text-white/30 text-sm">|</span>
                                    <h2 className="text-white font-bold text-base truncate max-w-[min(280px,40vw)]">
                                        {selectedExpertInView
                                            ? `${selectedExpertInView.name || ''} ${selectedExpertInView.surname || ''}`.trim() || 'Profil'
                                            : 'Ekspert tanlang'}
                                    </h2>
                                </header>
                                <header className="lg:hidden shrink-0 p-4 border-b border-white/5 flex items-center gap-3 bg-transparent pt-[max(2rem,env(safe-area-inset-top))]">
                                    <button
                                        onClick={() => {
                                            // Mobile: ekspert tanlanmagan holatga qaytish (1-rasm)
                                            setActiveCategory('services');
                                            setSelectedExpertInView(null);
                                            setSelectedExpertFromSidebar(null);
                                            setShowRightPanel(false);
                                        }}
                                        className="flex items-center p-2 -ml-2 hover:bg-white/10 rounded-full text-white/70 shadow-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <span className="text-white/30 text-sm">|</span>
                                    <h2 className="text-white font-bold text-base truncate max-w-[calc(100%-110px)]">
                                        {(selectedExpertInView
                                            ? `${selectedExpertInView.name || ''} ${selectedExpertInView.surname || ''}`.trim()
                                            : ''
                                        ) || 'Profil'}
                                    </h2>
                                </header>
                                <div className="flex-1 min-h-0 w-full flex flex-col p-4 overflow-hidden">
                                    <ServicesList
                                        activeTab="experts"
                                        onStartChat={handleAddContact}
                                        initialSelectedExpert={selectedExpertFromSidebar}
                                        onExpertSelect={setSelectedExpertInView}
                                        showRightPanel={showRightPanel}
                                        onToggleRightPanel={() => setShowRightPanel(true)}
                                    />
                                </div>
                            </div>
                        )
                            : activeCategory === 'finance' ? (
                                <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
                                    <header className="lg:hidden shrink-0 p-4 border-b border-white/5 flex items-center gap-3 bg-[#1a1c20]/80 backdrop-blur-xl pt-[max(2rem,env(safe-area-inset-top))]">
                                        <button onClick={() => setActiveCategory('all')} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/70 shadow-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <h2 className="text-white font-bold">Moliya</h2>
                                    </header>
                                    <div className="flex-1 min-h-0 w-full flex flex-col p-4 overflow-hidden">
                                        <ExpenseTracker />
                                    </div>
                                </div>
                            )
                                : activeCategory === 'communities' ? (
                                    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
                                        <header className="lg:hidden shrink-0 p-4 border-b border-white/5 flex items-center gap-3 bg-[#1a1c20]/80 backdrop-blur-xl pt-[max(2rem,env(safe-area-inset-top))]">
                                            <button onClick={() => setActiveCategory('all')} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/70 shadow-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                            </button>
                                            <h2 className="text-white font-bold">Hamjamiyatlar</h2>
                                        </header>
                                        <div className="flex-1 min-h-0 w-full flex flex-col p-4 overflow-hidden">
                                            <CommunitiesList />
                                        </div>
                                    </div>
                                )
                                    : activeCategory === 'wallet' ? (
                                        <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
                                            <header className="lg:hidden shrink-0 p-4 border-b border-white/5 flex items-center gap-3 bg-[#1a1c20]/80 backdrop-blur-xl pt-[max(2rem,env(safe-area-inset-top))]">
                                                <button onClick={() => setActiveCategory('all')} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/70 shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                                </button>
                                                <h2 className="text-white font-bold">Hamyon</h2>
                                            </header>
                                            <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden min-w-0">
                                                <WalletPanel
                                                    onChatSelect={(chat) => {
                                                        if (chat?.id != null) void prefetchChatMessagesCache(chat.id);
                                                        setSelectedChat(chat);
                                                        setActiveCategory('all');
                                                        setIsExpertMode(false);
                                                        setShowRightPanel(false);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                        : (activeCategory === 'profile' || activeCategory === 'settings') ? (
                                            <ProfileViewer
                                                mode={activeCategory as any}
                                                onClose={() => setActiveCategory('all')}
                                                onEdit={() => setActiveCategory('profile_edit')}
                                                onLogout={() => {
                                                    clearAuth();
                                                    window.location.href = '/login';
                                                }}
                                                user={currentUser}
                                                bgSettings={{ blur: bgBlur, imageBlur: bgImageBlur, image: bgImage, isDark: isDarkMode }}
                                                onUpdateBgBlur={updateBgBlur}
                                                onUpdateBgImageBlur={updateBgImageBlur}
                                                onUpdateBgImage={updateBgImage}
                                                onUpdateTheme={updateTheme}
                                            />
                                        )
                                            : activeCategory === 'bots' ? (
                                                <BotsPanel onClose={() => setActiveCategory('all')} />
                                            )
                                            : activeCategory === 'profile_edit' ? <ProfileEditor onClose={() => setActiveCategory('profile')} onSave={() => setActiveCategory('profile')} />
                                                : showSpecialistDashboard ? (
                                                    <div className="w-full h-full animate-in fade-in zoom-in-95 duration-500">
                                                        <SpecialistDashboard
                                                            user={currentUser}
                                                            sessionId={
                                                                consultPanelNoChatRequired
                                                                    ? selectedChat?.type === 'private' && selectedChat?.id
                                                                        ? String(selectedChat.id)
                                                                        : consultLobbySessionId
                                                                    : selectedChat?.id || 'demo-session-id'
                                                            }
                                                            socket={socket}
                                                            onBack={() => setIsExpertMode(false)}
                                                            onConsultSessionChat={(chatId) => {
                                                                const id = String(chatId);
                                                                void prefetchChatMessagesCache(id);
                                                                const found = chats.find((c: any) => String(c.id) === id);
                                                                if (found) {
                                                                    setSelectedChat(found);
                                                                    setShowRightPanel(false);
                                                                    return;
                                                                }
                                                                setSelectedChat({
                                                                    id,
                                                                    name: 'Mijoz',
                                                                    type: 'private',
                                                                    message: '',
                                                                    time: '',
                                                                    unread: 0,
                                                                    avatar: null,
                                                                    status: 'offline',
                                                                });
                                                                setShowRightPanel(false);
                                                            }}
                                                            onConsultClientEnded={(chatId) => {
                                                                if (selectedChat && String(selectedChat.id) === String(chatId)) {
                                                                    setSelectedChat(null);
                                                                    setShowRightPanel(false);
                                                                }
                                                                fetchChats(true);
                                                            }}
                                                        />
                                                    </div>
                                                ) : loading ? (
                                                    <div className="hidden lg:flex flex-1 h-full items-center justify-center flex-col gap-4 lg:glass-premium lg:rounded-3xl lg:border lg:border-white/10">
                                                        <div className="w-full max-w-md space-y-3 px-6">
                                                            <div className="h-4 w-32 rounded-full bg-white/5 animate-pulse" />
                                                            <div className="h-32 rounded-2xl bg-white/5 animate-pulse" />
                                                            <div className="h-10 rounded-full bg-white/5 animate-pulse" />
                                                        </div>
                                                    </div>
                                                ) : selectedChat ? (
                                                    hideMainUnderChatInfo && isMobile ? null : (
                                                        <ChatCarouselPanel
                                                            chat={selectedChat}
                                                            chats={chats}
                                                            onToggleInfo={() => setShowRightPanel(!showRightPanel)}
                                                            onBack={() => setSelectedChat(null)}
                                                            onMarkAsRead={handleMarkAsRead}
                                                        />
                                                    )
                                                ) : (
                                                    <div className="hidden lg:flex flex-1 h-full items-center justify-center text-white/20 flex-col gap-4 lg:glass-premium lg:rounded-3xl lg:border lg:border-white/10">
                                                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                                                            <MessageSquare className="h-10 w-10 opacity-20" />
                                                        </div>
                                                        <p className="text-sm font-medium">
                                                            Suhbatni boshlash uchun kontakt tanlang yoki yangi kontakt qo&apos;shing.
                                                        </p>
                                                        <button
                                                            onClick={() => setShowContactsModal(true)}
                                                            className="mt-1 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
                                                        >
                                                            Kontaktlar oynasini ochish
                                                        </button>
                                                    </div>
                                                )}
                </main>

                {/* Mobile Bottom Navigation - V3 Pro Style, hidden when chat is open */}
                {!showDetail && (
                    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[50] glass-premium border-t border-white/10 flex items-center justify-around px-2 pt-1.5 min-h-[72px] pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
                        {[
                            { id: 'all', label: 'Chatlar', icon: <MessageSquare className="h-6 w-6" /> },
                            { id: 'wallet', label: 'Hamyon', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
                            { id: 'services', label: 'Xizmatlar', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                            { id: 'settings', label: 'Profil', icon: <User className="h-6 w-6" /> }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveCategory(tab.id);
                                    // "Chatlar" — aktiv suhbatni saqlab qolish; boshqa bo'limlar alohida ekran
                                    if (tab.id !== 'all') setSelectedChat(null);
                                }}
                                className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-all duration-300 ${activeCategory === tab.id && !selectedChat ? 'text-blue-500 scale-110' : 'text-white/40'}`}
                            >
                                {tab.icon}
                                <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                )}

                {hideRightPanelForSpecialistDashboard
                    ? null
                    : (
                        <>
                            {/* Services: to'lov/shartlar panelini faqat desktopda ko'rsatamiz (2-rasmda ekspert profil to'liq bo'lsin) */}
                            {showRightPanel && activeCategory === 'services' && selectedExpertInView ? (
                                <aside className="hidden lg:flex fixed lg:relative inset-0 lg:inset-auto z-[110] lg:z-0 xl:flex w-80 h-full min-h-0 flex-shrink-0 flex-col overflow-hidden animate-slide-left">
                                    <ExpertActionsPanel
                                        expert={selectedExpertInView}
                                        onClose={() => setShowRightPanel(false)}
                                    />
                                </aside>
                            ) : null}

                            {/* Chat info: mobil’da ochilish/yopilish — karusel bilan bir xil transform (420ms); unmount emas → qayta fetch kamayadi */}
                            {selectedChat ? (
                                <aside
                                    aria-hidden={!showRightPanel}
                                    className={[
                                        'fixed lg:relative inset-0 lg:inset-auto z-[200] lg:z-0 h-full min-h-0 w-80 flex-shrink-0 overflow-hidden isolate max-lg:bg-transparent max-lg:w-full',
                                        showRightPanel
                                            ? 'flex flex-col chat-info-panel-enter'
                                            : 'hidden',
                                    ].join(' ')}
                                >
                                    {selectedChat?.type === 'channel' ? (
                                        <ChannelInfoPanel chat={selectedChat} onClose={() => setShowRightPanel(false)} />
                                    ) : selectedChat?.type === 'private' ? (
                                        <UserInfoPanel chat={selectedChat} onClose={() => setShowRightPanel(false)} />
                                    ) : (
                                        <GroupInfoPanel
                                            chat={selectedChat}
                                            onClose={() => setShowRightPanel(false)}
                                            onDeleted={() => { fetchChats(); setSelectedChat(null); setShowRightPanel(false); }}
                                            onLeft={() => { fetchChats(); setSelectedChat(null); setShowRightPanel(false); }}
                                            onGroupUpdated={() => fetchChats()}
                                            onChatNotFound={() => { fetchChats(true); setSelectedChat(null); setShowRightPanel(false); }}
                                        />
                                    )}
                                </aside>
                            ) : null}
                        </>
                    )}
            </div>
        </div>
    );
}

export default function MessagesPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-[#0f1117]"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
            <MessagesPageContent />
        </Suspense>
    );
}
