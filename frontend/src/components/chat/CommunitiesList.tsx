import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { useNotification } from '@/context/NotificationContext';

export default function CommunitiesList() {
    const { showSuccess } = useNotification();
    const [communities, setCommunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRegion, setSelectedRegion] = useState("");
    const [myUser, setMyUser] = useState<any>(null);

    const regions = [
        "Toshkent", "Andijon", "Buxoro", "Farg'ona", "Jizzax", "Xorazm",
        "Namangan", "Navoiy", "Qashqadaryo", "Samarqand", "Sirdaryo", "Surxondaryo", "Qoraqalpog'iston"
    ];

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setMyUser(user);
        if (user.wiloyat) setSelectedRegion(user.wiloyat);
    }, []);

    const fetchCommunities = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
            let url = API_URL + '/api/chats/communities?';
            if (selectedRegion) url += 'region=' + encodeURIComponent(selectedRegion) + '&';
            if (searchQuery) url += 'q=' + encodeURIComponent(searchQuery) + '&';

            const res = await fetch(url, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) setCommunities(await res.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCommunities();
    }, [selectedRegion, searchQuery]);

    const handleJoin = async (communityId: string) => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
            const res = await fetch(API_URL + '/api/chats/communities/' + communityId + '/join', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                showSuccess("Guruhga muvaffaqiyatli qo'shildingiz!");
                fetchCommunities();
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex-1 min-h-0 h-full flex flex-col gap-6 p-4 md:p-6 overflow-y-auto overscroll-y-contain custom-scrollbar">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-1">Hamjamiyatlar</h2>
                    <p className="text-white/50 text-sm">O'z hududingiz va qiziqishlaringiz bo'yicha guruhlarga qo'shiling</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Guruhlarni qidirish..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-12 py-4 text-white focus:border-blue-500 focus:outline-none transition-all shadow-inner"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <select
                    className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white focus:border-blue-500 focus:outline-none transition-all"
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                >
                    <option value="">Barcha viloyatlar</option>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {!selectedRegion && myUser?.wiloyat && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div>
                            <p className="text-white font-medium">Sizning hududingiz: <span className="text-blue-400">{myUser.wiloyat}</span></p>
                            <p className="text-white/40 text-xs">Hududiy guruhlarni ko'rishni xohlaysizmi?</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSelectedRegion(myUser.wiloyat)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all"
                    >
                        Filtrlash
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-48 bg-white/5 rounded-3xl animate-pulse"></div>
                    ))
                ) : communities.length > 0 ? (
                    communities.map((c: any) => {
                        const isJoined = c.participants.includes(myUser?.id);
                        return (
                            <GlassCard key={c.id || c._id} className="p-6 flex flex-col justify-between group hover:border-blue-500/50 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 ${c.category === 'Texnologiya' ? 'bg-blue-500/20 text-blue-400' :
                                            c.category === 'Biznes' ? 'bg-emerald-500/20 text-emerald-400' :
                                                c.category === 'Ta\'lim' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-purple-500/20 text-purple-400'
                                            }`}>
                                            {c.category === 'Texnologiya' ? '💻' :
                                                c.category === 'Biznes' ? '📊' :
                                                    c.category === 'Ta\'lim' ? '🎓' :
                                                        c.region ? '📍' : '🛡️'}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg border ${c.category === 'Texnologiya' ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                                                c.category === 'Biznes' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                                                    'text-purple-400 bg-purple-400/10 border-purple-400/20'
                                                }`}>
                                                {c.category || 'Hamjamiyat'}
                                            </span>
                                            {c.isPrivate && (
                                                <span className="text-[9px] text-white/30 flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                    Yopiq
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-white font-bold text-lg mb-1 group-hover:text-blue-400 transition-colors">{c.name}</h3>
                                    <p className="text-white/40 text-xs line-clamp-2 mb-4 group-hover:text-white/60 transition-colors">
                                        {c.description || `${c.name} hamjamiyatiga xush kelibsiz! Bu yerda foydali ma'lumotlar va tanishuvlar sizni kutmoqda.`}
                                    </p>
                                    <div className="flex items-center gap-3 text-white/30 text-[10px] font-bold uppercase tracking-widest mb-6">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span>{c.participantsCount || c.participants?.length || 0} a'zo</span>
                                        </div>
                                        <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                                        <div className="flex items-center gap-1">
                                            <span>{c.region || 'Global'}</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    disabled={isJoined}
                                    onClick={() => handleJoin(c.id || c._id)}
                                    className={`w-full py-3.5 rounded-2xl font-bold transition-all duration-300 ${isJoined
                                        ? 'bg-white/5 text-white/30 cursor-default border border-white/5'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 active:scale-95'
                                        }`}
                                >
                                    {isJoined ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                            A'zo bo'lingan
                                        </span>
                                    ) : "Guruhga qo'shilish"}
                                </button>
                            </GlassCard>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center text-white/20">
                        Hali guruhlar mavjud emas
                    </div>
                )}
            </div>
        </div>
    );
}

