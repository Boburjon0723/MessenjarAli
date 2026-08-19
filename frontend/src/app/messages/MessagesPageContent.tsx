"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import ChatList, { CHAT_FOLDER_IDS } from "@/components/chat/ChatList";
import ChatCarouselPanel from "@/components/chat/ChatCarouselPanel";
import ChatSongPlayerBar from "@/components/chat/ChatSongPlayerBar";
import ServicesList from "@/components/chat/ServicesList";
import ProfileViewer from "@/components/chat/ProfileViewer";
import ProfileEditor from "@/components/chat/ProfileEditor";
import WalletPanel from "@/components/chat/WalletPanel";
import ExpenseTracker from "@/components/chat/ExpenseTracker";
import CommunitiesList from "@/components/chat/CommunitiesList";
import JobsPanel from "@/components/jobs/JobsPanel";
import MyListingsPanel from "@/components/listings/MyListingsPanel";
import {
    buildExpertConsultIntro,
    buildJobApplyIntro,
    type MarketplaceContactPayload,
} from "@/lib/marketplace-chat";
import { getChatMetadata } from "@/lib/listing-chat";
import BotsPanel from "@/components/chat/BotsPanel";
import AddContactModal from "@/components/chat/AddContactModal";
import CreateGroupModal from "@/components/chat/CreateGroupModal";
import CreateChannelModal from "@/components/chat/CreateChannelModal";
import ContactsModal from "@/components/chat/ContactsModal";
import { useSocket } from "@/context/SocketContext";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationPopover from "@/components/chat/NotificationPopover";
import MessagesMenuDrawer from "./MessagesMenuDrawer";
import MessagesRightPanels from "./MessagesRightPanels";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import SpecialistDashboard from "@/components/dashboard/SpecialistDashboard";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import RoomAccessGate from "@/components/dashboard/RoomAccessGate";
import {
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
    Bot,
    ArrowLeft,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useLanguage } from "@/context/LanguageContext";
import { TranslationKeys } from "@/lib/translations";
import { parseCreatedToMs, prefetchChatMessagesCache, resetAllLocalChatData, formatDialogClock } from "@/lib/chat-message-cache";
import { getPrivateChatPeerUserId } from "@/lib/private-chat-peer";
import { decryptListPreview } from "@/lib/e2e-chat";
import { E2E_PLACEHOLDER, isE2eEnvelope } from "@/lib/e2e-envelope";
import { getExpertPanelMode, parseStudentSessionStyle, type ExpertPanelMode } from "@/lib/expert-roles";
import { getToken, getUser, setUser, AUTH_USER_UPDATED_EVENT } from "@/lib/auth-storage";
import { logoutSession } from "@/lib/api";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DEFAULT_PLATFORM_BACKGROUND } from "@/lib/default-background";
import { alertIncomingChatMessage, getMessageChatId, promptMobileNotificationPermissionEarly } from "@/lib/message-alert";
import { hydratePrefsFromChats, isChatMuted, patchChatPref, setChatUnreadMarked, syncChatPrefToServer, migrateLocalPrefsToServer } from "@/lib/chat-list-prefs";


/** API ro'yxatida guruh hali ko'rinmasa ham ChatWindow ochilsin */

export function lessonGroupPlaceholder(id: string) {
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

export function MessagesPageContent() {
    const { socket, isConnected } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const { t } = useLanguage();

    // Core State
    const [activeCategory, setActiveCategory] = useState("all");
    const [jobsMarketTab, setJobsMarketTab] = useState<'listings' | 'experts'>('listings');
    const [jobsExpertId, setJobsExpertId] = useState<string | null>(null);
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
    const pathname = usePathname();
    const roomParam = searchParams.get('room');
    /** Guruhga qo'shilgandan keyin chatni ochish (?room= emas — RoomAccessGate ishlamasin) */
    const openChatParam = searchParams.get('openChat');
    /** E'lon / havola: mutaxassis kartasini ochish — /messages?expert=<userId> */
    const expertParam = searchParams.get('expert');
    const router = useRouter();
    const [roomGateState, setRoomGateState] = useState<'checking' | 'payment' | 'joined' | 'closed' | null>(roomParam ? 'checking' : null);

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
    const chatsRef = useRef<any[]>([]);
    const openingPeerRef = useRef<string | null>(null);
    useEffect(() => {
        selectedChatIdRef.current = selectedChat?.id != null ? String(selectedChat.id) : null;
    }, [selectedChat?.id]);
    useEffect(() => {
        chatsRef.current = chats;
    }, [chats]);

    /** Parallel fetchChats chaqiruqlarida eski javob yangi ro‘yxatni qayta yozmasin */
    const fetchChatsSeqRef = useRef(0);
    /** Ro‘yxatda chat topilmasa — cache bust bilan qayta yuklash (bir nechta xabar uchun bitta) */
    const chatListResyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const localChatResetPromptedRef = useRef(false);

    /** Mahalliy chat keshi + oflayn navbatni nol qilish: /messages?resetLocalChat=1 */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (searchParams.get('resetLocalChat') !== '1') return;
        if (localChatResetPromptedRef.current) return;
        localChatResetPromptedRef.current = true;
        const sp = new URLSearchParams(searchParams.toString());
        sp.delete('resetLocalChat');
        const qs = sp.toString();
        void router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        const ok = window.confirm(
            "Barcha mahalliy chat keshlari va oflayn yuborish navbati o‘chirilsinmi? (Serverdagi xabarlar o‘zgarmaydi.)"
        );
        if (!ok) return;
        void (async () => {
            await resetAllLocalChatData();
            setSelectedChat(null);
            showSuccess("Mahalliy chat ma’lumotlari tozalandi. Sahifa yangilanmoqda…");
            window.location.reload();
        })();
    }, [searchParams, pathname, router, showSuccess]);

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

    // ESC: modal/menyu/panel yopish (Telegram Web K)
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (showContactModal) { setShowContactModal(false); return; }
            if (showGroupModal) { setShowGroupModal(false); return; }
            if (showCreateChannelModal) { setShowCreateChannelModal(false); return; }
            if (showContactsModal) { setShowContactsModal(false); return; }
            if (showMenu) { setShowMenu(false); return; }
            if (showNotifications) { setShowNotifications(false); return; }
            if (showRightPanel) { setShowRightPanel(false); return; }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [showContactModal, showGroupModal, showCreateChannelModal, showContactsModal, showMenu, showNotifications, showRightPanel]);

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
        if (catId === 'services') {
            setJobsMarketTab('experts');
            setJobsExpertId(null);
            setActiveCategory('jobs');
            setSelectedChat(null);
            setShowRightPanel(false);
            return;
        }
        setActiveCategory(catId);
        if (!CHAT_FOLDER_IDS.has(catId)) {
            setSelectedChat(null);
        }
        if (catId === 'wallet') setIsExpertMode(false);
    }, []);

    // FETCH CHATS (refresh = true: backend cache dan o'tkazmaydi)
    const fetchChats = useCallback(async (refresh = false) => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            window.location.href = '/login';
            return;
        }
        const seq = ++fetchChatsSeqRef.current;
        try {
            await migrateLocalPrefsToServer();
            const url = refresh ? `/api/chats?refresh=1` : `/api/chats`;
            const res = await apiFetch(url);
            if (res.ok) {
                const data = await res.json();
                if (seq !== fetchChatsSeqRef.current) return;
                const mappedChats = await Promise.all(data.map(async (chat: any) => {
                    const chatId = chat.id || chat._id;
                    let message = chat.lastMessage || "No messages yet";
                    if (isE2eEnvelope(chat.lastMessageMeta) && chat.lastMessageCipher) {
                        message = await decryptListPreview(
                            chat.lastMessageCipher,
                            chat.lastMessageMeta,
                            E2E_PLACEHOLDER
                        );
                    }
                    return {
                        ...chat,
                        id: chatId,
                        name: chat.type === 'group' ? chat.name : (chat.otherUser?.name ? `${chat.otherUser.name} ${chat.otherUser.surname || ''}` : 'Unknown User'),
                        message,
                        time: chat.lastMessageAt ? formatDialogClock(new Date(chat.lastMessageAt).getTime()) : "",
                        unread: (String(chatId) === String(selectedChat?.id)) ? 0 : (chat.unread || 0),
                        avatar: chat.type === 'group' ? (chat.avatar_url ?? chat.avatar ?? null) : (chat.otherUser?.avatar || "use_initials"),
                        status: "offline",
                        type: chat.type || "private",
                        participantId: getPrivateChatPeerUserId({
                            ...chat,
                            type: chat.type || "private",
                        }) ?? chat.otherUser?.id,
                        pinned: !!chat.pinned,
                        muted: !!chat.muted,
                        archived: !!chat.archived,
                        unreadMarked: !!chat.unreadMarked,
                        pinnedAt: chat.pinnedAt ? new Date(chat.pinnedAt).getTime() : undefined,
                    };
                }));
                hydratePrefsFromChats(mappedChats);
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
        try {
            const res = await apiFetch(`/api/users/contacts`);
            if (res.ok) {
                const users = await res.json();
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
    const openChatFromNotification = useCallback(
        (chatId: string) => {
            setShowNotifications(false);
            const cid = String(chatId);
            const found = (chatsRef.current || []).find(
                (c: any) => String(c.id || c._id) === cid
            );
            if (found) {
                void prefetchChatMessagesCache(found.id);
                setSelectedChat(found);
                setActiveCategory('all');
                setShowRightPanel(false);
                setIsExpertMode(false);
                return;
            }
            router.push(`/messages?openChat=${encodeURIComponent(cid)}`);
            void fetchChats(true);
        },
        [router, fetchChats]
    );
    // HANDLERS
    const handleAddContact = async (user: MarketplaceContactPayload) => {
        const token = getToken();
        const peerId = String(user?.id || (user as any)?.userId || '');
        if (!token || !peerId) return;
        if (openingPeerRef.current === peerId) return;
        openingPeerRef.current = peerId;

        setShowContactModal(false);
        setShowContactsModal(false);
        setShowRightPanel(false);
        setActiveCategory('all');
        setIsExpertMode(false);

        const existing = (chatsRef.current || []).find((c: any) => {
            if (c?.type && c.type !== 'private') return false;
            const other = String(
                getPrivateChatPeerUserId(c) || c.participantId || c.otherUser?.id || ''
            );
            return other === peerId;
        });

        const fallbackName =
            `${user.name || ''} ${(user as any).surname || ''}`.trim() ||
            (user.username ? `@${user.username}` : '') ||
            (user as any).phone ||
            'Chat';

        const sendMarketplaceIntro = async (chatId: string, chatRow?: any) => {
            try {
                if (user.fromJobListing && user.jobIntent === 'apply') {
                    const snap =
                        getChatMetadata(chatRow)?.snapshot ||
                        (user.jobTitle ?
                            {
                                position: user.jobTitle,
                                company_name: user.jobCompany,
                                sub_type: 'employer',
                            }
                        :   null);
                    if (snap) {
                        const content = buildJobApplyIntro(snap as Record<string, any>, t);
                        await apiFetch(`/api/chats/${chatId}/messages`, {
                            method: 'POST',
                            body: JSON.stringify({ content, type: 'text' }),
                        });
                    }
                } else if (user.fromExpertListing && !existing) {
                    const content = buildExpertConsultIntro(
                        { profession: (user as any).profession, name: user.name },
                        t
                    );
                    await apiFetch(`/api/chats/${chatId}/messages`, {
                        method: 'POST',
                        body: JSON.stringify({ content, type: 'text' }),
                    });
                }
            } catch (e) {
                console.error('[marketplace] intro message', e);
            }
        };

        if (existing) {
            const existingId = existing.id || existing._id;
            if (existingId) {
                void prefetchChatMessagesCache(existingId);
                if (user.fromJobListing || user.fromExpertListing) {
                    try {
                        const res = await apiFetch(`/api/chats`, {
                            method: 'POST',
                            body: JSON.stringify({
                                participantId: peerId,
                                ...(user.fromExpertListing ? { fromExpertListing: true } : {}),
                                ...(user.fromJobListing && user.jobId ?
                                    {
                                        fromJobListing: true,
                                        jobId: user.jobId,
                                        jobIntent: user.jobIntent || 'chat',
                                    }
                                :   {}),
                            }),
                        });
                        if (res.ok) {
                            const enriched = await res.json();
                            await sendMarketplaceIntro(String(existingId), enriched);
                            void fetchChats(true);
                        }
                    } catch (e) {
                        console.error('[marketplace] update existing chat meta', e);
                    }
                }
            }
            setSelectedChat(existing);
            openingPeerRef.current = null;
            return;
        }

        try {
            const res = await apiFetch(`/api/chats`, {
                method: 'POST',
                body: JSON.stringify({
                    participantId: peerId,
                    ...(user.fromExpertListing ? { fromExpertListing: true } : {}),
                    ...(user.fromJobListing && user.jobId ?
                        {
                            fromJobListing: true,
                            jobId: user.jobId,
                            jobIntent: user.jobIntent || 'chat',
                        }
                    :   {}),
                }),
            });
            if (res.ok) {
                const enriched = await res.json();
                const chatId = enriched.id || enriched._id;
                const fullChat = {
                    ...enriched,
                    id: chatId,
                    name:
                        enriched.otherUser?.name ?
                            `${enriched.otherUser.name} ${enriched.otherUser.surname || ''}`.trim()
                        :   fallbackName,
                    message: t('no_messages'),
                    time: '',
                    unread: 0,
                    avatar: enriched.otherUser?.avatar || user.avatar || user.avatar_url || 'use_initials',
                    type: 'private',
                    participantId: enriched.otherUser?.id || peerId,
                };
                setChats((prev) => {
                    if (prev.some((c) => String(c.id || c._id) === String(chatId))) return prev;
                    return [fullChat, ...prev];
                });
                if (chatId) {
                    void prefetchChatMessagesCache(chatId);
                    await sendMarketplaceIntro(String(chatId), enriched);
                }
                setSelectedChat(fullChat);
                void fetchContacts();
                void fetchChats(true);
            }
        } catch (err) { console.error(err); }
        openingPeerRef.current = null;
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
                const newChat = await res.json();
                const id = newChat.id || newChat._id;
                const avatar = newChat.avatar_url ?? null;
                if (id) {
                    const mappedNew = {
                        ...newChat,
                        id,
                        creator_id: newChat.creator_id ?? newChat.creatorId ?? currentUser?.id,
                        name: newChat.name || data.name,
                        message: "No messages yet",
                        time: "",
                        unread: 0,
                        avatar,
                        avatar_url: avatar,
                        status: "offline",
                        type: "channel",
                        participantId: undefined,
                    };
                    setChats(prev => [mappedNew, ...prev]);
                    void prefetchChatMessagesCache(id);
                    setSelectedChat(mappedNew);
                    setShowRightPanel(typeof window !== 'undefined' && window.innerWidth >= 1024);
                    setIsExpertMode(false);
                }
                await fetchChats(true);
                setActiveCategory('all');
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

    const applyListingConsentMetadata = useCallback((chatId: string, metadata: Record<string, unknown>) => {
        if (!chatId) return;
        setChats((prev) =>
            prev.map((c) => (String(c.id) === String(chatId) ? { ...c, metadata } : c))
        );
        setSelectedChat((prev: any) => {
            if (!prev || String(prev.id) !== String(chatId)) return prev;
            return { ...prev, metadata };
        });
    }, []);

    const handleChatMetadataUpdate = useCallback(
        (metadata: Record<string, unknown>) => {
            const chatId = selectedChatIdRef.current;
            if (!chatId) return;
            applyListingConsentMetadata(chatId, metadata);
        },
        [applyListingConsentMetadata]
    );

    const handleDeleteChatFromList = useCallback(async (chat: any) => {
        if (!chat?.id) return;
        const ok = await confirm({
            title: t('delete_chat') as TranslationKeys,
            description: t('confirm_delete_chat') as TranslationKeys,
            variant: 'danger',
            confirmLabel: t('delete') as TranslationKeys,
        });
        if (!ok) return;
        try {
            const res = await apiFetch(`/api/chats/${chat.id}`, { method: 'DELETE' });
            if (!res.ok) return;
            setChats(prev => prev.filter(c => String(c.id) !== String(chat.id)));
            if (selectedChat && String(selectedChat.id) === String(chat.id)) {
                setSelectedChat(null);
                setShowRightPanel(false);
                setIsExpertMode(false);
            }
        } catch (err) {
            console.error('Failed to delete chat from list:', err);
        }
    }, [confirm, t, selectedChat]);

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
                return nameMatch || userMatch;
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

    useEffect(() => {
        if (showContactsModal) void fetchContacts();
    }, [showContactsModal, fetchContacts]);

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
                if (isE2eEnvelope(message.metadata)) {
                    chat.message = E2E_PLACEHOLDER;
                    const cipher = String(message.content || '');
                    void decryptListPreview(cipher, message.metadata, E2E_PLACEHOLDER).then((plain) => {
                        setChats((cur) => {
                            const i = cur.findIndex((c) => String(c.id) === chatId);
                            if (i === -1) return cur;
                            const next = [...cur];
                            next[i] = { ...next[i], message: plain };
                            return next;
                        });
                    });
                } else {
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
                }
                const createdRaw = message.created_at ?? message.createdAt ?? message.timestamp;
                const createdMs = parseCreatedToMs(createdRaw);
                if (createdMs != null) {
                    const createdIso = new Date(createdMs).toISOString();
                    chat.time = formatDialogClock(createdMs);
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

                    if (!isChatMuted(chatId)) {
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

        const handleListingConsentUpdated = (data: {
            chatId?: string;
            metadata?: Record<string, unknown>;
        }) => {
            if (!data?.chatId || !data.metadata) return;
            applyListingConsentMetadata(String(data.chatId), data.metadata);
        };

        socket.on('profile_updated', handleProfileUpdate);
        socket.on('receive_message', handleReceiveMessage);
        socket.on('chat_updated', handleChatUpdated);
        socket.on('listing_consent_updated', handleListingConsentUpdated);
        socket.on('chat_prefs_updated', (data: {
            chatId?: string;
            pinned?: boolean;
            muted?: boolean;
            archived?: boolean;
            unreadMarked?: boolean;
            pinnedAt?: number | null;
        }) => {
            if (!data?.chatId) return;
            patchChatPref(data.chatId, {
                pinned: !!data.pinned,
                muted: !!data.muted,
                archived: !!data.archived,
                unreadMarked: !!data.unreadMarked,
                pinnedAt: data.pinnedAt || undefined,
            });
        });

        const handleReconnect = () => {
            fetchChats(true);
            fetchContacts();
        };
        window.addEventListener('socket_reconnected', handleReconnect);

        return () => {
            socket.off('profile_updated', handleProfileUpdate);
            socket.off('receive_message', handleReceiveMessage);
            socket.off('chat_updated', handleChatUpdated);
            socket.off('listing_consent_updated', handleListingConsentUpdated);
            socket.off('chat_prefs_updated');
            window.removeEventListener('socket_reconnected', handleReconnect);
            if (chatListResyncTimerRef.current) {
                clearTimeout(chatListResyncTimerRef.current);
                chatListResyncTimerRef.current = null;
            }
        };
    }, [socket, fetchChats, fetchContacts, applyListingConsentMetadata]);

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
                const isPrivateRoom = room.type === 'private';

                if (isPrivateRoom) {
                    const accessRes = await apiFetch(
                        `/api/chats/${encodeURIComponent(roomParam)}/panel-access`
                    );
                    if (cancelled) return;
                    if (!accessRes.ok) {
                        setRoomGateState('closed');
                        setLoading(false);
                        router.replace('/messages');
                        return;
                    }
                    const access = await accessRes.json();
                    if (!access?.allowed) {
                        showError(t('panel_room_closed') as string);
                        setRoomGateState('closed');
                        setLoading(false);
                        router.replace('/messages');
                        return;
                    }
                } else {
                    if (creatorId) {
                        const subRes = await apiFetch(
                            `/api/wallet/subscription-status?mentorId=${encodeURIComponent(creatorId)}`
                        );
                        if (cancelled) return;
                        const subData = await subRes.json();
                        if (!subData?.active) {
                            setRoomGateState('payment');
                            return;
                        }
                    }
                    const joinRes = await apiFetch(
                        `/api/chats/${roomParam}/join-with-subscription`,
                        { method: 'POST' }
                    );
                    if (cancelled) return;
                    if (!joinRes.ok) {
                        setRoomGateState('payment');
                        return;
                    }
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
                            time: chat.lastMessageAt ? formatDialogClock(new Date(chat.lastMessageAt).getTime()) : "",
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
                    } else if (isPrivateRoom) {
                        setStudentLiveRoomId(String(roomParam));
                        setStudentSessionStyle(parseStudentSessionStyle(searchParams.get('style')));
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
    }, [roomParam, currentUser?.id, router, searchParams, showError, t]);

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
                setJobsMarketTab('experts');
                setJobsExpertId(String(profile.id || expertParam));
                setActiveCategory('jobs');
                setShowRightPanel(false);
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

    const isPanelCategory = ['jobs', 'listings', 'services', 'finance', 'communities', 'wallet', 'profile', 'settings', 'profile_edit', 'bots'].includes(activeCategory);
    /** Konsultant/ustoz paneli chat tanlamasdan: main oynasi mobilda ham ko'rinsin */
    const showDetail =
        !!selectedChat ||
        isPanelCategory ||
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
        CHAT_FOLDER_IDS.has(activeCategory) &&
        showRightPanel &&
        !!selectedChat &&
        !hideRightPanelForSpecialistDashboard;

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
    if (roomParam && roomGateState === 'closed') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1116] text-white gap-4 p-6">
                <p className="text-white/80 text-center">{t('panel_room_closed')}</p>
                <p className="text-sm text-white/50 text-center max-w-sm">{t('invite_expired_hint')}</p>
                <button
                    type="button"
                    onClick={() => { window.location.href = '/messages'; }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold"
                >
                    {t('back')}
                </button>
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
        <div className="fixed inset-0 flex flex-col tg-chat-wallpaper animate-fade-in">
            <ChatSongPlayerBar />
            <div className="w-full min-w-0 flex-1 min-h-0 flex flex-col lg:flex-row relative z-10 overflow-hidden">

                {showMenu && (
                    <MessagesMenuDrawer
                        t={t}
                        currentUser={currentUser}
                        isExpertMode={isExpertMode}
                        onClose={() => setShowMenu(false)}
                        onOpenProfile={() => { setShowMenu(false); setActiveCategory('profile'); }}
                        onOpenWallet={() => { setShowMenu(false); router.push('/wallet'); }}
                        onOpenExperts={() => {
                            setShowMenu(false);
                            setShowRightPanel(false);
                            setJobsMarketTab('experts');
                            setJobsExpertId(null);
                            setActiveCategory('jobs');
                        }}
                        onOpenJobs={() => {
                            setShowMenu(false);
                            setShowRightPanel(false);
                            setJobsMarketTab('listings');
                            setJobsExpertId(null);
                            setActiveCategory('jobs');
                        }}
                        onOpenFinance={() => { setShowMenu(false); setActiveCategory('finance'); }}
                        onOpenListings={() => { setShowMenu(false); setActiveCategory('listings'); }}
                        onToggleExpertPanel={() => { setShowMenu(false); handleToggleExpertPanel(); }}
                        onSupport={() => { setShowMenu(false); handleSupport(); }}
                        onCreateGroup={() => { setShowMenu(false); setShowGroupModal(true); }}
                        onCreateChannel={() => { setShowMenu(false); setShowCreateChannelModal(true); }}
                        onOpenContacts={() => { setShowMenu(false); setShowContactsModal(true); }}
                        onOpenSettings={() => { setShowMenu(false); setActiveCategory('settings'); }}
                    />
                )}

                {showNotifications && (
                    <NotificationPopover
                        onClose={() => setShowNotifications(false)}
                        onOpenChat={openChatFromNotification}
                    />
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

                {/* Left Panel: ChatList */}
                <aside className={` ${showDetail && activeCategory !== 'jobs' ? 'hidden lg:flex' : activeCategory === 'jobs' ? 'hidden' : 'flex'} ${isExpertMode || activeCategory === 'jobs' ? 'lg:w-0 lg:p-0 lg:m-0 lg:rounded-none lg:shadow-none w-0 p-0 opacity-0 pointer-events-none absolute lg:relative z-0' : 'lg:w-[420px] w-full opacity-100 relative z-10 lg:rounded-[24px] lg:shadow-[0_0_4px_0_rgba(0,0,0,0.24)]'} transition-all duration-300 ease-in-out lg:h-full flex-1 min-h-0 lg:flex-none lg:min-h-0 min-w-0 flex-col overflow-hidden bg-[#212121]`}>
                    <ChatList
                        activeCategory={activeCategory}
                        onCategoryChange={handleCategoryNavChange}
                        onChatSelect={(chat) => {
                            if (chat?.id != null) {
                                void prefetchChatMessagesCache(chat.id);
                                setChatUnreadMarked(chat.id, false);
                                void syncChatPrefToServer(chat.id, { unreadMarked: false });
                            }
                            setSelectedChat(chat);
                            if (!CHAT_FOLDER_IDS.has(activeCategory)) setActiveCategory('all');
                            /** Har doim avval chat; info faqat headerdan */
                            setShowRightPanel(false);
                            // Guruhga kirganda mentor paneli avtomatik ochilmasin — faqat Layout (ekspert) tugmasi
                            setIsExpertMode(false);
                        }}
                        hideHeader={false}
                        hideCategories={false}
                        selectedChatId={selectedChat?.id ?? selectedChat?._id ?? null}
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
                        onDeleteChat={handleDeleteChatFromList}
                        onMarkAsRead={handleMarkAsRead}
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
                            setJobsMarketTab('experts');
                            setJobsExpertId(exp?.id ? String(exp.id) : null);
                            setActiveCategory('jobs');
                            setShowRightPanel(false);
                        }}
                    />
                    <ContactsModal
                        open={showContactsModal}
                        contacts={contacts}
                        chats={chats}
                        onClose={() => setShowContactsModal(false)}
                        onStartChat={handleAddContact}
                        onAddContact={() => setShowContactModal(true)}
                        onDeleteContact={handleDeleteContact}
                    />
                </aside>

                <main
                    className={
                        hideMainUnderChatInfo
                            ? 'hidden lg:flex lg:flex-col flex-1 min-h-0 h-full min-w-0 relative overflow-hidden w-full'
                            : `${!showDetail ? 'hidden lg:flex lg:flex-col' : 'flex flex-col w-full'} flex-1 min-h-0 h-full min-w-0 relative overflow-hidden`
                    }
                >
                    {activeCategory === 'jobs' ? (
                        <JobsPanel
                            key={`jobs-${jobsMarketTab}-${jobsExpertId || 'none'}`}
                            initialMarketTab={jobsMarketTab}
                            initialExpertId={jobsExpertId}
                            onBack={() => {
                                setActiveCategory('all');
                                setJobsExpertId(null);
                            }}
                            onStartChat={handleAddContact}
                        />
                    )
                        : activeCategory === 'listings' ? (
                            <MyListingsPanel
                                currentUser={currentUser}
                                chats={chats}
                                onBack={() => setActiveCategory('all')}
                                onOpenChat={(chat) => {
                                    setSelectedChat(chat);
                                    setActiveCategory('all');
                                    setShowRightPanel(false);
                                    setIsExpertMode(false);
                                }}
                                onOpenJobsMarket={() => {
                                    setJobsMarketTab('listings');
                                    setActiveCategory('jobs');
                                }}
                                onOpenProfile={() => setActiveCategory('profile')}
                            />
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
                                            setJobsMarketTab('experts');
                                            setActiveCategory('jobs');
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
                                                    void logoutSession().then(() => {
                                                        window.location.href = '/login';
                                                    });
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
                                                    <div className="hidden lg:flex flex-1 min-h-0 h-full w-full items-center justify-center flex-col gap-4">
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
                                                            onChatMetadataUpdate={handleChatMetadataUpdate}
                                                            chatBgImage={bgImage}
                                                            chatBgImageBlur={bgImageBlur}
                                                        />
                                                    )
                                                ) : null}
                </main>

                {!hideRightPanelForSpecialistDashboard && activeCategory !== 'jobs' && (
                    <MessagesRightPanels
                        showRightPanel={showRightPanel}
                        activeCategory={activeCategory}
                        selectedExpertInView={selectedExpertInView}
                        selectedChat={selectedChat}
                        onCloseRightPanel={() => setShowRightPanel(false)}
                        onChatDeleted={() => { fetchChats(); setSelectedChat(null); setShowRightPanel(false); }}
                        onChatLeft={() => { fetchChats(); setSelectedChat(null); setShowRightPanel(false); }}
                        onGroupUpdated={() => fetchChats()}
                        onChatNotFound={() => { fetchChats(true); setSelectedChat(null); setShowRightPanel(false); }}
                    />
                )}
            </div>
        </div>
    );
}

export default MessagesPageContent;

