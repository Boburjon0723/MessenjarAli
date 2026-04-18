import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { GlassDatePicker } from '../ui/GlassDatePicker';
import { useSocket } from '@/context/SocketContext';
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
    Image as ImageIcon,
    Film,
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
    bgSettings?: { blur: number; image: string; darkMode: boolean };
    onUpdateBgBlur?: (val: number) => void;
    onUpdateBgImage?: (url: string) => void;
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
    onUpdateBgImage,
    onUpdateTheme
}: ProfileViewerProps) {
    const { socket } = useSocket();
    const [localUser, setLocalUser] = useState<any>(null);
    const [currentView, setCurrentView] = useState<'main' | 'chat_settings' | 'wallet'>('main');

    // Wallet State
    const [walletData, setWalletData] = useState({ available: 0, locked: 0, subscription_end_date: null as string | null });
    const [isSubscribing, setIsSubscribing] = useState(false);

    // Language State
    const [language, setLanguage] = useState<'uz' | 'ru' | 'en'>('ru');
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
    const [bioExpert, setBioExpert] = useState("");
    const [specialtyDesc, setSpecialtyDesc] = useState("");
    const [resumeUrl, setResumeUrl] = useState("");
    const [servicesJson, setServicesJson] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const diplomaRef = useRef<HTMLInputElement>(null);
    const certRef = useRef<HTMLInputElement>(null);
    const idRef = useRef<HTMLInputElement>(null);
    const selfieRef = useRef<HTMLInputElement>(null);
    const resumeRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            const storedLang = localStorage.getItem('app-lang');
            if (storedLang) setLanguage(storedLang as any);
            if (stored) {
                const parsed = JSON.parse(stored);
                setLocalUser(parsed);
                setBio(parsed.bio || "");
                setBirthday(parsed.birthday ? (() => {
                    const d = new Date(parsed.birthday);
                    if (isNaN(d.getTime())) return "";
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${y}-${m}-${day}`;
                })() : "");
                setIsExpert(parsed.is_expert || false);
                setVerifiedStatus(parsed.verified_status || 'none');
                setProfession(parsed.profession || "");
                setSpecializationDetails(parsed.specialization_details || "");
                setExperience(parsed.experience_years || 0);
                setHasDiploma(parsed.has_diploma || false);
                setInstitution(parsed.institution || "");
                setCurrentWorkplace(parsed.current_workplace || "");
                setDiplomaUrl(parsed.diploma_url || "");
                setCertificateUrl(parsed.certificate_url || "");
                setIdUrl(parsed.id_url || "");
                setSelfieUrl(parsed.selfie_url || "");
                const rawPrice = parsed.hourly_rate || parsed.service_price || 0;
                setPrice(parseFloat(rawPrice as any) || 0);
                setCurrency(parsed.currency || "MALI");
                setServiceLanguages(parsed.service_languages || "");
                setServiceFormat(parsed.service_format || "");
                setBioExpert(parsed.bio_expert || "");
                setSpecialtyDesc(parsed.specialty_desc || "");
                setResumeUrl(parsed.resume_url || "");
                try {
                    setServicesJson(parsed.services_json ? (typeof parsed.services_json === 'string' ? JSON.parse(parsed.services_json) : parsed.services_json) : []);
                } catch { setServicesJson([]); }
            }
        } catch (e) {
            console.error("Failed to load user profile", e);
        }
    }, [propUser]);

    useEffect(() => {
        if (propUser) {
            setLocalUser(propUser);
            if (propUser.birthday) {
                const d = new Date(propUser.birthday);
                if (!isNaN(d.getTime())) {
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setBirthday(`${y}-${m}-${day}`);
                }
            }
        }
    }, [propUser]);

    useEffect(() => {
        if (!socket) return;
        socket.on('profile_updated', (data: any) => {
            const oldUser = JSON.parse(localStorage.getItem('user') || '{}');
            const newUser = { ...oldUser, ...data };
            localStorage.setItem('user', JSON.stringify(newUser));
            setLocalUser(newUser);
        });
        socket.on('expert_status_updated', (data: { userId: string, status: string }) => {
            const oldUser = JSON.parse(localStorage.getItem('user') || '{}');
            if (oldUser.id === data.userId) {
                console.log('[ProfileViewer] Status updated from socket:', data.status);
                const newUser = { ...oldUser, verified_status: data.status, is_expert: data.status === 'approved' };
                localStorage.setItem('user', JSON.stringify(newUser));
                setLocalUser(newUser);
                setVerifiedStatus(data.status as any);
                setIsExpert(data.status === 'approved');
            }
        });
        return () => {
            socket.off('profile_updated');
            socket.off('expert_status_updated');
        };
    }, [socket]);

    const user = propUser || localUser || {};

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

    const handleSaveLanguage = (lang: 'uz' | 'ru' | 'en') => {
        setLanguage(lang);
        localStorage.setItem('app-lang', lang);
        setShowLanguageModal(false);
    };

    const handleSaveBio = (newBio: string) => {
        if (newBio !== user.bio) {
            if (socket) socket.emit('update_profile', { bio: newBio });
            const newUser = { ...user, bio: newBio };
            setLocalUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
        }
    };

    const handleSaveBirthday = (val: string) => {
        if (val !== birthday) {
            setBirthday(val);
            if (socket) socket.emit('update_profile', { birthday: val });
            const newUser = { ...user, birthday: val };
            setLocalUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
        }
    };

    const handleSaveName = () => {
        const payload = { name: editFirstName, surname: editLastName };
        if (socket) socket.emit('update_profile', payload);
        setShowNameModal(false);
    };

    const handleSaveUsername = () => {
        if (socket) socket.emit('update_profile', { username: editUsername });
        setShowUsernameModal(false);
    };

    const handleSaveExpertData = () => {
        const payload = {
            is_expert: isExpert,
            profession,
            specialization_details: specializationDetails,
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
            bio_expert: bioExpert,
            specialty_desc: specialtyDesc,
            resume_url: resumeUrl,
            services_json: JSON.stringify(servicesJson),
            verified_status: 'pending'
        };
        if (socket) socket.emit('update_profile', payload);
        setShowExpertModal(false);
        const newUser = { ...user, ...payload };
        setLocalUser(newUser);
        localStorage.setItem('user', JSON.stringify(newUser));
    };

    const handleDocumentUpload = (key: string, file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            if (key === 'diploma') setDiplomaUrl(base64);
            if (key === 'cert') setCertificateUrl(base64);
            if (key === 'id') setIdUrl(base64);
            if (key === 'selfie') setSelfieUrl(base64);
            if (key === 'resume') setResumeUrl(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setLocalUser({ ...user, avatar: base64 });
                if (socket) socket.emit('update_profile', { avatar: base64 });
            };
            reader.readAsDataURL(file);
        }
    };

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
                alert("Muvaffaqiyatli obuna bo'ldingiz!");
                fetchWallet();
                setVerifiedStatus('pending');
                setIsExpert(true);
            } else {
                alert(data.message || "Obuna bo'lishda xatolik yuz berdi. Balansingizni tekshiring.");
            }
        } catch (e) {
            alert('Tarmoq xatosi');
        } finally {
            setIsSubscribing(false);
        }
    };

    // --- RENDERERS ---

    const renderProfile = () => (
        <div
            className={`w-full h-full lg:h-auto lg:max-w-[420px] flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:rounded-[24px] shadow-3xl animate-scale-up border ${bgSettings?.darkMode ? 'bg-[#1e1e24]/70 backdrop-blur-[60px] border-white/5 text-white shadow-2xl' : 'backdrop-blur-[40px] bg-white/60 border-white text-gray-900'}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header with Big Image */}
            <div className="relative h-[220px] w-full overflow-hidden flex-shrink-0">
                <img
                    src={user.avatar || user.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop"}
                    className="w-full h-full object-cover brightness-75 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1c242f] via-transparent to-black/30"></div>

                <div className="absolute top-0 inset-x-0 p-4 pt-[max(1rem,env(safe-area-inset-top))] flex justify-between items-center z-10">
                    <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-md transition-all border border-white/10 flex items-center gap-1 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 lg:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                        <X className="h-5 w-5 hidden lg:block" />
                    </button>
                    <div className="flex gap-4">
                        <button onClick={() => setShowLanguageModal(true)} className="text-white/80 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-md transition-all flex items-center gap-2 px-3 border border-white/10">
                            <Languages className="h-4 w-4" />
                            <span className="text-[11px] font-bold uppercase">{language}</span>
                        </button>
                        <button className="text-white/80 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-md transition-all border border-white/10"><MoreVertical className="h-5 w-5" /></button>
                    </div>
                </div>

                <div className="absolute bottom-4 left-6 right-6 z-10">
                    <h2 className="text-white text-2xl font-bold leading-none">{user.name} {user.surname || ''}</h2>
                    <p className="text-blue-400 text-[13px] font-medium mt-1">в сети</p>
                </div>

                <button
                    onClick={handleAvatarClick}
                    className="absolute bottom-4 right-6 w-11 h-11 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-xl hover:bg-blue-600 transition-all transform active:scale-95 z-20"
                >
                    <Camera className="h-5 w-5" />
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                </button>
            </div>

            {verifiedStatus === 'pending' && (
                <div className="mx-6 mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div className="flex flex-col">
                        <span className="text-yellow-500 font-bold text-xs uppercase tracking-wider">Tasdiqlanishi kutilmoqda</span>
                        <span className="text-white/40 text-[10px]">Ma'lumotlaringiz moderator tomonidan ko'rib chiqilmoqda.</span>
                    </div>
                </div>
            )}

            <div className="overflow-y-auto custom-scrollbar flex-1 pb-8">
                {/* Info Items */}
                <div className="p-4 space-y-1">
                    <div className="flex items-center gap-6 px-4 py-3 hover:bg-white/5 rounded-[15px] cursor-default transition-colors group">
                        <Phone className="h-5 w-5 text-blue-400/80" />
                        <div className="flex flex-col">
                            <span className="text-white text-[15px]">{user.phone || '+998 -- --- -- --'}</span>
                            <span className="text-white/30 text-[12px]">Телефон</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 px-4 py-3 hover:bg-white/5 rounded-[15px] cursor-pointer group transition-colors"
                        onClick={() => { setEditUsername(user.username || ""); setShowUsernameModal(true); }}>
                        <AtSign className="h-5 w-5 text-blue-400/80" />
                        <div className="flex flex-col">
                            <span className="text-white text-[15px]">@{user.username || 'username'}</span>
                            <span className="text-white/30 text-[12px]">Имя пользователя</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6 px-4 py-3 hover:bg-white/5 rounded-[15px] transition-colors relative group cursor-pointer"
                        onClick={() => setShowDatePicker(true)}
                    >
                        <Calendar className="h-5 w-5 text-blue-400/80 group-hover:scale-110 transition-transform" />
                        <div className="flex flex-col flex-1">
                            <span className="text-white text-[15px]">
                                {birthday ? new Date(birthday).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) : (language === 'ru' ? 'Указать дату' : 'Sana tanlang')}
                                {birthday && calculateAge(birthday) !== null && ` (${calculateAge(birthday)} ${language === 'ru' ? 'лет' : 'yosh'})`}
                            </span>
                            <span className="text-white/30 text-[12px]">{language === 'ru' ? 'День рождения' : 'Tug\'ilgan kun'}</span>
                        </div>
                    </div>
                </div>

                <div className="h-[1px] bg-white/5 mx-6"></div>

                {/* Expert Status */}
                <div className="p-6">
                    <div className={`p-5 rounded-[20px] border transition-all cursor-pointer ${isExpert ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5' : 'bg-white/5 border-white/10 hover:border-white/20'}`} onClick={() => setShowExpertModal(true)}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Award className={`h-6 w-6 ${isExpert ? 'text-blue-400' : 'text-white/20'}`} />
                                <div className="flex flex-col">
                                    <h4 className="text-white font-bold text-[16px]">Mutaxassis rejimi</h4>
                                    {verifiedStatus === 'approved' && <span className="text-green-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Faollashtirilgan</span>}
                                    {verifiedStatus === 'pending' && <span className="text-yellow-500 text-[10px] font-bold uppercase tracking-wider">Tekshirilmoqda...</span>}
                                </div>
                            </div>
                            <div
                                className={`w-11 h-6 rounded-full relative transition-all duration-300 cursor-pointer ${isExpert ? 'bg-blue-500' : 'bg-white/10'}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const nextState = !isExpert;
                                    setIsExpert(nextState);
                                    if (nextState) setShowExpertModal(true);
                                    else {
                                        if (socket) socket.emit('update_profile', { is_expert: false });
                                    }
                                }}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isExpert ? 'left-[22px]' : 'left-1'}`} />
                            </div>
                        </div>
                        {isExpert && (
                            <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-white/30 text-[10px] uppercase font-bold block mb-1">Tajriba</span>
                                        <span className="text-white font-bold text-[14px]">{experience} yil</span>
                                    </div>
                                    <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                                        <span className="text-white/30 text-[10px] uppercase font-bold block mb-1">Narx (soat)</span>
                                        <span className="text-white font-bold text-[14px]">{price} {currency}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1 px-1">
                                    <span className="text-white/30 text-[10px] uppercase font-bold">Soha / Yo'nalish</span>
                                    <span className="text-white text-[13px] font-medium leading-tight">{profession || 'Tanlanmagan'} - {specializationDetails || '...'}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setShowExpertModal(true); }} className="w-full py-3 bg-blue-500/10 text-blue-400 text-[13px] font-bold rounded-xl hover:bg-blue-500/20 transition-all border border-blue-500/10">Profilni tahrirlash</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Shared Content Mockup */}
                <div className="px-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-white/40 text-[13px] font-bold uppercase tracking-wider">Shared Media</h4>
                        <span className="text-blue-400 text-[12px] font-bold cursor-pointer hover:underline">See All</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="aspect-square bg-white/5 rounded-lg flex items-center justify-center border border-white/5 group cursor-pointer hover:bg-white/10 transition-all">
                                {i === 1 ? <ImageIcon className="h-5 w-5 text-white/20 group-hover:text-blue-400" /> :
                                    i === 2 ? <Film className="h-5 w-5 text-white/20 group-hover:text-pink-400" /> :
                                        i === 3 ? <FileText className="h-5 w-5 text-white/20 group-hover:text-yellow-400" /> :
                                            <MoreVertical className="h-5 w-5 text-white/20 group-hover:text-white" />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderChatSettings = () => (
        <GlassCard
            className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-3xl animate-scale-up ${bgSettings?.darkMode ? 'lg:border-white/5 !bg-[#1e1e24]/70 !backdrop-blur-[60px] text-white shadow-2xl' : 'lg:border-white !bg-white/60 !backdrop-blur-[40px] text-gray-900'}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-4 p-4 px-6 border-b ${bgSettings?.darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <button onClick={() => setCurrentView('main')} className={`${bgSettings?.darkMode ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors p-1`}><X className="h-6 w-6 rotate-90" /></button>
                <h2 className="font-medium text-[19px]">Настройки чатов</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-8 pb-10">
                {/* DARK MODE TOGGLE */}
                <div className="space-y-4">
                    <h4 className="text-blue-500 text-xs font-bold uppercase tracking-widest ml-1">Theme</h4>
                    <div className={`rounded-2xl p-5 flex items-center justify-between border ${bgSettings?.darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex items-center gap-3">
                            <Moon className={`h-5 w-5 ${bgSettings?.darkMode ? 'text-white/50' : 'text-gray-500'}`} />
                            <span className="font-medium">{bgSettings?.darkMode ? 'Nochnoy rejim' : 'Kunduzgi rejim'}</span>
                        </div>
                        <div
                            className={`w-11 h-6 rounded-full relative transition-all duration-300 cursor-pointer ${bgSettings?.darkMode ? 'bg-blue-500' : 'bg-white/10'}`}
                            onClick={() => onUpdateTheme?.(!bgSettings?.darkMode)}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${bgSettings?.darkMode ? 'left-[22px]' : 'left-1'}`} />
                        </div>
                    </div>
                </div>

                {/* BLUR SLIDER */}
                <div className="space-y-4">
                    <div className={`p-5 rounded-2xl border ${bgSettings?.darkMode ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className={`text-xs font-bold uppercase tracking-widest ${bgSettings?.darkMode ? 'text-blue-500' : 'text-blue-600'}`}>Fon xiraligi (Blur)</h4>
                            <span className={`text-xs font-mono font-bold ${bgSettings?.darkMode ? 'text-white/40' : 'text-gray-500'}`}>{bgSettings?.blur}px</span>
                        </div>
                        <input
                            type="range" min="0" max="25" step="1"
                            value={bgSettings?.blur}
                            onChange={(e) => onUpdateBgBlur?.(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>

                {/* WALLPAPER SELECTOR */}
                <div className="space-y-4">
                    <h4 className={`text-xs font-bold uppercase tracking-widest ml-1 ${bgSettings?.darkMode ? 'text-blue-500' : 'text-blue-600'}`}>Fon rasmini o'zgartirish</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            "custom_upload",
                            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=2000",
                            "https://images.unsplash.com/photo-1501854140801-50d01698950b?q=80&w=2000",
                            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000"
                        ].map((url, i) => (
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
                                className={`aspect-video rounded-xl cursor-pointer border-2 transition-all hover:scale-105 active:scale-95 overflow-hidden flex flex-col items-center justify-center ${bgSettings?.image === url ? 'border-blue-500 shadow-lg shadow-blue-500/20' : `border-transparent ${bgSettings?.darkMode ? 'bg-white/5' : 'bg-gray-100'}`}`}>
                                {url === 'custom_upload' ? (
                                    <>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform ${bgSettings?.darkMode ? 'bg-white/10' : 'bg-white shadow-sm'}`}>
                                            <Plus className={`h-4 w-4 ${bgSettings?.darkMode ? 'text-white' : 'text-gray-600'}`} />
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase ${bgSettings?.darkMode ? 'text-white/40 group-hover:text-blue-400' : 'text-gray-500 group-hover:text-blue-500'}`}>Yuklash</span>
                                    </>
                                ) : (
                                    <div className="relative w-full h-full">
                                        <img src={url} className="w-full h-full object-cover" />
                                        {bgSettings?.image === url && (
                                            <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
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
            className={`w-full h-full lg:h-auto lg:max-w-[420px] !p-0 border-none lg:border flex flex-col lg:max-h-[85vh] overflow-hidden rounded-none lg:!rounded-[25px] shadow-3xl animate-scale-up ${bgSettings?.darkMode ? 'lg:border-white/5 !bg-[#1e1e24]/70 !backdrop-blur-[60px] text-white shadow-2xl' : 'lg:border-white !bg-white/60 !backdrop-blur-[40px] text-gray-900'}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`flex items-center gap-4 p-4 px-6 border-b ${bgSettings?.darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                <button onClick={() => setCurrentView('main')} className={`${bgSettings?.darkMode ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'} transition-colors p-1`}><X className="h-6 w-6 rotate-90" /></button>
                <h2 className="font-medium text-[19px]">Mening Hamyonim</h2>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6 pb-10">
                {/* Balance Cards */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="relative z-10 flex flex-col gap-1 text-center">
                        <span className="text-white/60 text-xs font-black uppercase tracking-widest">Mavjud Balans</span>
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
                            <span className="text-white font-bold">Kafillangan bandlovlar</span>
                            <span className="text-white/40 text-xs text-left">Darslar o'tilgunga qadar saqlanadi</span>
                        </div>
                    </div>
                    <div className="text-yellow-500 font-black">{walletData.locked} MALI</div>
                </div>

                {/* Subscription Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Award className="h-5 w-5" /></div>
                        <div className="flex flex-col h-full items-start justify-center">
                            <span className="text-white font-bold leading-none">Mutaxassis Obunasi</span>
                            <span className="text-blue-400 font-black text-xs uppercase tracking-widest leading-none mt-1">20 MALI / oy</span>
                        </div>
                    </div>

                    <p className="text-white/40 text-[11.5px] leading-relaxed pb-2">
                        Obuna - mutaxassislar ro'yxatida ko'rinish va mijozlardan to'lovlarni tizim ichida qabul qilish imkonini beradi.
                    </p>

                    <GlassButton
                        onClick={handleSubscribe}
                        disabled={isSubscribing || (!isExpert && walletData.available < 20)}
                        className={`w-full !rounded-xl py-3.5 font-bold transition-all ${isExpert && verifiedStatus !== 'none' ? '!bg-white/10 !text-white/40 cursor-not-allowed' : '!bg-emerald-600 !text-white'}`}
                    >
                        {isSubscribing ? 'Jarayonda...' : (isExpert && verifiedStatus !== 'none' ? 'Obuna Faol' : 'Obunani faollashtirish (20 MALI)')}
                    </GlassButton>
                </div>

            </div>
        </GlassCard>
    );

    const renderSettings = () => {
        const SETTINGS_ITEMS = [
            { id: 'account', icon: <User className="h-5 w-5" />, label: 'Мой аккаунт', subtext: "Ism va familiyani o'zgartirish" },
            { id: 'wallet', icon: <DollarSign className="h-5 w-5 text-emerald-400" />, label: 'Mening Hamyonim', subtext: "Balans, Escrow va Obuna" },
            { id: 'notifications', icon: <Bell className="h-5 w-5" />, label: 'Уведомления и звуки' },
            { id: 'privacy', icon: <Lock className="h-5 w-5" />, label: 'Конфиденциальность' },
            { id: 'chats', icon: <MessageSquare className="h-5 w-5" />, label: 'Настройки чатов' },
            { id: 'folders', icon: <Folder className="h-5 w-5" />, label: 'Папки с чатами' },
            { id: 'advanced', icon: <Sliders className="h-5 w-5" />, label: 'Продвинутые настройки' },
            { id: 'call', icon: <Volume2 className="h-5 w-5" />, label: 'Звук и камера' },
            { id: 'battery', icon: <Zap className="h-5 w-5" />, label: 'Заряд батареи и анимация' },
            ...(user.role === 'admin' ? [{ id: 'admin', icon: <Shield className="h-5 w-5 text-emerald-400" />, label: 'Admin Panel', subtext: "Ekspertlarni boshqarish" }] : []),
        ];

        return (
            <GlassCard
                className='test-class'
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
                {/* Header Aliased as "Настройки" */}
                <div className={`flex items - center justify - between p - 4 px - 6 border - b ${ bgSettings?.darkMode ? 'border-white/10' : 'border-gray-200' } `}>
                    <h2 className="font-medium text-[19px]">Настройки</h2>
                    <div className={`flex items - center gap - 5 ${ bgSettings?.darkMode ? 'text-white/50' : 'text-gray-400' } `}>
                        <button onClick={() => setShowLanguageModal(true)} className="hover:text-white transition-colors flex items-center gap-1.5 uppercase font-bold text-[13px] bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                            <Languages className="h-[18px] w-[18px]" /> {language}
                        </button>
                        <button className="hover:text-white transition-colors"><Search className="h-[22px] w-[22px]" /></button>
                        <button className="hover:text-white transition-colors"><MoreVertical className="h-[22px] w-[22px]" /></button>
                        <button onClick={onClose} className="hover:text-white transition-colors"><X className="h-[22px] w-[22px]" /></button>
                    </div>
                </div>

                <div className="overflow-y-auto custom-scrollbar flex-1 pb-6">
                    {/* User Profile Section (Row style from screenshot) */}
                    <div className="px-6 py-5 flex items-center gap-5 group cursor-pointer hover:bg-white/5 transition-all"
                        onClick={() => { setEditFirstName(user.name || ""); setEditLastName(user.surname || ""); setShowNameModal(true); }}>
                        <div className="w-[64px] h-[64px] rounded-full overflow-hidden border-2 border-white/10 shadow-xl relative">
                            <img
                                src={user.avatar || user.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop"}
                                alt="Avatar"
                                className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-[18px] leading-tight group-hover:text-blue-400 transition-colors">{user.name} {user.surname || ''}</h3>
                            <div className="flex flex-col mt-0.5 opacity-40">
                                <span className="text-[13px]">{user.phone || '+998 95 020 36 01'}</span>
                                <span className="text-[13px]">@{user.username || 'username'}</span>
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
                                <span className="text-white/30 group-hover:text-blue-400 transition-colors">{item.icon}</span>
                                <div className="flex-1 flex flex-col justify-center">
                                    <span className="text-white/90 group-hover:text-white text-[15px] font-medium">{item.label}</span>
                                    {item.subtext && <span className="text-white/20 text-[12px] mt-0.5">{item.subtext}</span>}
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="px-6 mt-8">
                        <button onClick={onLogout} className="w-full py-4 text-red-500/80 font-bold text-[15px] hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-red-500/5">Log Out</button>
                    </div>
                </div>
            </GlassCard>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            {currentView === 'chat_settings' ? renderChatSettings() :
                currentView === 'wallet' ? renderWallet() :
                    (mode === 'profile' ? renderProfile() : renderSettings())}

            {/* SHARED MODALS */}
            {showLanguageModal && (
                <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={(e) => { e.stopPropagation(); setShowLanguageModal(false); }}>
                    <GlassCard className="w-full max-w-[300px] bg-[#1c242f] p-4 rounded-[28px] border border-white/10 overflow-hidden shadow-3xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-white font-bold p-3 text-lg mb-2">Tilni tanlang / Язык</h3>
                        <div className="space-y-1">
                            {[{ id: 'uz', n: 'O\'zbekcha' }, { id: 'ru', n: 'Русский' }, { id: 'en', n: 'English' }].map(l => (
                                <button key={l.id}
                                    onClick={() => handleSaveLanguage(l.id as any)}
                                    className={`w - full flex items - center justify - between p - 4 rounded - xl transition - all ${ language === l.id ? 'bg-blue-500 text-white font-bold' : 'text-white/60 hover:bg-white/5' } `}>
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
                    <GlassCard className="w-full max-w-[340px] bg-[#1c242f] p-7 shadow-3xl animate-scale-in rounded-[28px] border border-white/10" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white font-bold text-xl mb-6">Profilni tahrirlash</h3>
                        <div className="space-y-5">
                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Ism</label>
                                <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Familiya</label>
                                <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none transition-all" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-10">
                            <GlassButton onClick={handleSaveName} className="w-full !bg-blue-500 !text-white !rounded-xl py-3.5 font-bold shadow-lg shadow-blue-500/20">Saqlash</GlassButton>
                            <button onClick={() => setShowNameModal(false)} className="w-full py-3 text-white/30 hover:text-white transition-colors text-[14px]">Bekor qilish</button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {showUsernameModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={(e) => { e.stopPropagation(); setShowUsernameModal(false); }}>
                    <GlassCard className="w-full max-w-[340px] bg-[#1c242f] p-7 shadow-3xl animate-scale-in rounded-[28px] border border-white/10" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white font-bold text-xl mb-4">Username</h3>
                        <div className="relative group">
                            <span className="absolute left-4 top-[15px] text-blue-500 font-bold text-lg group-focus-within:scale-110 transition-transform">@</span>
                            <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-9 pr-4 text-white focus:border-blue-500 focus:outline-none transition-all text-lg" placeholder="username" />
                        </div>
                        <p className="text-white/20 text-[12px] mt-4 leading-relaxed">Sizni @usernamer orqali messenjerda hamma topishi mumkin. Minimal 5 ta belgi.</p>
                        <div className="flex flex-col gap-3 mt-10">
                            <GlassButton onClick={handleSaveUsername} className="w-full !bg-blue-500 !text-white !rounded-xl py-3.5 font-bold">Saqlash</GlassButton>
                            <button onClick={() => setShowUsernameModal(false)} className="w-full py-3 text-white/30 hover:text-white transition-colors">Bekor qilish</button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {showExpertModal && (
                <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xl px-4 animate-fade-in" onClick={(e) => { e.stopPropagation(); setShowExpertModal(false); }}>
                    <GlassCard className="w-full max-w-[500px] max-h-[90vh] overflow-y-auto bg-[#1c242f] p-8 rounded-[32px] shadow-3xl border border-white/10 no-scrollbar" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-white font-bold text-2xl flex items-center gap-3">
                                <Award className="h-8 w-8 text-blue-400" />
                                Mutaxassis Profili
                            </h3>
                            <button onClick={() => setShowExpertModal(false)} className="text-white/30 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* SECTION 1: BASIC INFO */}
                            <div className="space-y-4">
                                <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest border-b border-white/5 pb-2">Asosiy ma'lumotlar</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Kasb turi</label>
                                        <select value={profession} onChange={(e) => setProfession(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none appearance-none">
                                            <option value="" className="bg-[#1c242f]">Tanlang...</option>
                                            <optgroup label="Huquq sohasi" className="bg-[#1c242f] text-blue-400 font-bold">
                                                <option value="Advokat">Advokat</option>
                                                <option value="Yurist">Yurist</option>
                                                <option value="Notarius maslahatchi">Notarius maslahatchi</option>
                                                <option value="Soliq maslahatchisi">Soliq maslahatchisi</option>
                                                <option value="Mehnat huquqi eksperti">Mehnat huquqi eksperti</option>
                                                <option value="Migratsiya maslahatchisi">Migratsiya maslahatchisi</option>
                                            </optgroup>
                                            <optgroup label="Psixologiya" className="bg-[#1c242f] text-blue-400 font-bold">
                                                <option value="Klinik psixolog">Klinik psixolog</option>
                                                <option value="Oila psixologi">Oila psixologi</option>
                                                <option value="Bolalar psixologi">Bolalar psixologi</option>
                                                <option value="Psixoterapevt">Psixoterapevt</option>
                                                <option value="Stress / depressiya mutaxassisi">Stress / depressiya mutaxassisi</option>
                                                <option value="Career coach">Career coach</option>
                                            </optgroup>
                                            <optgroup label="Biznes va moliya" className="bg-[#1c242f] text-blue-400 font-bold">
                                                <option value="Biznes konsultant">Biznes konsultant</option>
                                                <option value="Startap mentori">Startap mentori</option>
                                                <option value="Marketing strateg">Marketing strateg</option>
                                                <option value="SMM mutaxassis">SMM mutaxassis</option>
                                                <option value="Moliyaviy maslahatchi">Moliyaviy maslahatchi</option>
                                                <option value="Investitsiya eksperti">Investitsiya eksperti</option>
                                            </optgroup>
                                            <optgroup label="Tibbiyot" className="bg-[#1c242f] text-blue-400 font-bold">
                                                <option value="Umumiy shifokor">Umumiy shifokor (online)</option>
                                                <option value="Dietolog">Dietolog</option>
                                                <option value="Endokrinolog">Endokrinolog</option>
                                                <option value="Dermatolog">Dermatolog</option>
                                                <option value="Sport shifokori">Sport shifokori</option>
                                            </optgroup>
                                            <optgroup label="IT va texnologiya" className="bg-[#1c242f] text-blue-400 font-bold">
                                                <option value="Dasturchi mentor">Dasturchi mentor</option>
                                                <option value="UX/UI maslahatchi">UX/UI maslahatchi</option>
                                                <option value="DevOps konsultant">DevOps konsultant</option>
                                                <option value="Kiberxavfsizlik eksperti">Kiberxavfsizlik eksperti</option>
                                                <option value="AI bo‘yicha konsultant">AI bo‘yicha konsultant</option>
                                            </optgroup>
                                            <option value="Other" className="bg-[#1c242f]">Boshqa</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Mutaxassislik yo'nalishi</label>
                                        <input value={specializationDetails} onChange={(e) => setSpecializationDetails(e.target.value)} placeholder="Masalan: Klinik psixologiya, Oila va nikoh..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Ish tajribasi (yil)</label>
                                            <input type="number" value={experience || 0} onChange={(e) => setExperience(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Diplom bormi?</label>
                                            <div className="flex gap-2">
                                                <button onClick={() => setHasDiploma(true)} className={`flex - 1 py - 3.5 rounded - xl border transition - all font - bold text - xs ${ hasDiploma ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/40' } `}>HA</button>
                                                <button onClick={() => setHasDiploma(false)} className={`flex - 1 py - 3.5 rounded - xl border transition - all font - bold text - xs ${ !hasDiploma ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/10 text-white/40' } `}>YO'Q</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: EDUCATION & WORK */}
                            <div className="space-y-4">
                                <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest border-b border-white/5 pb-2">Ta'lim va Ish joyi</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Ta'lim muassasasi nomi</label>
                                        <input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Masalan: TATU, O'zMU..." className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Ish joyi (hozirgi)</label>
                                        <input value={currentWorkplace} onChange={(e) => setCurrentWorkplace(e.target.value)} placeholder="Kompaniya yoki muassasa nomi" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none" />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: DOCUMENTS */}
                            <div className="space-y-4">
                                <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest border-b border-white/5 pb-2">Hujjatlar (Tasdiqlash uchun)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Diplom rasmi', key: 'diploma', icon: <FileText className="h-5 w-5" />, ref: diplomaRef, url: diplomaUrl },
                                        { label: 'Sertifikat', key: 'cert', icon: <Award className="h-5 w-5" />, ref: certRef, url: certificateUrl },
                                        { label: 'Pasport / ID', key: 'id', icon: <UserCheck className="h-5 w-5" />, ref: idRef, url: idUrl },
                                        { label: 'Selfie (anti-fake)', key: 'selfie', icon: <Camera className="h-5 w-5" />, ref: selfieRef, url: selfieUrl },
                                        { label: 'Rezyume (PDF)', key: 'resume', icon: <FileText className="h-5 w-5 text-indigo-400" />, ref: resumeRef, url: resumeUrl, accept: '.pdf' }
                                    ].map((doc) => (
                                        <div key={doc.key} className="relative group">
                                            <button
                                                onClick={() => doc.ref.current?.click()}
                                                className={`w - full flex flex - col items - center justify - center p - 4 rounded - 2xl border border - dashed transition - all ${ doc.url ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/10 hover:border-blue-500/50 hover:bg-white/10' } `}
                                            >
                                                <div className={`p - 3 rounded - full mb - 2 transition - colors ${ doc.url ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30 group-hover:text-blue-400' } `}>{doc.icon}</div>
                                                <span className={`text - [10px] uppercase font - bold ${ doc.url ? 'text-emerald-400' : 'text-white/40' } `}>{doc.url ? 'Yuklangan' : doc.label}</span>
                                            </button>
                                            <input
                                                type="file"
                                                ref={doc.ref as any}
                                                className="hidden"
                                                accept={doc.accept || "image/*"}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDocumentUpload(doc.key, file);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SECTION 4: PRICING & FORMAT */}
                            <div className="space-y-4">
                                <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest border-b border-white/5 pb-2">Xizmat va Narxlar</h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">1 soatlik narx</label>
                                            <input type="number" value={price || 0} onChange={(e) => setPrice(parseInt(e.target.value) || 0)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Valyuta</label>
                                            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none appearance-none">
                                                <option value="MALI" className="bg-[#1c242f]">MALI</option>
                                                <option value="UZS" className="bg-[#1c242f]">UZS</option>
                                                <option value="USD" className="bg-[#1c242f]">USD</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Xizmat ko'rsatish tili</label>
                                        <input value={serviceLanguages} onChange={(e) => setServiceLanguages(e.target.value)} placeholder="Masalan: O'zbek, Rus, Ingliz" className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Xizmat turi</label>
                                        <div className="flex gap-2">
                                            {['Online', 'Video', 'Chat'].map(fmt => (
                                                <button key={fmt} onClick={() => setServiceFormat(fmt)} className={`flex - 1 py - 3 rounded - lg border transition - all text - [11px] font - bold ${ serviceFormat === fmt ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/30' } `}>{fmt}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 5: BIO & DESC */}
                            <div className="space-y-4">
                                <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest border-b border-white/5 pb-2">Batafsil ma'lumot</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">O'zi haqida (Bio)</label>
                                        <textarea value={bioExpert} onChange={(e) => setBioExpert(e.target.value)} placeholder="Qisqacha o'zingiz haqingizda..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none min-h-[100px] resize-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">Mutaxassislik tavsifi</label>
                                        <textarea value={specialtyDesc} onChange={(e) => setSpecialtyDesc(e.target.value)} placeholder="Yutuqlaringiz va tajribangiz haqida batafsil..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white focus:border-blue-500 focus:outline-none min-h-[120px] resize-none" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sticky bottom-0 bg-[#1c242f]/80 backdrop-blur-md pt-8 pb-2 mt-8 flex flex-col gap-3">
                            <GlassButton onClick={handleSaveExpertData} className="w-full !bg-blue-500 !text-white !rounded-2xl py-4 font-bold shadow-xl shadow-blue-500/20">Saqlash va Tasdiqlashga yuborish</GlassButton>
                            <button onClick={() => setShowExpertModal(false)} className="w-full py-3 text-white/30 hover:text-white transition-colors text-sm">Bekor qilish</button>
                        </div>
                    </GlassCard>
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
        </div>
    );
}


