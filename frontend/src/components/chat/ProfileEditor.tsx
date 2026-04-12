import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { useSocket } from '@/context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getUser, setUser } from '@/lib/auth-storage';

interface ProfileEditorProps {
    onClose: () => void;
    onSave: (data: any) => void;
}

const PRESET_AVATARS = [
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=1000&auto=format&fit=crop",
];

export default function ProfileEditor({ onClose, onSave }: ProfileEditorProps) {
    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { t } = useLanguage();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

    // Basic Info
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [birthday, setBirthday] = useState("");
    const [avatar, setAvatar] = useState(PRESET_AVATARS[0]);
    const [wiloyat, setWiloyat] = useState("");
    const [tuman, setTuman] = useState("");

    // Expert Info
    const [isExpert, setIsExpert] = useState(false);
    const [profession, setProfession] = useState("");
    const [specialization, setSpecialization] = useState("");
    const [experience, setExperience] = useState<number>(0);
    const [price, setPrice] = useState<number>(0);
    const [hours, setHours] = useState("");
    const [languages, setLanguages] = useState("");

    const [error, setError] = useState<string | null>(null);

    const [showAvatarSelector, setShowAvatarSelector] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Har ochilganda: avval localStorage, keyin backenddan profilni olib kelish
    useEffect(() => {
        const applyProfile = (user: any) => {
            if (!user) return;
            if (user.name) setName(user.name);
            if (user.username) setUsername(user.username);
            if (user.bio) setBio(user.bio);
            if (user.birthday) {
                try {
                    const date = new Date(user.birthday);
                    if (!isNaN(date.getTime())) {
                        const y = date.getFullYear();
                        const m = String(date.getMonth() + 1).padStart(2, '0');
                        const d = String(date.getDate()).padStart(2, '0');
                        setBirthday(`${y}-${m}-${d}`);
                    }
                } catch (e) {
                    console.error("Birthday parse error:", e);
                }
            }
            if (user.avatar || user.avatar_url) setAvatar(user.avatar || user.avatar_url);
            if (user.wiloyat) setWiloyat(user.wiloyat);
            if (user.tuman) setTuman(user.tuman);

            if (user.is_expert) setIsExpert(true);
            if (user.profession) setProfession(user.profession);
            if (user.specialization) setSpecialization(user.specialization);
            if (user.experience_years) setExperience(user.experience_years);
            if (user.service_price) setPrice(user.service_price);
            if (user.working_hours) setHours(user.working_hours);
            if (user.languages) setLanguages(user.languages);
        };

        // 1) Tez yuklanish uchun localStorage
        const cachedUser = JSON.parse(localStorage.getItem('user') || '{}');
        applyProfile(cachedUser);

        // 2) Eng so'nggi ma'lumotni backenddan olish
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${API_URL}/api/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) return;
                const data = await res.json();
                applyProfile(data);
                const oldUser = getUser() || {};
                setUser({ ...oldUser, ...data } as Record<string, unknown>);
            } catch (e) {
                console.error('Fetch profile error:', e);
            }
        };

        fetchProfile();
    }, [API_URL]);

    // Socket orqali real-time profil yangilanishi (masalan, admin tasdiqlaganda)
    useEffect(() => {
        if (!socket) return;

        const handleProfileUpdated = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const res = await fetch(`${API_URL}/api/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!res.ok) return;
                const data = await res.json();
                const oldUser = getUser() || {};
                const merged = { ...oldUser, ...data };
                setUser(merged as Record<string, unknown>);

                // Lokal formadagi maydonlarni yangilash
                setName(merged.name || '');
                setUsername(merged.username || '');
                setBio(merged.bio || '');
                if (merged.birthday) {
                    try {
                        const date = new Date(merged.birthday);
                        if (!isNaN(date.getTime())) {
                            const y = date.getFullYear();
                            const m = String(date.getMonth() + 1).padStart(2, '0');
                            const d = String(date.getDate()).padStart(2, '0');
                            setBirthday(`${y}-${m}-${d}`);
                        }
                    } catch (e) {
                        console.error('Birthday parse error (socket):', e);
                    }
                }
                if (merged.avatar || merged.avatar_url) setAvatar(merged.avatar || merged.avatar_url);
                setWiloyat(merged.wiloyat || '');
                setTuman(merged.tuman || '');
                setIsExpert(!!merged.is_expert);
                setProfession(merged.profession || '');
                setSpecialization(merged.specialization || '');
                setExperience(merged.experience_years || 0);
                setPrice(merged.service_price || 0);
                setHours(merged.working_hours || '');
                setLanguages(merged.languages || '');

                onSave(merged);
            } catch (e) {
                console.error('profile_updated socket handler error:', e);
            }
        };

        socket.on('profile_updated', handleProfileUpdated);
        return () => {
            socket.off('profile_updated', handleProfileUpdated);
        };
    }, [socket, API_URL, onSave]);

    const handleSave = async () => {
        setError(null);

        if (!name.trim()) {
            setError(t('required_name'));
            return;
        }

        if (!username.trim()) {
            setError(t('required_username'));
            return;
        }

        if (isExpert) {
            if (!profession.trim()) {
                setError("Ekspert sifatida kasbingizni (Profession) kiritish majburiy.");
                return;
            }
            if (!specialization.trim()) {
                setError("Ekspert yo'nalishlaringizni (Specialization) kiritish majburiy.");
                return;
            }
            if (!languages.trim()) {
                setError("Qaysi tillarda xizmat ko'rsatishingizni (Languages) kiritish majburiy.");
                return;
            }
            if (!hours.trim()) {
                setError("Ish vaqtingizni (Working Hours) ko'rsatish majburiy.");
                return;
            }
            if (!Number.isFinite(experience) || experience <= 0) {
                setError("Ekspert tajribasi (Experience) 0 dan katta bo'lishi kerak.");
                return;
            }
            if (!Number.isFinite(price) || price <= 0) {
                setError("Soatlik narx (Price) 0 dan katta bo'lishi kerak.");
                return;
            }
        }
        // Strip @ from username if present
        const cleanUsername = username.startsWith('@') ? username.substring(1) : username;

        const payload = {
            name,
            username: cleanUsername,
            bio,
            birthday,
            avatar_url: avatar,
            is_expert: isExpert,
            profession,
            specialization,
            experience_years: experience,
            service_price: price,
            working_hours: hours,
            languages,
            wiloyat,
            tuman
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const updatedData = { ...payload, avatar: avatar }; // Ensure consistent field name
                const oldUser = getUser() || {};
                const newUser = { ...oldUser, ...updatedData };
                setUser(newUser as Record<string, unknown>);
                showSuccess(t('success_update'));
                onSave(newUser); // Close modal
            } else {
                const err = await res.json();
                showError(err.message || 'Profilni yangilab bo\'lmadi');
            }
        } catch (e: any) {
            console.error('Profile update error:', e);
            showError('Server bilan bog\'lanishda xatolik: ' + (e.message || 'Tarmoq xatosi'));
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setAvatar(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-2xl px-3 sm:px-0"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm sm:max-w-md overflow-hidden relative shadow-2xl animate-scale-in z-10 border border-white/60 bg-white/80 backdrop-blur-2xl flex flex-col max-h-[90vh] rounded-[24px] sm:rounded-[30px]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/40 bg-white/10 backdrop-blur-xl flex-shrink-0">
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors">{t('cancel')}</button>
                    <h2 className="text-slate-900 font-semibold">{t('edit_profile')}</h2>
                    <button onClick={handleSave} className="px-3 py-1.5 rounded-full bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors">{t('save')}</button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto custom-scrollbar flex-1 p-4 sm:p-5 pb-8 space-y-5 sm:space-y-6 bg-gradient-to-b from-white/40 via-white/20 to-white/10">

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Avatar Section */}
                    <div className="flex flex-col items-center">
                        <div className="relative group">
                            <div
                                className="w-28 h-28 rounded-full p-[2px] bg-gradient-to-br from-blue-400 to-purple-500 cursor-pointer overflow-hidden shadow-xl"
                                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                            >
                                <img src={avatar} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-white/80" />
                            </div>
                            <div
                                className="absolute -bottom-1 -right-1 bg-[#3b82f6] p-2 rounded-full text-white cursor-pointer hover:bg-blue-600 shadow-lg border-2 border-[#0f172a]"
                                onClick={() => fileInputRef.current?.click()}
                                title="Upload from Gallery"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </div>
                        {showAvatarSelector && (
                            <div className="mt-4 flex gap-3 animate-fade-in px-2 overflow-x-auto w-full justify-center custom-scrollbar pb-2">
                                {PRESET_AVATARS.map((url, i) => (
                                    <button key={i} onClick={() => { setAvatar(url); setShowAvatarSelector(false); }} className={`relative w-12 h-12 rounded-full overflow-hidden border-2 transition-transform hover:scale-110 flex-shrink-0 ${avatar === url ? 'border-[#3b82f6]' : 'border-white/10'}`}>
                                        <img src={url} alt={`Preset ${i}`} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                        <p className="text-blue-600 text-xs font-medium mt-3">{t('upload_photo')}</p>
                    </div>

                    {/* Section: Basic Info + Preview */}
                    <div className="space-y-4 sm:space-y-5">
                        <div className="space-y-1">
                            <label className="text-slate-600 text-xs uppercase font-bold tracking-wider ml-1">{t('name')}</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t('name')} />
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <label className="text-slate-600 text-xs uppercase font-bold tracking-wider ml-1">Username</label>
                                <span className="text-slate-400 text-xs">@{username}</span>
                            </div>
                            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors" placeholder="username" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-slate-600 text-xs uppercase font-bold tracking-wider ml-1">{t('birthday')}</label>
                            <input
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-slate-600 text-xs uppercase font-bold tracking-wider ml-1">{t('bio')}</label>
                            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors resize-none" placeholder={t('bio')} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-1">
                                <label className="text-slate-600 text-xs uppercase font-bold tracking-wider ml-1">{t('viloyat')}</label>
                                <select
                                    value={wiloyat}
                                    onChange={(e) => setWiloyat(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors"
                                >
                                    <option value="">{t('select')}</option>
                                    <option value="Toshkent">Toshkent</option>
                                    <option value="Andijon">Andijon</option>
                                    <option value="Buxoro">Buxoro</option>
                                    <option value="Farg'ona">Farg'ona</option>
                                    <option value="Jizzax">Jizzax</option>
                                    <option value="Xorazm">Xorazm</option>
                                    <option value="Namangan">Namangan</option>
                                    <option value="Navoiy">Navoiy</option>
                                    <option value="Qashqadaryo">Qashqadaryo</option>
                                    <option value="Samarqand">Samarqand</option>
                                    <option value="Sirdaryo">Sirdaryo</option>
                                    <option value="Surxondaryo">Surxondaryo</option>
                                    <option value="Qoraqalpog'iston">Qoraqalpog'iston</option>
                                </select>
                            </div>
                             <div className="space-y-1">
                                <label className="text-slate-600 text-xs uppercase font-bold tracking-wider ml-1">{t('tuman')}</label>
                                <input value={tuman} onChange={(e) => setTuman(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none transition-colors" placeholder={t('tuman')} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Expert Mode Toggle + Form */}
                    <div className={`rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 border transition-all ${isExpert ? 'border-emerald-400 bg-emerald-50 shadow-sm' : 'border-slate-200 bg-white/70'}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-slate-900 font-semibold text-sm sm:text-base">{t('expert_mode')}</h3>
                                <p className="text-slate-500 text-[11px] sm:text-xs">
                                    {t('expert_mode_desc')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-medium ${isExpert ? 'text-emerald-700' : 'text-slate-400'}`}>
                                    {isExpert ? t('active') : t('inactive')}
                                </span>
                                <button
                                    onClick={() => setIsExpert(!isExpert)}
                                    className={`w-11 h-6 sm:w-12 sm:h-7 rounded-full transition-colors relative ${isExpert ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                >
                                    <div className={`w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full absolute top-1 transition-transform ${isExpert ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'}`}></div>
                                </button>
                            </div>
                        </div>

                        {isExpert && (
                            <div className="space-y-4 animate-fade-in-up border-t border-white/10 pt-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-slate-600 text-[11px] sm:text-xs font-semibold ml-1">
                                            {t('profession')}
                                        </label>
                                        <input
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                                            placeholder={t('profession')}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-600 text-[11px] sm:text-xs font-semibold ml-1">
                                            {t('experience')}
                                        </label>
                                        <input
                                            type="number"
                                            value={experience}
                                            onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                                            placeholder={t('experience')}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-slate-600 text-[11px] sm:text-xs font-semibold ml-1">
                                        {t('specialization')}
                                    </label>
                                    <input
                                        value={specialization}
                                        onChange={(e) => setSpecialization(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                                        placeholder={t('specialization')}
                                    />
                                    <p className="text-[10px] text-slate-500 ml-1">
                                        2–3 ta aniq yo&apos;nalish yozing – talaba sizni tezroq topadi.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1">
                                        <label className="text-slate-600 text-[11px] sm:text-xs font-semibold ml-1">
                                            {t('price')} (MALI/{t('hourly')})
                                        </label>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                                            placeholder="50"
                                        />
                                        <p className="text-[10px] text-slate-500 ml-1">
                                            Ko&apos;p mentorlar 30–80 MALI oralig&apos;ini tanlashadi. Juda past narx o&apos;zingizni qadrsizlantirishi mumkin.
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-slate-600 text-[11px] sm:text-xs font-semibold ml-1">
                                            {t('working_hours')}
                                        </label>
                                        <input
                                            value={hours}
                                            onChange={(e) => setHours(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                                            placeholder="09:00 - 18:00"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-slate-600 text-[11px] sm:text-xs font-semibold ml-1">
                                        {t('languages')}
                                    </label>
                                    <input
                                        value={languages}
                                        onChange={(e) => setLanguages(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-slate-900 focus:border-blue-500 focus:outline-none text-sm"
                                        placeholder={t('languages_list')}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}



