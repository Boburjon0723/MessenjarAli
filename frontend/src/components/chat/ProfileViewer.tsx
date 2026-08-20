import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useSocket } from '@/context/SocketContext';
import { useLanguage } from '@/context/LanguageContext';
import { getUser, setUser, getToken } from '@/lib/auth-storage';
import { apiFetch } from '@/lib/api';
import {
    getExpertFormPlaceholders,
    getExpertPanelMode,
    isLegalProfession,
    isMentorProfession,
} from '@/lib/expert-roles';
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
    Moon,
    CheckCircle,
    Shield,
    UserCheck,
} from 'lucide-react';
import { ProfileChatSettingsView } from './profile/ProfileChatSettingsView';
import { ProfileWalletView } from './profile/ProfileWalletView';
import { ProfileSettingsView } from './profile/ProfileSettingsView';
import { ProfileExpertModal } from './profile/ProfileExpertModal';
import { ProfileEditModals } from './profile/ProfileEditModals';

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
    /** Telegram uslubi: rasmni kattalashtirib koвЂrish */
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
        // Toggle faqat is_expert — verified_status alohida (approved bo‘lib, rejim o‘chirilgan bo‘lishi mumkin)
        setIsExpert(Boolean(userToProcess.is_expert));
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

    /** localStorage / propUser da ekspert maydonlari boвЂlmasa ham, tahrirlash modali ochilganda serverdan toвЂliq profil. */
    useEffect(() => {
        if (!showExpertModal) return;
        const ac = new AbortController();
        (async () => {
            try {
                const res = await apiFetch('/api/users/me', {
                    signal: ac.signal,
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
                body: 'Odatda soatlik narx (masalan, 45вЂ“60 daqiqalik dars) qulay — mijoz vaqtni aniq biladi.'
            },
            legal: {
                title: 'Huquqshunos',
                body: 'KoвЂpincha bir murojaat, qisqa maslahat yoki ish paketi (seans) narxi beriladi.'
            },
            psychology: {
                title: 'Psixolog',
                body: '50вЂ“60 daqiqalik seans narxi odatiy. Soatlik ham mumkin — mijozga seans vaqtini oldindan yozing.'
            },
            consult: {
                title: 'Konsultant',
                body: 'Xizmat soat bilan boвЂlsa В«SoatlikВ», tayyor uchrashuv/paket boвЂlsa В«SeansВ» tanlang.'
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
                const res = await apiFetch(`/api/chats/expert/${user.id}`);
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
        try {
            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify({
                    name: editFirstName,
                    surname: editLastName
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setToast({ type: 'error', message: (err as any).message || 'Saqlab boвЂlmadi' });
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
            setToast({ type: 'warning', message: 'Username boвЂsh boвЂlmasin' });
            return;
        }
        try {
            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
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

        // Create actual chat groups for new expert groups
        const updatedGroups = [...expertGroups];
        let createdAny = false;
        for (let i = 0; i < updatedGroups.length; i++) {
            const grp = updatedGroups[i];
            if (!grp.chatId) {
                try {
                    const res = await apiFetch('/api/chats', {
                        method: 'POST',
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
            /** DB ikkala ustunda bir xil — eвЂlon matni bitta maydondan */
            expert_proposal: String(specialtyDesc || "").trim(),
            bio_expert: bioExpert,
            resume_url: resumeUrl,
            anketa_url: anketaUrl,
            pricing_model: pricingModel,
            services_json: JSON.stringify(servicesJson),
            expert_groups: JSON.stringify(updatedGroups),
            expert_fee_total: expertFee
            // verified_status ni yubormaymiz вЂ“ backend ma'lumot o'zgarmasa tasdiqni saqlaydi
        };
        const apiPayload = {
            name: user.name,
            surname: user.surname || '',
            username: user.username || '',
            ...payload
        };
        try {
            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify(apiPayload)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Saqlash muvaffaqiyatsiz');
            }
            // Backend qaysi holatni qaytganini bilish uchun profilni qayta olamiz
            const profileRes = await apiFetch('/api/users/me');
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

    /** GroupInfoPanel dagi bilan bir xil: FormData в†’ /api/media/upload в†’ profilga URL */
    const handleProfileAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            e.target.value = '';
            return;
        }
        const maxBytes = 6 * 1024 * 1024;
        if (file.size > maxBytes) {
            setToast({ type: 'warning', message: 'Rasm hajmi 6 MB dan kichik boвЂlsin.' });
            e.target.value = '';
            return;
        }
        e.target.value = '';
        if (!getToken()) {
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
            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
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
            setToast({ type: 'success', message: t('save_record') + ' вњ“' });
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
            ? 'Р—Р°РіСЂСѓР·РёС‚СЊ С„РѕС‚Рѕ РїСЂРѕС„РёР»СЏ'
            : language === 'en'
              ? 'Upload profile photo'
              : 'Profil rasmini yuklash';

    const fetchWallet = async () => {
        try {
            const res = await apiFetch('/api/wallet/balance');
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
            const res = await apiFetch('/api/wallet/subscribe', {
                method: 'POST',
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
        try {
            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
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

    /** Allaqachon tasdiqlangan profil — formani qayta ochmasdan faqat rejimni yoqish */
    const handleTurnOnExpert = async () => {
        try {
            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify({
                    name: user.name,
                    surname: user.surname || '',
                    username: user.username || '',
                    bio: user.bio,
                    birthday: user.birthday,
                    avatar_url: user.avatar_url || user.avatar,
                    is_expert: true,
                    profession: user.profession || profession,
                    specialization: user.specialization_details || user.specialization || specializationDetails,
                    specialization_details: user.specialization_details || specializationDetails,
                    experience_years: user.experience_years ?? experience,
                    service_price: user.service_price ?? price,
                    hourly_rate: user.hourly_rate ?? price,
                    working_hours: user.working_hours,
                    languages: user.languages,
                    wiloyat: user.wiloyat,
                    tuman: user.tuman,
                    expert_groups: user.expert_groups,
                    currency: user.currency || currency,
                    pricing_model: user.pricing_model || pricingModel,
                }),
            });
            if (res.ok) {
                setIsExpert(true);
                const updated = { ...user, is_expert: true };
                setLocalUser(updated);
                try {
                    setUser(updated as Record<string, unknown>);
                } catch (_) {}
                setToast({ type: 'success', message: t('expert_mode_restored') as string });
                if (socket) socket.emit('update_profile', { is_expert: true });
            } else {
                const err = await res.json().catch(() => ({}));
                setToast({
                    type: 'error',
                    message: (err as any)?.message || (t('server_error') as string),
                });
                setShowExpertModal(true);
            }
        } catch (e) {
            console.error('Turn on expert error:', e);
            setToast({ type: 'error', message: "Rejimni yoqishda xatolik. Qayta urinib ko'ring." });
            setShowExpertModal(true);
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
            className="w-full h-full lg:h-auto lg:max-w-[420px] flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:rounded-2xl bg-[#212121] text-white shadow-[0_2px_16px_rgba(0,0,0,0.4)]"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header with Big Image — bosish: katta koвЂrinish (Telegram); kamera: yangi rasm */}
            <div className="relative h-24 sm:h-28 w-full overflow-hidden flex-shrink-0">
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
                                ? 'РћС‚РєСЂС‹С‚СЊ С„РѕС‚Рѕ'
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
                <div className="absolute inset-0 bg-gradient-to-t from-[#212121] via-transparent to-black/40 pointer-events-none" />

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
                    <p className="text-[#8774e1] text-[13px] font-medium mt-1">{t('online')}</p>
                </div>

                {!uploadingAvatar && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleAvatarClick();
                        }}
                        className="absolute bottom-4 right-6 w-11 h-11 bg-[#8774e1] rounded-full flex items-center justify-center text-white shadow-xl hover:bg-[#7b68d4] transition-all transform active:scale-95 z-20 touch-manipulation"
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

            {/* Guruh bilan bir xil: yuklashda havola yoвЂq, `GroupInfoPanel` dagi klasslar */}
            {/* Camera icon on cover replaces this link */}

            {verifiedStatus === 'pending' && (
                <div className="mx-4 mt-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500 shrink-0" />
                    <span className="text-yellow-500 font-bold text-[11px]">{t('expert_status_pending')}</span>
                    <span className="text-white/40 text-[10px]">{t('expert_mode_desc')}</span>
                </div>
            )}

            <div className="overflow-y-auto custom-scrollbar flex-1 pb-8">
                {/* Info Items */}
                <div className="p-3 space-y-0.5">
                    <div className="flex items-center gap-5 px-3 py-2.5 hover:bg-white/5 rounded-[15px] cursor-default transition-colors group">
                        <Phone className="h-5 w-5 text-[#8774e1]" />
                        <div className="flex flex-col">
                            <span className="text-white text-[15px]">{user.phone || '+998 -- --- -- --'}</span>
                            <span className="text-white/30 text-[12px]">{t('phone_label')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-5 px-3 py-2.5 hover:bg-white/5 rounded-[15px] cursor-pointer group transition-colors"
                        onClick={() => { setEditUsername(user.username || ""); setShowUsernameModal(true); }}>
                        <AtSign className="h-5 w-5 text-[#8774e1]" />
                        <div className="flex flex-col">
                            <span className="text-white text-[15px]">@{user.username || 'username'}</span>
                            <span className="text-white/30 text-[12px]">{t('username')}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-5 px-3 py-2.5 hover:bg-white/5 rounded-[15px] transition-colors relative group cursor-pointer"
                        onClick={() => setShowDatePicker(true)}
                    >
                        <Calendar className="h-5 w-5 text-[#8774e1] group-hover:scale-110 transition-transform" />
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
                            <span className="text-[#8774e1] text-[15px] font-medium">{displayAge()!.current}</span>
                            <div className="flex flex-col flex-1">
                                <span className="text-white text-[15px]">
                                    {displayAge()!.current} {t('years_old')} вЂў {t('next_year')} {displayAge()!.nextYear} {t('years_old')}
                                </span>
                                <span className="text-white/30 text-[12px]">{t('age_label')}</span>
                            </div>
                        </div>
                    )}

                </div>

                <div className="h-[1px] bg-white/5 mx-6"></div>

                {/* Expert Status */}
                <div className="p-3">
                    <div className={`p-3 rounded-xl border transition-all cursor-pointer ${showExpertSummary ? 'bg-accent-primary/10 border-accent-primary/30 shadow-lg shadow-accent-primary/5' : 'bg-white/5 border-white/10 hover:border-white/20'}`} onClick={() => setShowExpertModal(true)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Award className={`h-6 w-6 ${showExpertSummary ? 'text-[#8774e1]' : 'text-white/20'}`} />
                                <div className="flex flex-col">
                                    <h4 className="text-white font-bold text-[16px]">{t('specialist_mode')}</h4>
                                    {isExpert && verifiedStatus === 'approved' && (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                            <CheckCircle className="h-3.5 w-3.5 text-emerald-300" />
                                            {t('activated')}
                                        </span>
                                    )}
                                    {!isExpert && verifiedStatus === 'approved' && (
                                        <span className="text-white/45 text-[10px] font-bold uppercase tracking-wider">
                                            {t('expert_mode_paused')}
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
                                        ? 'bg-[#8774e1] border-[#8774e1] shadow-[0_0_0_4px_rgba(135,116,225,0.28)]'
                                        : 'bg-white/15 border-white/30'
                                }`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextState = !isExpert;
                                    if (nextState) {
                                        // Bir marta tasdiqlangan profil — forma qayta ochilmasin
                                        if (verifiedStatus === 'approved' && hasExpertProfileData) {
                                            void handleTurnOnExpert();
                                        } else {
                                            setIsExpert(true);
                                            setShowExpertModal(true);
                                        }
                                    } else {
                                        void handleTurnOffExpert();
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
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-2 animate-fade-in">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                        <span className="text-white/30 text-[10px] uppercase font-bold block mb-1">{t('experience')}</span>
                                        <span className="text-white font-bold text-[14px]">{experience} {t('year')}</span>
                                    </div>
                                    <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                        <span className="text-white/30 text-[10px] uppercase font-bold block mb-0.5">
                                            {pricingModel === 'session' ? `${t('price')} (${t('session')})` : `${t('price')} (${t('hourly')})`}
                                        </span>
                                        <span className="text-white font-bold text-[14px]">{price} {currency}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 px-1">
                                    <span className="text-white/30 text-[10px] uppercase font-bold">{t('specialization')}</span>
                                    <span className="text-white text-[13px] font-medium leading-tight">{profession || t('select')} - {specializationDetails || '...'}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setShowExpertModal(true); }} className="w-full py-2.5 bg-[#8774e1]/15 text-[#8774e1] text-[13px] font-medium rounded-xl hover:bg-[#8774e1]/25 transition-all">{t('edit_profile')}</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderChatSettings = () => (
        <ProfileChatSettingsView
            bgSettings={bgSettings}
            onBack={() => setCurrentView('main')}
            onUpdateBgBlur={onUpdateBgBlur}
            onUpdateBgImageBlur={onUpdateBgImageBlur}
            onUpdateBgImage={onUpdateBgImage}
        />
    );

    const renderWallet = () => (
        <ProfileWalletView
            bgSettings={bgSettings}
            onBack={() => setCurrentView('main')}
            walletData={walletData}
            isSubscribing={isSubscribing}
            isExpert={isExpert}
            verifiedStatus={verifiedStatus}
            onSubscribe={handleSubscribe}
        />
    );

    const renderSettings = () => (
        <ProfileSettingsView
            bgSettings={bgSettings}
            user={user}
            profilePhotoDisplaySrc={profilePhotoDisplaySrc}
            getAvatarUrl={(url) => getAvatarUrl(String(url || ''))}
            displayAge={displayAge}
            onClose={onClose}
            onLogout={onLogout}
            onOpenLanguage={() => setShowLanguageModal(true)}
            onOpenNameEdit={() => { setEditFirstName(user.name || ""); setEditLastName(user.surname || ""); setShowNameModal(true); }}
            onOpenAvatar={openAvatarLightbox}
            onOpenWallet={() => { setCurrentView('wallet'); fetchWallet(); }}
            onOpenChatSettings={() => setCurrentView('chat_settings')}
        />
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4 bg-black/55 animate-fade-in" onClick={onClose}>
            {!showExpertModal &&
                (currentView === 'chat_settings' ? renderChatSettings() :
                    currentView === 'wallet' ? renderWallet() :
                        (mode === 'profile' ? renderProfile() : renderSettings()))}

            <ProfileEditModals
                t={t}
                language={language}
                bgSettings={bgSettings}
                showLanguageModal={showLanguageModal}
                setShowLanguageModal={setShowLanguageModal}
                handleSaveLanguage={handleSaveLanguage}
                showNameModal={showNameModal}
                setShowNameModal={setShowNameModal}
                editFirstName={editFirstName}
                setEditFirstName={setEditFirstName}
                editLastName={editLastName}
                setEditLastName={setEditLastName}
                handleSaveName={handleSaveName}
                showUsernameModal={showUsernameModal}
                setShowUsernameModal={setShowUsernameModal}
                editUsername={editUsername}
                setEditUsername={setEditUsername}
                handleSaveUsername={handleSaveUsername}
                showDatePicker={showDatePicker}
                setShowDatePicker={setShowDatePicker}
                birthday={birthday}
                handleSaveBirthday={handleSaveBirthday}
                avatarPreviewUrl={avatarPreviewUrl}
                setAvatarPreviewUrl={setAvatarPreviewUrl}
                toast={toast}
                setToast={setToast}
            />

            {showExpertModal && (
                <ProfileExpertModal
                    t={t}
                    language={language}
                    isLegalMode={isLegalMode}
                    verifiedStatus={verifiedStatus}
                    onClose={() => setShowExpertModal(false)}
                    profession={profession}
                    setProfession={setProfession}
                    professionRef={professionRef}
                    specializationDetails={specializationDetails}
                    setSpecializationDetails={setSpecializationDetails}
                    specializationRef={specializationRef}
                    experience={experience}
                    setExperience={setExperience}
                    experienceRef={experienceRef}
                    hasDiploma={hasDiploma}
                    setHasDiploma={setHasDiploma}
                    expertErrors={expertErrors}
                    expertFormPh={expertFormPh}
                    expertFormPricingHint={expertFormPricingHint}
                    resumeRef={resumeRef}
                    resumeUrl={resumeUrl}
                    handleDocumentUpload={handleDocumentUpload}
                    price={price}
                    setPrice={setPrice}
                    priceRef={priceRef}
                    pricingModel={pricingModel}
                    setPricingModel={setPricingModel}
                    currency={currency}
                    setCurrency={setCurrency}
                    serviceLanguages={serviceLanguages}
                    setServiceLanguages={setServiceLanguages}
                    serviceFormat={serviceFormat}
                    setServiceFormat={setServiceFormat}
                    availableGroupsLoading={availableGroupsLoading}
                    newGroupName={newGroupName}
                    setNewGroupName={setNewGroupName}
                    expertGroups={expertGroups}
                    setExpertGroups={setExpertGroups}
                    availableGroups={availableGroups}
                    specialtyDesc={specialtyDesc}
                    setSpecialtyDesc={setSpecialtyDesc}
                    bioExpert={bioExpert}
                    setBioExpert={setBioExpert}
                    onSave={handleSaveExpertData}
                />
            )}
        </div >
    );
}



