import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useSocket } from '@/context/SocketContext';
import { useLanguage } from '@/context/LanguageContext';
import { getUser, setUser, getToken } from '@/lib/auth-storage';
import { apiFetch } from '@/lib/api';
import {
    dedupeExpertGroups,
    getExpertFormPlaceholders,
    getExpertPanelMode,
    isLegalProfession,
    isMentorProfession,
    normalizeExpertGroupName,
} from '@/lib/expert-roles';
import {
    X,
    Camera,
    Award,
    Clock,
    Pencil,
    Wallet,
    MessageSquare,
    User,
    Shield,
    Languages,
} from 'lucide-react';
import { ProfileChatSettingsView } from './profile/ProfileChatSettingsView';
import { ProfileWalletView } from './profile/ProfileWalletView';
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
    const [showBioModal, setShowBioModal] = useState(false);
    const [showExpertModal, setShowExpertModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [editFirstName, setEditFirstName] = useState("");
    const [editLastName, setEditLastName] = useState("");
    const [editUsername, setEditUsername] = useState("");
    const [editBio, setEditBio] = useState("");
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
    /** soatlik | seans | oylik (mentor) — backend `pricing_model` */
    const [pricingModel, setPricingModel] = useState<'hourly' | 'session' | 'monthly'>('hourly');
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
    const savingExpertRef = useRef(false);
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
        setPricingModel(
            userToProcess.pricing_model === 'monthly'
                ? 'monthly'
                : userToProcess.pricing_model === 'session'
                  ? 'session'
                  : 'hourly'
        );
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
            const rawGroups = userToProcess.expert_groups
                ? typeof userToProcess.expert_groups === 'string'
                    ? JSON.parse(userToProcess.expert_groups)
                    : userToProcess.expert_groups
                : [];
            setExpertGroups(dedupeExpertGroups(Array.isArray(rawGroups) ? rawGroups : []));
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
                body: 'Guruh obunasi uchun «Oylik» narxni qo‘ying — talaba guruhga kirganda shu summa yechiladi. Soatlik dars bo‘lsa «Soatlik» tanlang.'
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
            return;
        }
        // Mentor: eski «seans» → «oylik» (guruh obunasi)
        if (!isLegalMode && isMentorProfession(profession) && pricingModel === 'session') {
            setPricingModel('monthly');
        }
    }, [isLegalMode, pricingModel, profession]);

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

    const handleSaveBio = () => {
        const newBio = editBio.trim();
        if (newBio !== (user.bio || '')) {
            setBio(newBio);
            if (socket) socket.emit('update_profile', { bio: newBio });
            const newUser = { ...user, bio: newBio };
            setLocalUser(newUser);
            setUser(newUser as Record<string, unknown>);
        }
        setShowBioModal(false);
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
        if (savingExpertRef.current) return;
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
                    pricingModel === 'monthly'
                        ? "Oylik narx maydonini to'g'ri kiriting."
                        : pricingModel === 'session'
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

        const uniqueGroups = dedupeExpertGroups(expertGroups);
        if (isMentorProfession(profession) && uniqueGroups.length === 0) {
            setToast({ type: 'warning', message: "Mentorlar uchun kamida bitta guruh qo'shish majburiy." });
            setExpertErrors(prev => ({ ...prev, groups: "Mentor uchun kamida bitta guruh qo'shing." }));
            return;
        }

        savingExpertRef.current = true;
        try {
            // Mavjud chatlarni qayta ishlatish + faqat yangilarini yaratish
            const updatedGroups = uniqueGroups.map((grp) => {
                if (grp.chatId) return { ...grp };
                const existing = availableGroups.find(
                    (ag) =>
                        normalizeExpertGroupName(ag.name) === normalizeExpertGroupName(grp.name) ||
                        String(ag.chatId || ag.id) === String(grp.id)
                );
                if (existing) {
                    const chatId = String(existing.chatId || existing.id);
                    return { ...grp, chatId, id: chatId };
                }
                return { ...grp };
            });

            for (let i = 0; i < updatedGroups.length; i++) {
                const grp = updatedGroups[i];
                if (grp.chatId) continue;
                try {
                    const res = await apiFetch('/api/chats', {
                        method: 'POST',
                        body: JSON.stringify({ type: 'group', name: grp.name, participants: [] }),
                    });
                    if (res.ok) {
                        const newChat = await res.json();
                        const chatId = String(newChat.id || newChat._id || '');
                        if (chatId) {
                            updatedGroups[i] = { ...grp, chatId, id: chatId };
                        }
                    } else {
                        const errData = await res.json().catch(() => ({}));
                        console.error('[ProfileViewer] Failed to create chat group:', errData);
                    }
                } catch (err) {
                    console.error('[ProfileViewer] Error creating chat group:', err);
                }
            }

            const finalGroups = dedupeExpertGroups(updatedGroups);
            setExpertGroups(finalGroups);

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
                /** DB ikkala ustunda bir xil — e'lon matni bitta maydondan */
                expert_proposal: String(specialtyDesc || '').trim(),
                bio_expert: bioExpert,
                resume_url: resumeUrl,
                anketa_url: anketaUrl,
                pricing_model: pricingModel,
                services_json: JSON.stringify(servicesJson),
                expert_groups: JSON.stringify(finalGroups),
                expert_fee_total: expertFee,
                // verified_status ni yubormaymiz – backend ma'lumot o'zgarmasa tasdiqni saqlaydi
            };
            const apiPayload = {
                name: user.name,
                surname: user.surname || '',
                username: user.username || '',
                ...payload,
            };

            const res = await apiFetch('/api/users/me', {
                method: 'PUT',
                body: JSON.stringify(apiPayload),
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
                    message: 'Profil yangilandi. Mutaxassis rejimi faollashtirildi.',
                });
            } else {
                setToast({
                    type: 'success',
                    message:
                        "Ma'lumotlar yangilandi. O'zgartirishlar tasdiqlash uchun yuborildi. Admin tasdig'ini kuting.",
                });
            }
        } catch (e: any) {
            setToast({
                type: 'error',
                message: e?.message || "Server bilan aloqa xatosi. Qayta urinib ko'ring.",
            });
        } finally {
            savingExpertRef.current = false;
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

    const renderProfile = () => {
        const fullName = `${user.name || ''} ${user.surname || ''}`.trim() || 'User';
        const birthdayLabel = birthday
            ? `${new Date(birthday).toLocaleDateString(
                  language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ',
                  { day: 'numeric', month: 'short', year: 'numeric' }
              )}${displayAge() ? ` (${displayAge()!.current} ${t('years_old')})` : ''}`
            : t('select');
        const priceLabel =
            pricingModel === 'monthly'
                ? t('monthly')
                : pricingModel === 'session'
                  ? t('session')
                  : t('hourly');
        const expertStatusRight =
            verifiedStatus === 'pending'
                ? '…'
                : isExpert && verifiedStatus === 'approved'
                  ? '✓'
                  : verifiedStatus === 'approved'
                    ? '—'
                    : '';

        return (
            <div
                className="w-full h-full lg:h-auto lg:max-w-[420px] flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:rounded-2xl bg-[#212121] text-white shadow-[0_2px_16px_rgba(0,0,0,0.45)] border border-white/[0.06]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Telegram: til + Edit + Close */}
                <div className="flex items-center justify-end gap-0.5 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowLanguageModal(true)}
                        className="flex items-center gap-1 px-2.5 min-h-[44px] rounded-full text-[#6ab3f3] hover:bg-white/5 transition-colors"
                        aria-label={language === 'uz' ? 'Til' : language === 'ru' ? 'Язык' : 'Language'}
                    >
                        <Languages className="h-[18px] w-[18px]" strokeWidth={2} />
                        <span className="text-[12px] font-semibold uppercase">{language}</span>
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit();
                        }}
                        className="p-2.5 min-h-[44px] min-w-[44px] rounded-full text-[#6ab3f3] hover:bg-white/5 transition-colors flex items-center justify-center"
                        aria-label={t('edit_profile')}
                    >
                        <Pencil className="h-[18px] w-[18px]" strokeWidth={2} />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2.5 min-h-[44px] min-w-[44px] rounded-full text-[#6ab3f3] hover:bg-white/5 transition-colors flex items-center justify-center"
                        aria-label={t('cancel')}
                    >
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>

                {/* Centered avatar + name + online */}
                <div className="flex flex-col items-center px-6 pb-5 shrink-0">
                    <div className="relative">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (getAvatarUrl(user.avatar || user.avatar_url)) openAvatarLightbox();
                            }}
                            className="block rounded-full overflow-hidden w-[120px] h-[120px] ring-0 focus:outline-none"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={profilePhotoDisplaySrc}
                                alt=""
                                className={`w-full h-full object-cover ${uploadingAvatar ? 'opacity-50' : ''}`}
                                key={String(user.avatar_url || user.avatar || 'av')}
                            />
                        </button>
                        {uploadingAvatar && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                        {!uploadingAvatar && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAvatarClick();
                                }}
                                className="absolute bottom-0.5 right-0.5 w-9 h-9 bg-[#6ab3f3] rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#5aa3e3] transition-all active:scale-95"
                                aria-label="Camera"
                            >
                                <Camera className="h-4 w-4" />
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
                    <h2 className="mt-3.5 text-[20px] font-medium leading-tight text-center text-white tracking-tight">
                        {fullName}
                    </h2>
                    <p className="text-[#6ab3f3] text-[14px] mt-0.5 font-normal">{t('online')}</p>
                </div>

                {verifiedStatus === 'pending' && (
                    <div className="mx-4 mb-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                        <span className="text-amber-400 font-semibold text-[11px]">{t('expert_status_pending')}</span>
                    </div>
                )}

                <div className="overflow-y-auto custom-scrollbar flex-1 min-h-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    {/* Info rows — Telegram: value on top, muted label under */}
                    <div className="px-5 py-1 space-y-4">
                        <div className="cursor-default">
                            <p className="text-[16px] text-white leading-snug">
                                {user.phone || '+998 ········'}
                            </p>
                            <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('phone_label')}</p>
                        </div>

                        <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                                setEditBio(bio || user.bio || '');
                                setShowBioModal(true);
                            }}
                        >
                            <p
                                className={`text-[16px] leading-snug ${
                                    bio || user.bio ? 'text-white' : 'text-[#6ab3f3]'
                                }`}
                            >
                                {bio || user.bio || (language === 'uz' ? 'Bio qo‘shish' : language === 'ru' ? 'Добавить био' : 'Add bio')}
                            </p>
                            <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('bio')}</p>
                        </button>

                        <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => {
                                setEditUsername(user.username || '');
                                setShowUsernameModal(true);
                            }}
                        >
                            <p className="text-[16px] text-[#6ab3f3] leading-snug">
                                @{user.username || 'username'}
                            </p>
                            <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('username')}</p>
                        </button>

                        <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => setShowDatePicker(true)}
                        >
                            <p className="text-[16px] text-white leading-snug">{birthdayLabel}</p>
                            <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('birthday')}</p>
                        </button>
                    </div>

                    {/* Section gap like Telegram */}
                    <div className="h-3 bg-[#0f0f0f] my-3" />

                    {/* Specialist — Story Archive analog */}
                    <button
                        type="button"
                        className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.04] transition-colors text-left"
                        onClick={() => setShowExpertModal(true)}
                    >
                        <span className="flex h-7 w-7 items-center justify-center shrink-0">
                            <Award className="h-5 w-5 text-[#6ab3f3]" />
                        </span>
                        <span className="flex-1 text-[16px] text-white">{t('specialist_mode')}</span>
                        <span className="text-[15px] text-[#6d7f8f] tabular-nums mr-1">{expertStatusRight}</span>
                        <div
                            className={`w-[46px] h-[26px] rounded-full relative transition-all shrink-0 ${
                                isExpert ? 'bg-[#6ab3f3]' : 'bg-white/20'
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                const nextState = !isExpert;
                                if (nextState) {
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
                                className={`absolute top-[3px] w-[20px] h-[20px] bg-white rounded-full shadow transition-all ${
                                    isExpert ? 'left-[23px]' : 'left-[3px]'
                                }`}
                            />
                        </div>
                    </button>

                    {showExpertSummary && (
                        <div className="px-5 pb-2 pt-1 space-y-3.5 border-t border-white/[0.06]">
                            <div>
                                <p className="text-[16px] text-white tabular-nums">
                                    {price} {currency}
                                </p>
                                <p className="text-[13px] text-[#6d7f8f] mt-0.5">
                                    {priceLabel} · {t('price')}
                                </p>
                            </div>
                            <div>
                                <p className="text-[16px] text-white">
                                    {experience} {t('year')}
                                </p>
                                <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('experience')}</p>
                            </div>
                            <div>
                                <p className="text-[16px] text-white leading-snug">
                                    {profession || t('select')}
                                    {specializationDetails ? ` — ${specializationDetails}` : ''}
                                </p>
                                <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('specialization')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowExpertModal(true);
                                }}
                                className="w-full py-2.5 text-[#6ab3f3] text-[15px] font-medium hover:bg-white/[0.04] rounded-lg transition-colors"
                            >
                                {t('edit_profile')}
                            </button>
                        </div>
                    )}

                    <div className="h-3 bg-[#0f0f0f] my-1" />

                    {/* Sozlamalar qatorlari — bitta yagona profil */}
                    <button
                        type="button"
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                        onClick={() => {
                            setEditFirstName(user.name || '');
                            setEditLastName(user.surname || '');
                            setShowNameModal(true);
                        }}
                    >
                        <User className="h-5 w-5 text-[#6ab3f3] shrink-0 ml-1" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[16px] text-white">{t('profile')}</p>
                            <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('edit_account_sub')}</p>
                        </div>
                    </button>
                    <button
                        type="button"
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                        onClick={() => {
                            setCurrentView('wallet');
                            fetchWallet();
                        }}
                    >
                        <Wallet className="h-5 w-5 text-[#6ab3f3] shrink-0 ml-1" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[16px] text-white">{t('wallet')}</p>
                            <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('wallet_sub')}</p>
                        </div>
                    </button>
                    <button
                        type="button"
                        className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                        onClick={() => setCurrentView('chat_settings')}
                    >
                        <MessageSquare className="h-5 w-5 text-[#6ab3f3] shrink-0 ml-1" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[16px] text-white">{t('chat_settings')}</p>
                            <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('chat_settings_sub')}</p>
                        </div>
                    </button>
                    {user.role === 'admin' && (
                        <button
                            type="button"
                            className="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/[0.04] transition-colors text-left"
                            onClick={() => window.open('/AdminZero0723s', '_blank')}
                        >
                            <Shield className="h-5 w-5 text-[#6ab3f3] shrink-0 ml-1" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[16px] text-white">Admin Panel</p>
                                <p className="text-[13px] text-[#6d7f8f] mt-0.5">{t('admin_panel_sub')}</p>
                            </div>
                        </button>
                    )}

                    <div className="px-5 mt-5 mb-2">
                        <button
                            type="button"
                            onClick={onLogout}
                            className="w-full py-3 text-[#e53935] text-[16px] hover:bg-[#e53935]/10 rounded-xl transition-colors"
                        >
                            {t('logout')}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4 bg-black/55 animate-fade-in" onClick={onClose}>
            {!showExpertModal &&
                (currentView === 'chat_settings'
                    ? renderChatSettings()
                    : currentView === 'wallet'
                      ? renderWallet()
                      : renderProfile())}

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
                showBioModal={showBioModal}
                setShowBioModal={setShowBioModal}
                editBio={editBio}
                setEditBio={setEditBio}
                handleSaveBio={handleSaveBio}
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
                    bgSettings={bgSettings}
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



