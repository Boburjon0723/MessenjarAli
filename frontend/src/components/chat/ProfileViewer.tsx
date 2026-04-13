import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useSocket } from '@/context/SocketContext';
import { useLanguage } from '@/context/LanguageContext';
import { getUser, setUser } from '@/lib/auth-storage';
import {
    getExpertFormPlaceholders,
    getExpertPanelMode,
    isLegalProfession,
    isMentorProfession,
} from '@/lib/expert-roles';
import { CHAT_BACKGROUND_PRESETS } from '@/lib/wallpapers';
import {
    User,
    Bell,
    Lock,
    MessageSquare,
    Folder,
    Sliders,
    Volume2,
    Zap,
    Languages,
    Monitor,
    Search,
    MoreVertical,
    X,
    Grid,
    Camera,
    AtSign,
    Phone,
    Calendar,
    Award,
    Briefcase,
    Clock,
    DollarSign,
    Heart,
    FileText,
    Moon,
    CheckCircle,
    Shield,
    UserCheck,
    Plus
} from 'lucide-react';

interface ProfileViewerProps {
    onClose: () => void;
    onEdit: () => void;
    onLogout: () => void;
    user?: any;
    mode?: 'profile' | 'settings';
    bgSettings?: { blur: number; imageBlur?: number; image: string; isDark?: boolean; rgb?: { r: number, g: number, b: number } };
    onUpdateBgBlur?: (val: number) => void;
    onUpdateBgImageBlur?: (val: number) => void;
    onUpdateBgImage?: (url: string) => void;
    onUpdateBgRGB?: (rgb: { r: number, g: number, b: number }) => void;
    onUpdateTheme?: (dark: boolean) => void;
}

export default function ProfileViewer({
    onClose,
    onEdit,
    onLogout,
    user: propUser,
    mode = 'settings',
    bgSettings,
    onUpdateBgBlur,
    onUpdateBgImageBlur,
    onUpdateBgImage,
    onUpdateBgRGB,
    onUpdateTheme
}: ProfileViewerProps) {
    const { socket } = useSocket();
    const [localUser, setLocalUser] = useState<any>(null);
    const [currentView, setCurrentView] = useState<'main' | 'chat_settings' | 'wallet'>('main');

    // Wallet State
    const [walletData, setWalletData] = useState({ available: 0, locked: 0, subscription_end_date: null as string | null });
    const [isSubscribing, setIsSubscribing] = useState(false);

    const { language, setLanguage, t } = useLanguage();
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    // Profile Edit States
    const [bio, setBio] = useState("");
    const [birthday, setBirthday] = useState("");
    const [showNameModal, setShowNameModal] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showExpertModal, setShowExpertModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    /** Guruh profilidagi kabi: fayl tanlanishi bilan yuklash + serverga yozish */
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    /** Telegram uslubi: rasmni kattalashtirib ko‘rish */
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

    // Expert States
    const [isExpert, setIsExpert] = useState(false);
    const [verifiedStatus, setVerifiedStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
    const [profession, setProfession] = useState("");
    const [specializationDetails, setSpecializationDetails] = useState("");
    const [experience, setExperience] = useState(0);
    const [hasDiploma, setHasDiploma] = useState(false);
    const [institution, setInstitution] = useState("");
    const [currentWorkplace, setCurrentWorkplace] = useState("");
    const [diplomaUrl, setDiplomaUrl] = useState("");
    const [certificateUrl, setCertificateUrl] = useState("");
    const [idUrl, setIdUrl] = useState("");
    const [selfieUrl, setSelfieUrl] = useState("");
    const [price, setPrice] = useState(0);
    const [currency, setCurrency] = useState("MALI");
    const [serviceLanguages, setServiceLanguages] = useState("");
    const [serviceFormat, setServiceFormat] = useState("");
    /** soatlik | bir seans (konsultatsiya) — backend `pricing_model` */
    const [pricingModel, setPricingModel] = useState<'hourly' | 'session'>('hourly');
    const [bioExpert, setBioExpert] = useState("");
    const [specialtyDesc, setSpecialtyDesc] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [anketaUrl, setAnketaUrl] = useState("");

    // Refs for focusing missing fields
    const professionRef = useRef<HTMLSelectElement | null>(null);
    const specializationRef = useRef<HTMLInputElement | null>(null);
    const experienceRef = useRef<HTMLInputElement | null>(null);
    const priceRef = useRef<HTMLInputElement | null>(null);

    // Field-level error states for visual validation
    const [expertErrors, setExpertErrors] = useState<{
        profession?: string;
        specialization?: string;
        experience?: string;
        price?: string;
        selfie?: string;
        resume?: string;
        anketa?: string;
        groups?: string;
    }>({});
    const [servicesJson, setServicesJson] = useState<any[]>([]);
    const [expertGroups, setExpertGroups] = useState<{ id: string, name: string, time: string, chatId?: string }[]>([]);
    const [availableGroups, setAvailableGroups] = useState<{ id: string, name: string, time: string, chatId?: string }[]>([]);
    const [availableGroupsLoading, setAvailableGroupsLoading] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [expertFee] = useState(0);

    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    /** Prop va localStorage profilni yuklaganda eski `localUser`ni bekor qilmaslik */
    const viewedUserIdRef = useRef<string | null>(null);
    const diplomaRef = useRef<HTMLInputElement>(null);
    const certRef = useRef<HTMLInputElement>(null);
    const idRef = useRef<HTMLInputElement>(null);
    const selfieRef = useRef<HTMLInputElement>(null);
    const resumeRef = useRef<HTMLInputElement>(null);
    const anketaRef = useRef<HTMLInputElement>(null);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

    const applyUserProfileToState = useCallback((userToProcess: any) => {
        if (!userToProcess) return;
        setLocalUser(userToProcess);
        setBio(userToProcess.bio || "");

        if (userToProcess.birthday) {
            const d = new Date(userToProcess.birthday);
            if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setBirthday(`${y}-${m}-${day}`);
            }
        } else {
            setBirthday("");
        }

        setVerifiedStatus(userToProcess.verified_status || 'none');
        setIsExpert(
            Boolean(
                userToProcess.is_expert ||
                    userToProcess.verified_status === 'pending'
            )
        );
        setProfession(userToProcess.profession || "");
        setSpecializationDetails(
            userToProcess.specialization_details ||
                userToProcess.specialization ||
                ""
        );
        const expRaw = userToProcess.experience_years;
        setExperience(
            typeof expRaw === 'number'
                ? expRaw
                : parseInt(String(expRaw ?? '0'), 10) || 0
        );
        setHasDiploma(userToProcess.has_diploma || false);
        setInstitution(userToProcess.institution || "");
        setCurrentWorkplace(userToProcess.current_workplace || "");
        setDiplomaUrl(userToProcess.diploma_url || "");
        setCertificateUrl(userToProcess.certificate_url || "");
        setIdUrl(userToProcess.id_url || "");
        setSelfieUrl(userToProcess.selfie_url || "");
        const rawPrice = userToProcess.hourly_rate ?? userToProcess.service_price ?? 0;
        setPrice(parseFloat(String(rawPrice)) || 0);
        setCurrency(userToProcess.currency || "MALI");
        setServiceLanguages(userToProcess.service_languages || "");
        setServiceFormat(userToProcess.service_format || "");
        setPricingModel(userToProcess.pricing_model === 'session' ? 'session' : 'hourly');
        setBioExpert(userToProcess.bio_expert || "");
        {
            const spec = String(userToProcess.specialty_desc || "").trim();
            const leg = String(userToProcess.expert_proposal || "").trim();
            setSpecialtyDesc(spec || leg);
        }
        setResumeUrl(userToProcess.resume_url || "");
        setAnketaUrl(userToProcess.anketa_url || "");
        try {
            setServicesJson(
                userToProcess.services_json
                    ? typeof userToProcess.services_json === 'string'
                        ? JSON.parse(userToProcess.services_json)
                        : userToProcess.services_json
                    : []
            );
        } catch {
            setServicesJson([]);
        }

        try {
            setExpertGroups(
                userToProcess.expert_groups
                    ? typeof userToProcess.expert_groups === 'string'
                        ? JSON.parse(userToProcess.expert_groups)
                        : userToProcess.expert_groups
                    : []
            );
        } catch {
            setExpertGroups([]);
        }
    }, []);

    useEffect(() => {
        try {
            const stored = getUser();
            const userToProcess = propUser || stored || null;
            if (!userToProcess) return;
            const id = String(userToProcess.id ?? '');
            if (!id) return;
            if (viewedUserIdRef.current !== id) {
                viewedUserIdRef.current = id;
                applyUserProfileToState(userToProcess);
            }
        } catch (e) {
            console.error("Failed to load user profile", e);
        }
    }, [propUser, applyUserProfileToState]);

    /** localStorage / propUser da ekspert maydonlari bo‘lmasa ham, tahrirlash modali ochilganda serverdan to‘liq profil. */
    useEffect(() => {
        if (!showExpertModal) return;
        const ac = new AbortController();
        (async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${API_URL}/api/users/me`, {
                    signal: ac.signal,
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) return;
                const full = await res.json();
                if (ac.signal.aborted) return;
                applyUserProfileToState(full);
                const prev = getUser() || {};
                try {
                    setUser({ ...prev, ...full } as Record<string, unknown>);
                } catch (_) {
                    /* ignore quota */
                }
            } catch (e: any) {
                if (e?.name !== 'AbortError') console.error('Failed to refresh profile for expert form', e);
            }
        })();
        return () => ac.abort();
    }, [showExpertModal, applyUserProfileToState]);

    useEffect(() => {
        if (!socket) return;
        socket.on('profile_updated', (data: any) => {
            const oldUser = getUser() || {};
            const myId = String(oldUser.id ?? '');
            const incomingId = String(data?.userId ?? data?.id ?? '');
            if (myId && incomingId && incomingId !== myId) return;
            const newUser = { ...oldUser, ...data };
            if (newUser.avatar_url && !newUser.avatar) {
                (newUser as any).avatar = newUser.avatar_url;
            }
            setUser(newUser as Record<string, unknown>);
            setLocalUser(newUser);
        });
        socket.on('expert_status_updated', (data: { userId: string, status: string }) => {
            const oldUser = getUser() || {};
            if (oldUser.id === data.userId) {
                let nextIsExpert = !!oldUser.is_expert;
                if (data.status === 'pending') {
                    nextIsExpert = true;
                } else if (data.status === 'rejected' || data.status === 'none') {
                    nextIsExpert = false;
                } else if (data.status === 'approved') {
                    nextIsExpert = oldUser.is_expert !== false;
                }
                const newUser = {
                    ...oldUser,
                    verified_status: data.status,
                    is_expert: nextIsExpert
                };
                setUser(newUser as Record<string, unknown>);
                setLocalUser(newUser);
                setVerifiedStatus(data.status as any);
                setIsExpert(nextIsExpert);
            }
        });
        return () => {
            socket.off('profile_updated');
            socket.off('expert_status_updated');
        };
    }, [socket]);

    const user = useMemo(() => {
        const stored = getUser() || {};
        const p = propUser || {};
        const l = localUser || {};
        return { ...p, ...stored, ...l };
    }, [propUser, localUser]);

    const hasExpertProfileData = Boolean(
        (profession && String(profession).trim()) ||
            (specializationDetails && String(specializationDetails).trim()) ||
            experience > 0 ||
            price > 0 ||
            verifiedStatus === 'pending' ||
            verifiedStatus === 'approved'
    );
    const showExpertSummary = isExpert || hasExpertProfileData;

    const expertFormPricingHint = useMemo(() => {
        const mode = getExpertPanelMode({
            profession,
            specialty: specializationDetails,
            bio_expert: bioExpert,
            specialty_desc: specialtyDesc
        });
        const blocks: Record<string, { title: string; body: string }> = {
            mentor: {
                title: 'Mentor / ustoz',
                body: 'Odatda soatlik narx (masalan, 45–60 daqiqalik dars) qulay — mijoz vaqtni aniq biladi.'
            },
            legal: {
                title: 'Huquqshunos',
                body: 'Ko‘pincha bir murojaat, qisqa maslahat yoki ish paketi (seans) narxi beriladi.'
            },
            psychology: {
                title: 'Psixolog',
                body: '50–60 daqiqalik seans narxi odatiy. Soatlik ham mumkin — mijozga seans vaqtini oldindan yozing.'
            },
            consult: {
                title: 'Konsultant',
                body: 'Xizmat soat bilan bo‘lsa «Soatlik», tayyor uchrashuv/paket bo‘lsa «Seans» tanlang.'
            }
        };
        return blocks[mode] || blocks.consult;
    }, [profession, specializationDetails, bioExpert, specialtyDesc]);

    const expertFormPh = useMemo(() => {
        const mode = getExpertPanelMode({
            profession,
            specialty: specializationDetails,
            bio_expert: bioExpert,
            specialty_desc: specialtyDesc,
        });
        return getExpertFormPlaceholders(mode, t);
    }, [profession, specializationDetails, bioExpert, specialtyDesc, t]);
    const isLegalMode = useMemo(
        () => isLegalProfession(profession) || isLegalProfession(specializationDetails),
        [profession, specializationDetails]
    );

    useEffect(() => {
        // Huquqshunos uchun narx turi doim bir martalik seans/maslahat bo'ladi.
        if (isLegalMode && pricingModel !== 'session') {
            setPricingModel('session');
        }
    }, [isLegalMode, pricingModel]);

    // Load existing group chats for this expert to allow re-using them
    useEffect(() => {
        const loadExpertGroups = async () => {
            if (!user?.id) return;
            try {
                setAvailableGroupsLoading(true);
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${API_URL}/api/chats/expert/${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) return;
                const data = await res.json();
                setAvailableGroups(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Failed to load expert groups list:', e);
            } finally {
                setAvailableGroupsLoading(false);
            }
        };

        loadExpertGroups();
    }, [user?.id]);

    const calculateAge = (dob: string) => {
        if (!dob) return null;
        try {
            const birthDate = new Date(dob);
            if (isNaN(birthDate.getTime())) return null;
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age >= 0 ? age : null;
        } catch { return null; }
    };

    /** Hozirgi yosh va keyingi yil yoshi (profil ko'rsatish uchun) */
    const displayAge = (): { current: number; nextYear: number } | null => {
        if (birthday) {
            const a = calculateAge(birthday);
            if (a !== null) return { current: a, nextYear: a + 1 };
        }
        const a = user.age;
        if (typeof a === 'number' && a > 0 && a < 120) return { current: a, nextYear: a + 1 };
        return null;
    };

    const handleSaveLanguage = (lang: 'uz' | 'ru' | 'en') => {
        setLanguage(lang);
        setShowLanguageModal(false);
    };

    const handleSaveBio = (newBio: string) => {
        if (newBio !== user.bio) {
            if (socket) socket.emit('update_profile', { bio: newBio });
            const newUser = { ...user, bio: newBio };
            setLocalUser(newUser);
            setUser(newUser as Record<string, unknown>);
        }
    };

    const handleSaveBirthday = (val: string) => {
        if (val !== birthday) {
            setBirthday(val);
            if (socket) socket.emit('update_profile', { birthday: val });
            const newUser = { ...user, birthday: val };
            setLocalUser(newUser);
            setUser(newUser as Record<string, unknown>);
        }
    };

    const handleSaveName = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editFirstName,
                    surname: editLastName
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setToast({ type: 'error', message: (err as any).message || 'Saqlab bo‘lmadi' });
                return;
            }
            const merged = { ...user, name: editFirstName, surname: editLastName };
            setLocalUser(merged);
            try {
                setUser(merged as Record<string, unknown>);
            } catch {
                /* quota */
            }
            if (socket) socket.emit('update_profile', { name: editFirstName, surname: editLastName });
            setShowNameModal(false);
        } catch (e: any) {
            setToast({ type: 'error', message: e?.message || 'Tarmoq xatosi' });
        }
    };

    const handleSaveUsername = async () => {
        const clean = editUsername.trim().replace(/^@+/, '');
        if (!clean) {
            setToast({ type: 'warning', message: 'Username bo‘sh bo‘lmasin' });
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ username: clean })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setToast({ type: 'error', message: (err as any).message || 'Username band yoki xato' });
                return;
            }
            const merged = { ...user, username: clean };
            setLocalUser(merged);
            try {
                setUser(merged as Record<string, unknown>);
            } catch {
                /* quota */
            }
            if (socket) socket.emit('update_profile', { username: clean });
            setShowUsernameModal(false);
        } catch (e: any) {
            setToast({ type: 'error', message: e?.message || 'Tarmoq xatosi' });
        }
    };

    const handleSaveExpertData = async () => {
        setExpertErrors({});
        // Step-by-step required field checks with focus/scroll
        if (!profession) {
            setToast({ type: 'warning', message: "Kasb maydonini to'ldiring." });
            setExpertErrors(prev => ({ ...prev, profession: "Kasbni tanlash majburiy." }));
            professionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            professionRef.current?.focus();
            return;
        }

        if (!String(specializationDetails || '').trim()) {
            setToast({ type: 'warning', message: "Mutaxassislik yo'nalishini kiriting." });
            setExpertErrors(prev => ({
                ...prev,
                specialization: "Yo'nalish qisqacha ham bo'lsa majburiy (masalan: fuqarolik ishlari)."
            }));
            specializationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            specializationRef.current?.focus();
            return;
        }

        if (!experience || experience <= 0) {
            setToast({ type: 'warning', message: "Tajriba (yil) maydonini to'g'ri kiriting." });
            setExpertErrors(prev => ({ ...prev, experience: "Tajriba 0 dan katta bo'lishi kerak." }));
            experienceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            experienceRef.current?.focus();
            return;
        }

        if (!price || price <= 0) {
            setToast({
                type: 'warning',
                message:
                    pricingModel === 'session'
                        ? "Seans narxi maydonini to'g'ri kiriting."
                        : "Soatlik narx maydonini to'g'ri kiriting."
            });
            setExpertErrors(prev => ({ ...prev, price: "Narx 0 dan katta bo'lishi kerak." }));
            priceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            priceRef.current?.focus();
            return;
        }

        if (!resumeUrl) {
            setToast({ type: 'warning', message: "Rezyume (PDF) faylini yuklang." });
            setExpertErrors(prev => ({ ...prev, resume: "Rezyume (PDF) yuklash majburiy." }));
            resumeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        if (isMentorProfession(profession) && expertGroups.length === 0) {
            setToast({ type: 'warning', message: "Mentorlar uchun kamida bitta guruh qo'shish majburiy." });
            setExpertErrors(prev => ({ ...prev, groups: "Mentor uchun kamida bitta guruh qo'shing." }));
            return;
        }

        const token = localStorage.getItem('token');
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

        // Create actual chat groups for new expert groups
        const updatedGroups = [...expertGroups];
        let createdAny = false;
        for (let i = 0; i < updatedGroups.length; i++) {
            const grp = updatedGroups[i];
            if (!grp.chatId) {
                try {
                    const res = await fetch(`${apiUrl}/api/chats`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ type: 'group', name: grp.name, participants: [] })
                    });
                    if (res.ok) {
                        const newChat = await res.json();
                        updatedGroups[i].chatId = newChat.id || newChat._id;
                        createdAny = true;
                    } else {
                        const errData = await res.json();
                        console.error("[ProfileViewer] Failed to create chat group:", errData);
                    }
                } catch (err) {
                    console.error("[ProfileViewer] Error creating chat group:", err);
                }
            }
        }

        if (createdAny) {
            setExpertGroups(updatedGroups);
        }

        const payload = {
            is_expert: true,
            profession,
            specialization_details: specializationDetails,
            specialization: specializationDetails || profession,
            experience_years: experience,
            has_diploma: hasDiploma,
            institution,
            current_workplace: currentWorkplace,
            diploma_url: diplomaUrl,
            certificate_url: certificateUrl,
            id_url: idUrl,
            selfie_url: selfieUrl,
            hourly_rate: parseFloat(price as any) || 0,
            currency,
            service_languages: serviceLanguages,
            service_format: serviceFormat,
            specialty_desc: specialtyDesc,
            /** DB ikkala ustunda bir xil — e‘lon matni bitta maydondan */
            expert_proposal: String(specialtyDesc || "").trim(),
            bio_expert: bioExpert,
            resume_url: resumeUrl,
            anketa_url: anketaUrl,
            pricing_model: pricingModel,
            services_json: JSON.stringify(servicesJson),
            expert_groups: JSON.stringify(updatedGroups),
            expert_fee_total: expertFee
            // verified_status ni yubormaymiz – backend ma'lumot o'zgarmasa tasdiqni saqlaydi
        };
        const apiPayload = {
            name: user.name,
            surname: user.surname || '',
            username: user.username || '',
            ...payload
        };
        try {
            const res = await fetch(`${apiUrl}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(apiPayload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Saqlash muvaffaqiyatsiz');
            }
            // Backend qaysi holatni qaytganini bilish uchun profilni qayta olamiz
            const profileRes = await fetch(`${apiUrl}/api/users/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const updatedProfile = profileRes.ok ? await profileRes.json() : null;
            const newStatus = updatedProfile?.verified_status || 'pending';

            if (socket) socket.emit('update_profile', payload);
            const newUser = { ...user, ...payload, verified_status: newStatus };
            setLocalUser(newUser);
            setVerifiedStatus(newStatus);
            setIsExpert(true);
            setShowExpertModal(false);

            const userForStorage: any = { ...newUser };
            delete userForStorage.diploma_url;
            delete userForStorage.certificate_url;
            delete userForStorage.id_url;
            delete userForStorage.selfie_url;
            delete userForStorage.resume_url;
            delete userForStorage.anketa_url;
            try {
                setUser(userForStorage as Record<string, unknown>);
            } catch (e) {
                console.warn('localStorage user quota exceeded, skipping full save', e);
            }

            if (newStatus === 'approved') {
                setToast({
                    type: 'success',
                    message: "Profil yangilandi. Mutaxassis rejimi faollashtirildi.",
                });
            } else {
                setToast({
                    type: 'success',
                    message: "Ma'lumotlar yangilandi. O'zgartirishlar tasdiqlash uchun yuborildi. Admin tasdig'ini kuting.",
                });
            }
        } catch (e: any) {
            setToast({
                type: 'error',
                message: e?.message || "Server bilan aloqa xatosi. Qayta urinib ko'ring."
            });
        }
    };

    const handleDocumentUpload = (key: string, file: File) => {
        const maxBytes = 10 * 1024 * 1024;
        if (file.size > maxBytes) {
            setToast({ type: 'warning', message: "Fayl hajmi 10 MB dan oshmasin. Iltimos, siqilgan fayl yuklang." });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            if (key === 'diploma') setDiplomaUrl(base64);
            if (key === 'cert') setCertificateUrl(base64);
            if (key === 'id') setIdUrl(base64);
            if (key === 'selfie') setSelfieUrl(base64);
            if (key === 'resume') setResumeUrl(base64);
            if (key === 'anketa') setAnketaUrl(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarClick = () => {
        if (uploadingAvatar) return;
        fileInputRef.current?.click();
    };

    /** GroupInfoPanel dagi bilan bir xil: FormData → /api/media/upload → profilga URL */
    const handleProfileAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            e.target.value = '';
            return;
        }
        const maxBytes = 6 * 1024 * 1024;
        if (file.size > maxBytes) {
            setToast({ type: 'warning', message: 'Rasm hajmi 6 MB dan kichik bo‘lsin.' });
            e.target.value = '';
            return;
        }
        e.target.value = '';
        const token = localStorage.getItem('token');
        if (!token) {
            setToast({ type: 'error', message: 'Kirish kerak.' });
            return;
        }
        setUploadingAvatar(true);
        try {
            const { uploadFileWithProgress } = await import('@/lib/upload');
            const formData = new FormData();
            formData.append('files', file);
            const data = await uploadFileWithProgress('/api/media/upload', formData);
            const url =
                (data && (data.url ?? data.urls?.[0] ?? (data.files && data.files[0]?.url))) || null;
            if (!url || typeof url !== 'string') {
                throw new Error(
                    (typeof data?.message === 'string' && data.message) ||
                        (typeof data?.error === 'string' && data.error) ||
                        'Rasm URL olinmadi'
                );
            }
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ avatar_url: url }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || 'Profil rasmi yangilanmadi');
            }
            const base = { ...(propUser || {}), ...(getUser() || {}), ...(localUser || {}) };
            const merged = { ...base, avatar: url, avatar_url: url };
            setLocalUser(merged);
            try {
                setUser(merged as Record<string, unknown>);
            } catch {
                /* quota */
            }
            if (socket) socket.emit('update_profile', { avatar: url });
            setToast({ type: 'success', message: t('save_record') + ' ✓' });
        } catch (err: any) {
            console.error('Profile avatar upload:', err);
            setToast({
                type: 'error',
                message: err?.message || 'Rasm yuklanmadi.',
            });
        } finally {
            setUploadingAvatar(false);
        }
    };

    const profileAvatarUploadLabel =
        language === 'ru'
            ? 'Загрузить фото профиля'
            : language === 'en'
              ? 'Upload profile photo'
              : 'Profil rasmini yuklash';

    const fetchWallet = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}/api/wallet/balance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setWalletData({
                        available: data.data.available_balance || 0,
                        locked: data.data.locked_balance || 0,
                        subscription_end_date: user.subscription_end_date || null
                    });
                }
            }
        } catch (e) {
            console.error('Failed to fetch wallet', e);
        }
    };

    const handleSubscribe = async () => {
        setIsSubscribing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app'}/api/wallet/subscribe`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setToast({ type: 'success', message: "Mutaxassis obunasi muvaffaqiyatli faollashtirildi." });
                fetchWallet();
                setVerifiedStatus('pending');
                setIsExpert(true);
            } else {
                setToast({
                    type: 'error',
                    message: data.message || "Obuna bo'lishda xatolik yuz berdi. Balansingizni va internet aloqangizni tekshiring.",
                });
            }
        } catch (e) {
            setToast({
                type: 'error',
                message: "Tarmoq xatosi. Keyinroq yana urinib ko'ring.",
            });
        } finally {
            setIsSubscribing(false);
        }
    };

    const handleTurnOffExpert = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: user.name,
                    surname: user.surname || '',
                    username: user.username || '',
                    bio: user.bio,
                    birthday: user.birthday,
                    avatar_url: user.avatar_url || user.avatar,
                    is_expert: false,
                    profession: user.profession,
                    specialization: user.specialization_details || user.specialization,
                    experience_years: user.experience_years,
                    service_price: user.service_price,
                    hourly_rate: user.hourly_rate,
                    working_hours: user.working_hours,
                    languages: user.languages,
                    wiloyat: user.wiloyat,
                    tuman: user.tuman,
                    expert_groups: user.expert_groups
                })
            });
            if (res.ok) {
                setIsExpert(false);
                const updated = { ...user, is_expert: false };
                setLocalUser(updated);
                try { setUser(updated as Record<string, unknown>); } catch (_) {}
                setToast({ type: 'success', message: "Mutaxassis rejimi o'chirildi." });
                if (socket) socket.emit('update_profile', { is_expert: false });
            }
        } catch (e) {
            console.error('Turn off expert error:', e);
            setToast({ type: 'error', message: "Rejimni o'chirishda xatolik. Qayta urinib ko'ring." });
        }
    };

    const getAvatarUrl = (path: string) => {
        if (!path) return null;
        if (path.startsWith('http') || path.startsWith('data:')) return path;
        return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const profilePhotoDisplaySrc =
        getAvatarUrl(user.avatar || user.avatar_url) ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop';

    const openAvatarLightbox = () => {
        const url = getAvatarUrl(user.avatar || user.avatar_url);
        if (url) setAvatarPreviewUrl(url);
    };

    // Auto-hide toast after a short delay
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }, [toast]);

    useEffect(() => {
        if (!avatarPreviewUrl) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAvatarPreviewUrl(null);
        };
        window.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [avatarPreviewUrl]);

    // --- RENDERERS ---

    const renderProfile = () => (
        <div
            className={`w-full h-full lg:h-auto lg:max-w-[420px] flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:rounded-[24px] shadow-2xl animate-scale-up border border-white/30 text-white`}
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header with Big Image — bosish: katta ko‘rinish (Telegram); kamera: yangi rasm */}
            <div className="relative h-[220px] w-full overflow-hidden flex-shrink-0">
                <img
                    src={profilePhotoDisplaySrc}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover brightness-75 scale-105 transition-opacity pointer-events-none ${uploadingAvatar ? 'opacity-50' : ''}`}
                    key={String(user.avatar_url || user.avatar || 'av')}
                />
                {getAvatarUrl(user.avatar || user.avatar_url) && !uploadingAvatar && (
                    <button
                        type="button"
                        className="absolute inset-0 z-[5] w-full h-full cursor-zoom-in border-0 bg-transparent p-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            openAvatarLightbox();
                        }}
                        aria-label={
                            language === 'ru'
                                ? 'Открыть фото'
                                : language === 'en'
                                  ? 'View photo'
                                  : 'Rasmni kattalashtirish'
                        }
                    />
                )}
                {uploadingAvatar && (
                    <div className="absolute inset-0 z-[15] flex items-center justify-center bg-black/40">
                        <div className="h-10 w-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#121B22] via-transparent to-black/30 pointer-events-none" />

                <div
                    className="absolute top-0 inset-x-0 z-10 flex items-center justify-between gap-2 pb-2 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
                >
                    <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 p-2.5 min-h-[44px] min-w-[44px] rounded-full backdrop-blur-md transition-all border border-white/10 flex items-center justify-center gap-1 group shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 lg:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <X className="h-5 w-5 hidden lg:block" />
                    </button>
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => setShowLanguageModal(true)}
                            className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-2 text-white/80 backdrop-blur-md transition-all hover:text-white sm:px-3"
                        >
                            <Languages className="h-4 w-4 shrink-0" />
                            <span className="max-w-[2.75rem] truncate text-[11px] font-bold uppercase sm:max-w-none">{language}</span>
                        </button>
                        <button
                            type="button"
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/10 bg-white/10 p-2 text-white/80 backdrop-blur-md transition-all hover:text-white"
                        >
                            <MoreVertical className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-4 left-6 right-6 z-10 pointer-events-none">
                    <h2 className="text-white text-2xl font-bold leading-none">{user.name} {user.surname || ''}</h2>
                    <p className="text-[#00A884] text-[13px] font-medium mt-1">{t('online')}</p>
                </div>

                {!uploadingAvatar && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAvatarClick();
                        }}
                        className="absolute bottom-4 right-6 w-11 h-11 bg-accent-primary rounded-full flex items-center justify-center text-white shadow-xl hover:bg-blue-600 transition-all transform active:scale-95 z-20 touch-manipulation"
                    >
                        <Camera className="h-5 w-5" />
                    </button>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleProfileAvatarChange}
                />
            </div>

            {/* Guruh bilan bir xil: yuklashda havola yo‘q, `GroupInfoPanel` dagi klasslar */}
            {!uploadingAvatar && (
                <div className="flex justify-center px-4 pb-1 relative z-20">
                    <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="mt-2 text-sm text-blue-300 hover:text-blue-200 underline focus:outline-none touch-manipulation"
                    >
                        {profileAvatarUploadLabel}
                    </button>
                </div>
            )}

            {verifiedStatus === 'pending' && (
                <div className="mx-6 mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div className="flex flex-col">
                        <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider">{t('expert_status_pending')}</span>
                        <span className="text-white/40 text-[10px]">{t('expert_mode_desc')}</span>
                    </div>
                </div>
            )}

            <div className="overflow-y-auto custom-scrollbar flex-1 pb-8">
                {/* Info Items */}
                <div className="p-4 space-y-1">
                    <div className="flex items-center gap-6 px-4 py-3 hover:bg-white/5 rounded-[15px] cursor-default transition-colors group">
                        <Phone className="h-5 w-5 text-[#00A884]/80" />
                        <div className="flex flex-col">
                            <span className="text-white text-[15px]">{user.phone || '+998 -- --- -- --'}</span>
                            <span className="text-white/30 text-[12px]">{t('phone_label')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 px-4 py-3 hover:bg-white/5 rounded-[15px] cursor-pointer group transition-colors"
                        onClick={() => { setEditUsername(user.username || ""); setShowUsernameModal(true); }}>
                        <AtSign className="h-5 w-5 text-[#00A884]/80" />
                        <div className="flex flex-col">
                            <span className="text-white text-[15px]">@{user.username || 'username'}</span>
                            <span className="text-white/30 text-[12px]">{t('username')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 px-4 py-3 hover:bg-white/5 rounded-[15px] transition-colors relative group cursor-pointer"
                        onClick={() => setShowDatePicker(true)}
                    >
                        <AtSign className="h-5 w-5 text-[#00A884]/80 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col flex-1">
                            <span className="text-white text-[15px]">
                                {birthday ? new Date(birthday).toLocaleDateString(language === 'ru' ? 'ru-RU' : (language === 'en' ? 'en-US' : 'uz-UZ'), { day: 'numeric', month: 'long', year: 'numeric' }) : t('select')}
                                {displayAge() && (
                                    <>
                                        {' '}({displayAge()!.current} {t('years_old')})
                                    </>
                                )}
                            </span>
                            <span className="text-white/30 text-[12px]">{t('birthday')}</span>
                        </div>
                    </div>
                    {displayAge() && !birthday && (
                        <div className="flex items-center gap-6 px-4 py-3 hover:bg-white/5 rounded-[15px] cursor-default transition-colors">
                            <span className="text-[#00A884]/80 text-[15px] font-medium">{displayAge()!.current}</span>
                            <div className="flex flex-col flex-1">
                                <span className="text-white text-[15px]">
                                    {displayAge()!.current} {t('years_old')} • {t('next_year')} {displayAge()!.nextYear} {t('years_old')}
                                </span>
                                <span className="text-white/30 text-[12px]">{t('age_label')}</span>
                            </div>
                        </div>
                    )}

                </div>

                <div className="h-[1px] bg-white/5 mx-6"></div>

                {/* Expert Status */}
                <div className="p-6">
                    <div className={`p-5 rounded-[20px] border transition-all cursor-pointer ${showExpertSummary ? 'bg-accent-primary/10 border-accent-primary/30 shadow-lg shadow-accent-primary/5' : 'bg-white/5 border-white/10 hover:border-white/20'}`} onClick={() => setShowExpertModal(true)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Award className={`h-6 w-6 ${showExpertSummary ? 'text-[#00A884]' : 'text-white/20'}`} />
                                <div className="flex flex-col">
                                    <h4 className="text-white font-bold text-[16px]">{t('specialist_mode')}</h4>
                                    {verifiedStatus === 'approved' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />
                                            {t('activated')}
                                        </span>
                                    )}
                                    {verifiedStatus === 'pending' && (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-yellow-500 text-[10px] font-bold uppercase tracking-wider">{t('checking_status')}</span>
                                            <span className="text-white/40 text-[9px] font-bold uppercase tracking-tighter">{t('wait_admin_approval')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div
                                className={`w-[52px] h-[30px] rounded-full relative transition-all duration-300 cursor-pointer shrink-0 border-2 ${
                                    isExpert
                                        ? 'bg-[#00A884] border-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.35)]'
                                        : 'bg-white/15 border-white/30'
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextState = !isExpert;
                                    if (nextState) {
                                        setIsExpert(true);
                                        setShowExpertModal(true);
                                    } else {
                                        handleTurnOffExpert();
                                    }
                                }}
                                role="switch"
                                aria-checked={isExpert}
                            >
                                <div
                                    className={`absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow-md transition-all duration-300 ${
                                        isExpert ? 'left-[24px]' : 'left-[3px]'
                                    }`}
                                />
                            </div>
                        </div>
                        {showExpertSummary && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-white/30 text-[10px] uppercase font-bold block mb-1">{t('experience')}</span>
                                        <span className="text-white font-bold text-[14px]">{experience} {t('year')}</span>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-white/30 text-[10px] uppercase font-bold block mb-1">
                                            {pricingModel === 'session' ? `${t('price')} (${t('session')})` : `${t('price')} (${t('hourly')})`}
                                        </span>
                                        <span className="text-white font-bold text-[14px]">{price} {currency}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 px-1">
                                    <span className="text-white/30 text-[10px] uppercase font-bold">{t('specialization')}</span>
                                    <span className="text-white text-[13px] font-medium leading-tight">{profession || t('select')} - {specializationDetails || '...'}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setShowExpertModal(true); }} className="w-full py-3 bg-accent-primary/10 text-[#00A884] text-[13px] font-bold rounded-xl hover:bg-accent-primary/20 transition-all border border-accent-primary/10">{t('edit_profile')}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderChatSettings = () => (
        <GlassCard
            className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-2xl animate-scale-up lg:border-white/10 text-white`}
            style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-4 p-4 px-6 border-b border-white/10`}>
                <button onClick={() => setCurrentView('main')} className={`text-white/40 hover:text-white transition-colors p-1`}><X className="h-6 w-6 rotate-90" /></button>
                <h2 className="font-medium text-[19px]">Настройки чатов</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-8 pb-10">
                {/* PANEL AND BACKGROUND BLUR SLIDERS */}
                <div className="space-y-4">
                    <h4 className="text-accent-primary text-xs font-bold uppercase tracking-widest ml-1">{t('blur_settings')}</h4>
                    <div className="rounded-2xl p-5 space-y-6 border bg-white/5 border-white/10">
                        {/* Panel Blur Slider */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-white">{t('panel_blur')}</span>
                                <span className="text-white/60">{bgSettings?.blur || 0}px</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={bgSettings?.blur || 0}
                                onChange={(e) => onUpdateBgBlur?.(parseInt(e.target.value))}
                                className="w-full h-2 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none"
                            />
                        </div>

                        {/* Background Image Blur Slider */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                                <span className="text-white">{t('bg_blur')}</span>
                                <span className="text-white/60">{bgSettings?.imageBlur || 0}px</span>
                            </div>
                            <input
                                type="range" min="0" max="100" step="1"
                                value={bgSettings?.imageBlur || 0}
                                onChange={(e) => onUpdateBgImageBlur?.(parseInt(e.target.value))}
                                className="w-full h-2 bg-[#1a1f2e] rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>



                {/* WALLPAPER SELECTOR */}
                <div className="space-y-4">
                    <h4 className="text-accent-primary text-xs font-bold uppercase tracking-widest ml-1">{t('change_wallpaper')}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['custom_upload', ...CHAT_BACKGROUND_PRESETS].map((url, i) => (
                            <div key={i}
                                onClick={() => {
                                    if (url === 'custom_upload') {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (e) => {
                                            const file = (e.target as HTMLInputElement).files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => onUpdateBgImage?.(reader.result as string);
                                                reader.readAsDataURL(file);
                                            }
                                        };
                                        input.click();
                                    } else {
                                        onUpdateBgImage?.(url);
                                    }
                                }}
                                className={`aspect-video rounded-xl cursor-pointer border-2 transition-all hover:scale-105 active:scale-95 overflow-hidden flex flex-col items-center justify-center ${bgSettings?.image === url ? 'border-accent-primary shadow-lg shadow-accent-primary/20' : 'border-transparent bg-white/5'}`}>
                                {url === 'custom_upload' ? (
                                    <>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform bg-white/10">
                                            <Plus className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase text-white/40 group-hover:text-[#00A884]">{t('upload_custom')}</span>
                                    </>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                        {bgSettings?.image === url && (
                                            <div className="absolute inset-0 bg-accent-primary/20 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-accent-primary flex items-center justify-center text-white shadow-lg">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </GlassCard>
    );

    const renderWallet = () => (
        <GlassCard
            className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-2xl animate-scale-up lg:border-white/10 text-white`}
            style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-4 p-4 px-6 border-b border-white/10`}>
                <button onClick={() => setCurrentView('main')} className={`text-white/40 hover:text-white transition-colors p-1`}><X className="h-6 w-6 rotate-90" /></button>
                <h2 className="font-medium text-[19px]">{t('wallet')}</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6 pb-10">
                {/* Balance Cards */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex flex-col gap-1 text-center">
                        <span className="text-white/60 text-xs font-black uppercase tracking-widest">{t('available_balance')}</span>
                        <div className="flex items-center justify-center gap-2">
                            <DollarSign className="h-8 w-8 text-white" />
                            <span className="text-white font-black text-4xl">{walletData.available} <span className="text-lg opacity-60">MALI</span></span>
                        </div>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/5 rounded-xl text-yellow-500"><Lock className="h-5 w-5" /></div>
                        <div className="flex flex-col">
                            <span className="text-white font-bold">{t('escrow_reserved')}</span>
                            <span className="text-white/40 text-xs text-left">{t('escrow_reserved_desc')}</span>
                        </div>
                    </div>
                    <div className="text-yellow-500 font-black">{walletData.locked} MALI</div>
                </div>

                {/* Subscription Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-accent-primary/20 rounded-xl text-[#00A884]"><Award className="h-5 w-5" /></div>
                        <div className="flex flex-col h-full items-start justify-center">
                            <span className="text-white font-bold leading-none">{t('specialist_subscription')}</span>
                            <span className="text-[#00A884] font-black text-xs uppercase tracking-widest leading-none mt-1">{t('free_for_now')}</span>
                        </div>
                    </div>

                    <p className="text-white/40 text-[11.5px] leading-relaxed pb-2">
                        {t('subscription_desc')}
                    </p>

                    <GlassButton
                        onClick={handleSubscribe}
                        disabled={isSubscribing}
                        className={`w-full !rounded-xl py-3.5 font-bold transition-all ${isExpert && verifiedStatus !== 'none' ? '!bg-white/10 !text-white/40 cursor-not-allowed' : '!bg-emerald-600 !text-white'}`}
                    >
                        {isSubscribing ? t('loading') : (isExpert && verifiedStatus !== 'none' ? t('subscription_active') : t('enable_specialist_free'))}
                    </GlassButton>
                </div>

            </div>
        </GlassCard>
    );

    const renderSettings = () => {
        const SETTINGS_ITEMS = [
            { id: 'account', icon: <User className="h-5 w-5" />, label: t('profile'), subtext: t('edit_account_sub') },
            { id: 'wallet', icon: <DollarSign className="h-5 w-5 text-emerald-400" />, label: t('wallet'), subtext: t('wallet_sub') },
            // { id: 'privacy', icon: <Lock className="h-5 w-5" />, label: 'Конфиденциальность' },
            { id: 'chats', icon: <MessageSquare className="h-5 w-5" />, label: t('chat_settings'), subtext: t('chat_settings_sub') },
            // { id: 'folders', icon: <Folder className="h-5 w-5" />, label: 'Папки с чатами' },
            // { id: 'advanced', icon: <Sliders className="h-5 w-5" />, label: 'Продвинутые настройки' },
            // { id: 'call', icon: <Volume2 className="h-5 w-5" />, label: 'Звук и камера' },
            // { id: 'battery', icon: <Zap className="h-5 w-5" />, label: 'Заряд батареи и анимация' },
            ...(user.role === 'admin' ? [{ id: 'admin', icon: <Shield className="h-5 w-5 text-emerald-400" />, label: 'Admin Panel', subtext: t('admin_panel_sub') }] : []),
        ];

        return (
            <GlassCard
                className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-2xl animate-scale-up lg:border-white/10 text-white`}
                style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Sarlavha: mobil notch/status bar + tugmalar uchun xavfsiz joy */}
                <div
                    className={`flex min-h-[52px] items-center justify-between gap-2 border-b border-white/10 px-4 pb-3 sm:px-6`}
                    style={{
                        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
                        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
                        paddingRight: 'max(1rem, env(safe-area-inset-right))',
                    }}
                >
                    <h2 className="min-w-0 flex-1 truncate font-medium text-[17px] sm:text-[19px]">{t('settings')}</h2>
                    <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5 text-white/50">
                        <button
                            type="button"
                            onClick={() => setShowLanguageModal(true)}
                            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-xl bg-white/10 px-2 py-2 text-[11px] font-bold uppercase tracking-wide border border-white/10 hover:text-white transition-colors sm:min-h-0 sm:min-w-0 sm:px-2.5 sm:py-1.5 sm:text-[13px]"
                        >
                            <Languages className="h-[17px] w-[17px] shrink-0 sm:h-[18px] sm:w-[18px]" />
                            <span className="max-w-[2.5rem] truncate sm:max-w-none">{language}</span>
                        </button>
                        <button
                            type="button"
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                            aria-label="Search"
                        >
                            <Search className="h-[21px] w-[21px] sm:h-[22px] sm:w-[22px]" />
                        </button>
                        <button
                            type="button"
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                            aria-label="More"
                        >
                            <MoreVertical className="h-[21px] w-[21px] sm:h-[22px] sm:w-[22px]" />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                            aria-label={t('cancel')}
                        >
                            <X className="h-[21px] w-[21px] sm:h-[22px] sm:w-[22px]" />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pb-6">
                    {/* User Profile Section (Row style from screenshot) */}
                    <div className="px-6 py-5 flex items-center gap-5 group cursor-pointer hover:bg-white/5 transition-all"
                        onClick={() => { setEditFirstName(user.name || ""); setEditLastName(user.surname || ""); setShowNameModal(true); }}>
                        <div
                            role="button"
                            tabIndex={0}
                            className={`w-[64px] h-[64px] rounded-full overflow-hidden border-2 border-white/10 shadow-xl relative shrink-0 ${getAvatarUrl(user.avatar || user.avatar_url) ? 'cursor-zoom-in' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (getAvatarUrl(user.avatar || user.avatar_url)) openAvatarLightbox();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (getAvatarUrl(user.avatar || user.avatar_url)) openAvatarLightbox();
                                }
                            }}
                            aria-label={
                                language === 'ru'
                                    ? 'Открыть фото'
                                    : language === 'en'
                                      ? 'View photo'
                                      : 'Rasmni kattalashtirish'
                            }
                        >
                            <img
                                src={profilePhotoDisplaySrc}
                                alt=""
                                className="w-full h-full object-cover transition-transform group-hover:scale-110 pointer-events-none"
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-[18px] leading-tight group-hover:text-[#00A884] transition-colors">{user.name} {user.surname || ''}</h3>
                            <div className="flex flex-col mt-0.5 opacity-40">
                                <span className="text-[13px]">{user.phone || '+998 -- --- -- --'}</span>
                                <span className="text-[13px]">@{user.username || 'username'}</span>
                                {displayAge() && (
                                    <span className="text-[12px] mt-0.5 opacity-70">
                                        {displayAge()!.current} {t('years_old')} • {t('next_year')} {displayAge()!.nextYear} {t('years_old')}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button className="text-white/20 group-hover:text-white transition-all bg-white/5 p-2 rounded-xl active:scale-95"><Grid className="h-6 w-6" /></button>
                    </div>

                    <div className="h-[1px] bg-white/5 mx-6 mb-2"></div>

                    {/* Settings List */}
                    <div className="space-y-0.5 mt-2">
                        {SETTINGS_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                className="w-full flex items-center gap-5 px-6 py-3.5 hover:bg-white/5 transition-all group text-left"
                                onClick={() => {
                                    if (item.id === 'account') { setEditFirstName(user.name || ""); setEditLastName(user.surname || ""); setShowNameModal(true); }
                                    else if (item.id === 'wallet') {
                                        setCurrentView('wallet');
                                        fetchWallet();
                                    }
                                    else if (item.id === 'chats') { setCurrentView('chat_settings'); }
                                    else if (item.id === 'admin') { window.open('/AdminZero0723s', '_blank'); }
                                }}
                            >
                                <span className="text-white/30 group-hover:text-[#00A884] transition-colors">{item.icon}</span>
                                <div className="flex-1 flex flex-col justify-center">
                                    <span className="text-white/90 group-hover:text-white text-[15px] font-medium">{item.label}</span>
                                    {item.subtext && <span className="text-white/20 text-[12px] mt-0.5">{item.subtext}</span>}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="px-6 mt-8">
                        <button onClick={onLogout} className="w-full py-4 text-red-500/80 font-bold text-[15px] hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-red-500/5">{t('logout')}</button>
                    </div>
                </div>
            </GlassCard>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            {!showExpertModal &&
                (currentView === 'chat_settings' ? renderChatSettings() :
                    currentView === 'wallet' ? renderWallet() :
                        (mode === 'profile' ? renderProfile() : renderSettings()))}

            {/* SHARED MODALS */}
            {showLanguageModal && (
                <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={(e) => { e.stopPropagation(); setShowLanguageModal(false); }}>
                    <GlassCard
                        className="w-full max-w-[300px] !bg-transparent p-4 rounded-[28px] border border-white/10 overflow-hidden shadow-2xl"
                        style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-white font-bold p-3 text-lg mb-2">{t('language_modal_title')}</h3>
                        <div className="space-y-1">
                            {[{ id: 'uz', n: 'O\'zbekcha' }, { id: 'ru', n: 'Русский' }, { id: 'en', n: 'English' }].map(l => (
                                <button key={l.id}
                                    onClick={() => handleSaveLanguage(l.id as any)}
                                    className={`w - full flex items - center justify - between p - 4 rounded - xl transition - all ${language === l.id ? 'bg-accent-primary text-white font-bold' : 'text-white/60 hover:bg-white/5'} `}>
                                    <span>{l.n}</span>
                                    {language === l.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            )}
            {showNameModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={(e) => { e.stopPropagation(); setShowNameModal(false); }}>
                    <GlassCard
                        className="w-full max-w-[340px] !bg-transparent p-7 shadow-2xl animate-scale-in rounded-[28px] border border-white/10"
                        style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-white font-bold text-xl mb-6">{t('edit_profile')}</h3>
                        <div className="space-y-5">
                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('name')}</label>
                                <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Familiya' : (language === 'ru' ? 'Фамилия' : 'Surname')}</label>
                                <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none transition-all" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-10">
                            <GlassButton onClick={handleSaveName} className="w-full !bg-accent-primary !text-white !rounded-xl py-3.5 font-bold shadow-lg shadow-accent-primary/20">{t('save')}</GlassButton>
                            <button onClick={() => setShowNameModal(false)} className="w-full py-3 text-white/30 hover:text-white transition-colors text-[14px]">{t('cancel')}</button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {showUsernameModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={(e) => { e.stopPropagation(); setShowUsernameModal(false); }}>
                    <GlassCard
                        className="w-full max-w-[340px] !bg-transparent p-7 shadow-2xl animate-scale-in rounded-[28px] border border-white/10"
                        style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-white font-bold text-xl mb-4">Username</h3>
                        <div className="relative group">
                            <span className="absolute left-4 top-[15px] text-accent-primary font-bold text-lg group-focus-within:scale-110 transition-transform">@</span>
                            <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-9 pr-4 text-white focus:border-accent-primary focus:outline-none transition-all text-lg" placeholder="username" />
                        </div>
                        <p className="text-white/20 text-[12px] mt-4 leading-relaxed">{t('username_desc')}</p>
                        <div className="flex flex-col gap-3 mt-10">
                            <GlassButton onClick={handleSaveUsername} className="w-full !bg-accent-primary !text-white !rounded-xl py-3.5 font-bold">{t('save')}</GlassButton>
                            <button onClick={() => setShowUsernameModal(false)} className="w-full py-3 text-white/30 hover:text-white transition-colors">{t('cancel')}</button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {showExpertModal && (
                <div
                    className="absolute inset-0 z-[110] flex items-center justify-center bg-[#0f1419]/88 backdrop-blur-lg px-0 sm:px-4 py-0 sm:py-6 animate-fade-in"
                    onClick={(e) => { e.stopPropagation(); setShowExpertModal(false); }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="expert-profile-title"
                        className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-[500px] rounded-none sm:rounded-[24px] shadow-2xl border-0 sm:border border-white/30 flex flex-col overflow-hidden text-white"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.18)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 sm:px-8 pt-5 sm:pt-7 pb-4 flex-shrink-0 border-b border-white/10">
                            <div className="flex items-center justify-between gap-4">
                                <h3 id="expert-profile-title" className="text-white font-bold text-xl sm:text-2xl flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
                                        <Award className="h-6 w-6 text-[#00A884]" />
                                    </span>
                                    {t('specialist_profile')}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowExpertModal(false)}
                                    className="text-white/70 hover:text-white bg-white/10 hover:bg-white/15 p-2.5 rounded-full border border-white/10 transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {(verifiedStatus === 'pending' || verifiedStatus === 'approved') && (
                            <div className={`mx-4 sm:mx-8 mt-4 sm:mt-5 mb-2 p-4 rounded-[18px] flex flex-col gap-3 ${verifiedStatus === 'pending' ? 'bg-amber-500/[0.12] border border-amber-400/25' : 'bg-[#00A884]/10 border border-[#00A884]/30'}`}>
                                <div className="flex items-center gap-3">
                                    {verifiedStatus === 'pending' ? <Clock className="h-6 w-6 text-yellow-500" /> : <CheckCircle className="h-6 w-6 text-emerald-500" />}
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-sm uppercase tracking-wider ${verifiedStatus === 'pending' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                            {verifiedStatus === 'pending' ? t('wait_admin_generic') : t('verified')}
                                        </span>
                                        <span className="text-white/60 text-xs mt-0.5">
                                            {verifiedStatus === 'pending' ? t('expert_pending_desc') : t('expert_confirmed_desc')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-1 text-[9px] text-white/60">
                                    {[
                                        { id: 'sent', label: t('step_sent') },
                                        { id: 'review', label: t('step_review') },
                                        { id: 'done', label: t('step_confirmed') }
                                    ].map((step, index) => {
                                        const isActive =
                                            verifiedStatus === 'pending'
                                                ? index <= 1
                                                : verifiedStatus === 'approved'
                                                    ? index <= 2
                                                    : index === 0;
                                        return (
                                            <div key={step.id} className="flex-1 flex items-center">
                                                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isActive ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                                <span className={`${isActive ? 'text-emerald-100' : 'text-white/30'}`}>{step.label}</span>
                                                {index < 2 && (
                                                    <div className={`flex-1 h-px ml-2 ${isActive ? 'bg-emerald-400/60' : 'bg-white/10'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto px-4 sm:px-8 custom-scrollbar space-y-8 py-5 sm:py-6 min-h-0">
                            {/* SECTION 1: BASIC INFO */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('basic_info')}</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('profession_type')}</label>
                                        <select
                                            ref={professionRef}
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                            className={`w-full bg-white/5 rounded-xl py-3.5 px-4 text-white focus:outline-none appearance-none border ${
                                                expertErrors.profession ? 'border-red-500/70' : 'border-white/10 focus:border-accent-primary'
                                            }`}
                                        >
                                            <option value="" className="bg-[#121B22]">{t('select')}...</option>
                                            <optgroup label="Ta'lim va Mentorlik" className="bg-[#121B22] text-emerald-400 font-bold">
                                                <option value="O'qituvchi">O'qituvchi (Mentor)</option>
                                                <option value="Mentor">Mentor (Biznes/Shaxsiy)</option>
                                                <option value="Startap mentori">Startap mentori</option>
                                                <option value="Dasturchi mentor">Dasturchi mentor</option>
                                            </optgroup>
                                            <optgroup label="Huquq sohasi" className="bg-[#121B22] text-[#00A884] font-bold">
                                                <option value="Advokat">Advokat</option>
                                                <option value="Yurist">Yurist</option>
                                                <option value="Notarius maslahatchi">Notarius maslahatchi</option>
                                                <option value="Soliq maslahatchisi">Soliq maslahatchisi</option>
                                                <option value="Mehnat huquqi eksperti">Mehnat huquqi eksperti</option>
                                                <option value="Migratsiya maslahatchisi">Migratsiya maslahatchisi</option>
                                            </optgroup>
                                            <optgroup label="Psixologiya" className="bg-[#121B22] text-[#00A884] font-bold">
                                                <option value="Klinik psixolog">Klinik psixolog</option>
                                                <option value="Oila psixologi">Oila psixologi</option>
                                                <option value="Bolalar psixologi">Bolalar psixologi</option>
                                                <option value="Psixoterapevt">Psixoterapevt</option>
                                                <option value="Stress / depressiya mutaxassisi">Stress / depressiya mutaxassisi</option>
                                                <option value="Career coach">Career coach</option>
                                            </optgroup>
                                            <optgroup label="Biznes va moliya" className="bg-[#121B22] text-[#00A884] font-bold">
                                                <option value="Biznes konsultant">Biznes konsultant</option>
                                                <option value="Startap mentori">Startap mentori</option>
                                                <option value="Marketing strateg">Marketing strateg</option>
                                                <option value="SMM mutaxassis">SMM mutaxassis</option>
                                                <option value="Moliyaviy maslahatchi">Moliyaviy maslahatchi</option>
                                                <option value="Investitsiya eksperti">Investitsiya eksperti</option>
                                            </optgroup>
                                            <option value="Other" className="bg-[#121B22]">Boshqa</option>
                                        </select>
                                        {expertErrors.profession && (
                                            <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.profession}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">
                                            {t('specialization_req')}
                                        </label>
                                        <input
                                            ref={specializationRef}
                                            value={specializationDetails}
                                            onChange={(e) => setSpecializationDetails(e.target.value)}
                                            placeholder={expertFormPh.direction}
                                            className={`w-full bg-white/5 border rounded-xl py-3.5 px-4 text-white placeholder:text-white/35 focus:outline-none transition-all ${
                                                expertErrors.specialization ? 'border-red-500/70' : 'border-white/10 focus:border-[#00A884]'
                                            }`}
                                        />
                                        {expertErrors.specialization && (
                                            <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.specialization}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('experience_years_label')}</label>
                                            <input
                                                ref={experienceRef}
                                                type="number"
                                                value={experience || 0}
                                                onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                                                placeholder={expertFormPh.experienceExample}
                                                className={`w-full bg-white/5 rounded-xl py-3.5 px-4 text-white placeholder:text-white/35 focus:outline-none border ${
                                                    expertErrors.experience ? 'border-red-500/70' : 'border-white/10 focus:border-accent-primary'
                                                }`}
                                            />
                                            {expertErrors.experience && (
                                                <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.experience}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('has_diploma_label')}</label>
                                            <div className="flex gap-2">
                                                <button onClick={() => setHasDiploma(true)} className={`flex-1 py-3.5 rounded-xl border transition-all font-bold text-xs ${hasDiploma ? 'bg-accent-primary border-accent-primary text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>{t('yes_label')}</button>
                                                <button onClick={() => setHasDiploma(false)} className={`flex-1 py-3.5 rounded-xl border transition-all font-bold text-xs ${!hasDiploma ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/10 text-white/40'}`}>{t('no_label')}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: DOCUMENTS */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('documents_req')}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                            {[
                                        { label: t('resume_pdf_req'), key: 'resume', icon: <FileText className="h-5 w-5 text-indigo-400" />, ref: resumeRef, url: resumeUrl, accept: '.pdf', error: expertErrors.resume }
                                    ].map((doc) => (
                                        <div key={doc.key} className="relative group">
                                            <button
                                                onClick={() => doc.ref.current?.click()}
                                                className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed transition-all ${
                                                    doc.error
                                                        ? 'bg-red-500/5 border-red-500/60'
                                                        : doc.url
                                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                                            : 'bg-white/5 border-white/10 hover:border-accent-primary/50 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className={`p-3 rounded-full mb-2 transition-colors ${
                                                    doc.error
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : doc.url
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-white/5 text-white/30 group-hover:text-[#00A884]'
                                                }`}>{doc.icon}</div>
                                                <span className={`text-[10px] uppercase font-bold ${
                                                    doc.error
                                                        ? 'text-red-400'
                                                        : doc.url
                                                            ? 'text-emerald-400'
                                                            : 'text-white/40'
                                                }`}>
                                                    {doc.url ? t('uploaded_status') : doc.label}
                                                </span>
                                            </button>
                                            <input
                                                type="file"
                                                ref={doc.ref as any}
                                                className="hidden"
                                                accept={doc.accept}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDocumentUpload(doc.key, file);
                                                }}
                                            />
                                            {doc.error && (
                                                <p className="text-[9px] text-red-400 mt-1 text-center">{doc.error}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SECTION 4: PRICING & FORMAT */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('finance')}</h4>
                                <div className="space-y-4">
                                    <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-3 space-y-2">
                                        <p className="text-[10px] font-bold text-[#00A884] uppercase tracking-wider">
                                            {expertFormPricingHint.title}
                                        </p>
                                        <p className="text-[11px] text-white/65 leading-snug">{expertFormPricingHint.body}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Narx turi' : (language === 'ru' ? 'Тип цены' : 'Price type')}</label>
                                        <div className="flex gap-2">
                                            {[
                                                ...(isLegalMode ? [] : [{ key: 'hourly' as const, label: t('hourly') }]),
                                                { key: 'session' as const, label: isLegalMode ? (language === 'uz' ? 'Bir martalik maslahat / xizmat' : (language === 'ru' ? 'Единоразовая консультация' : 'One-time service')) : t('session') }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.key}
                                                    type="button"
                                                    onClick={() => setPricingModel(opt.key)}
                                                    className={`flex-1 py-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                                                        pricingModel === opt.key
                                                            ? 'bg-[#00A884] border-[#00A884] text-white'
                                                            : 'bg-white/5 border-white/15 text-white/55 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">
                                                {pricingModel === 'session'
                                                    ? (isLegalMode ? (language === 'uz' ? 'Bir martalik maslahat / xizmat narxi' : (language === 'ru' ? 'Цена единоразовой услуги' : 'One-time service price')) : `${t('session')} ${t('price').toLowerCase()}`)
                                                    : `1 ${t('hourly').toLowerCase()} ${t('price').toLowerCase()}`}
                                            </label>
                                            <input
                                                ref={priceRef}
                                                type="number"
                                                value={price || 0}
                                                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                                className={`w-full bg-white/5 rounded-xl py-3.5 px-4 text-white focus:outline-none border ${
                                                    expertErrors.price ? 'border-red-500/70' : 'border-white/10 focus:border-accent-primary'
                                                }`}
                                            />
                                            {expertErrors.price && (
                                                <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.price}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Valyuta' : (language === 'ru' ? 'Валюта' : 'Currency')}</label>
                                            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none appearance-none">
                                                <option value="MALI" className="bg-[#121B22]">MALI</option>
                                                <option value="UZS" className="bg-[#121B22]">UZS</option>
                                                <option value="USD" className="bg-[#121B22]">USD</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('languages')}</label>
                                        <input
                                            value={serviceLanguages}
                                            onChange={(e) => setServiceLanguages(e.target.value)}
                                            placeholder={t('languages_list')}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Xizmat turi' : (language === 'ru' ? 'Формат услуг' : 'Service format')}</label>
                                        <div className="flex gap-2">
                                            {[
                                                { key: 'online', label: t('job_type_online') },
                                                { key: 'offline', label: t('job_type_offline') }
                                            ].map((fmt) => (
                                                <button
                                                    key={fmt.key}
                                                    onClick={() => setServiceFormat(fmt.key)}
                                                    className={`flex-1 py-3 rounded-xl border transition-all text-[11px] font-bold ${
                                                        serviceFormat === fmt.key
                                                            ? 'bg-[#00A884] border-[#00A884] text-white shadow-md'
                                                            : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:text-white/90'
                                                    }`}
                                                >
                                                    {fmt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4.5: GROUPS (FOR MENTORS) */}
                            {isMentorProfession(profession) && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/15 pb-2">
                                        <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest">{t('mentor_groups_title')}</h4>
                                        {availableGroupsLoading && (
                                            <span className="text-[10px] text-emerald-200">
                                                {t('loading')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {/* Yangi guruh yaratish */}
                                        <div className="flex gap-2">
                                            <input
                                                value={newGroupName}
                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                placeholder={t('add_group_placeholder')}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-accent-primary outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newGroupName.trim()) {
                                                        setExpertGroups([
                                                            ...expertGroups,
                                                            { id: Date.now().toString(), name: newGroupName.trim(), time: '' }
                                                        ]);
                                                        setNewGroupName("");
                                                    }
                                                }}
                                                className="bg-[#00A884]/20 text-[#00E6C3] hover:bg-[#00A884] hover:text-white px-4 rounded-xl border border-[#00A884]/30 transition-all shrink-0"
                                            >
                                                <Plus className="h-5 w-5" />
                                            </button>
                                        </div>

                                        {/* Tanlangan guruhlar ro'yxati */}
                                        <div className="space-y-2">
                                            {expertGroups.map((g) => (
                                                <div key={g.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-bold text-white truncate">{g.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpertGroups(expertGroups.filter(x => x.id !== g.id))}
                                                        className="text-red-400/50 hover:text-red-400 p-1"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {expertGroups.length === 0 && (
                                                <div className="text-center py-4 text-xs text-white/20 italic border border-dashed border-white/5 rounded-xl">
                                                    {t('at_least_one_group')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Mavjud guruhlardan qo'shish */}
                                        {availableGroups.length > 0 && (
                                            <div className="space-y-2 pt-3 border-t border-white/5">
                                                <p className="text-[11px] text-white/40 font-medium">
                                                    {t('add_from_existing')}
                                                </p>
                                                {availableGroups
                                                    .filter(ag => !expertGroups.some(g => g.chatId === ag.chatId || g.id === ag.id))
                                                    .map(ag => (
                                                        <button
                                                            key={ag.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setExpertGroups([
                                                                    ...expertGroups,
                                                                    { id: ag.id, name: ag.name, time: '', chatId: ag.chatId || ag.id }
                                                                ]);
                                                            }}
                                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00A884]/15 hover:border-[#00A884]/40 transition-all"
                                                        >
                                                            <div className="flex flex-col text-left min-w-0">
                                                                <span className="text-sm text-white font-medium truncate">{ag.name}</span>
                                                            </div>
                                                            <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200 font-semibold">
                                                                {t('add')}
                                                            </span>
                                                        </button>
                                                    ))}
                                                {availableGroups.filter(ag => !expertGroups.some(g => g.chatId === ag.chatId || g.id === ag.id)).length === 0 && (
                                                    <p className="text-[11px] text-white/30 italic">
                                                        {t('all_groups_added')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECTION 5: LISTING + BIO */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('detailed_info')}</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">
                                            {t('specialty_offer_label')}
                                        </label>
                                        <p className="text-[10px] text-white/35 leading-snug px-1">
                                            {t('specialty_offer_hint')}
                                        </p>
                                        <textarea
                                            value={specialtyDesc}
                                            onChange={(e) => setSpecialtyDesc(e.target.value)}
                                            placeholder={expertFormPh.listing}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-white/35 focus:border-accent-primary focus:outline-none min-h-[140px] resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('bio')}</label>
                                        <textarea
                                            value={bioExpert}
                                            onChange={(e) => setBioExpert(e.target.value)}
                                            placeholder={t('bio_expert_placeholder')}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-white/35 focus:border-accent-primary focus:outline-none min-h-[100px] resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 border-t border-white/10 bg-white/[0.06] px-4 sm:px-8 py-4 sm:py-5 flex flex-col gap-4">
                            <div className="rounded-[14px] border border-amber-400/25 bg-amber-500/[0.1] px-3 py-3 flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 flex-shrink-0 border border-amber-400/20">
                                    <Bell className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                                        {t('important_info')}
                                    </p>
                                    <p className="text-[11px] text-white/80 leading-snug">
                                        {t('expert_free_hint')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowExpertModal(false)}
                                    className="py-2.5 text-[13px] text-white/55 hover:text-white transition-colors text-center sm:text-left"
                                >
                                    {t('cancel')}
                                </button>
                                <GlassButton
                                    type="button"
                                    onClick={handleSaveExpertData}
                                    className="w-full sm:w-auto !min-w-[140px] !bg-[#00A884] hover:!bg-[#009975] !text-white !rounded-xl py-3 text-sm font-bold shadow-lg shadow-black/20 border border-white/10"
                                >
                                    {t('send')}
                                </GlassButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <GlassDatePicker
                open={showDatePicker}
                value={birthday}
                language={language === 'ru' ? 'ru' : 'uz'}
                onChange={(val) => {
                    handleSaveBirthday(val);
                    setShowDatePicker(false);
                }}
                onClose={() => setShowDatePicker(false)}
            />

            {avatarPreviewUrl && (
                <div
                    className="fixed inset-0 z-[140] flex flex-col bg-black animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-label={
                        language === 'ru' ? 'Фото профиля' : language === 'en' ? 'Profile photo' : 'Profil rasmi'
                    }
                    onClick={() => setAvatarPreviewUrl(null)}
                >
                    <div className="flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))]">
                        <button
                            type="button"
                            className="rounded-full bg-white/15 p-2.5 text-white hover:bg-white/25 transition-colors touch-manipulation"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAvatarPreviewUrl(null);
                            }}
                            aria-label={t('cancel')}
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={avatarPreviewUrl}
                            alt=""
                            className="max-h-[min(88dvh,100%)] max-w-full object-contain select-none"
                            style={{ touchAction: 'pinch-zoom' }}
                            onClick={(e) => e.stopPropagation()}
                            draggable={false}
                        />
                    </div>
                </div>
            )}

            {toast && (
                <div
                    className={`
                        fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm
                        ${toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100' :
                            toast.type === 'warning' ? 'bg-amber-500/15 border-amber-500/40 text-amber-100' :
                                'bg-red-500/15 border-red-500/40 text-red-100'}
                    `}
                >
                    <div className="flex items-center gap-2">
                        {toast.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                        {toast.type === 'warning' && <Bell className="w-4 h-4 flex-shrink-0" />}
                        {toast.type === 'error' && <X className="w-4 h-4 flex-shrink-0" />}
                        <span className="leading-snug">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 text-white/60 hover:text-white flex-shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}

