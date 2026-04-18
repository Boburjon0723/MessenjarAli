'use client';
import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';

// Types
interface User {
    id: string;
    name: string;
    surname: string;
    username?: string;
    phone?: string;
    email?: string;
    role: string;
    is_active: boolean;
    phone_verified?: boolean;
    avatar_url?: string;
    wallet?: {
        balance: string;
    };
}

interface TopUp {
    id: string;
    amount: string;
    name: string;
    phone?: string;
    email?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

interface Transaction {
    id: string;
    created_at: string;
    type: string;
    sender_name?: string;
    receiver_name: string;
    amount: string;
    status: string;
}

interface JobCategory {
    id: string;
    name_uz: string;
    name_ru: string;
    icon: string;
    publication_price_mali: string;
}

interface AdminLoginAudit {
    id: string;
    user_id: string | null;
    phone_or_email: string;
    ip_address?: string | null;
    user_agent?: string | null;
    success: boolean;
    reason?: string | null;
    created_at: string;
    name?: string;
    surname?: string;
    email?: string;
    phone?: string;
    role?: string;
}

interface Expert {
    id: string;

    name: string;
    surname: string;
    username: string;
    profession: string;
    bio_expert?: string;
    avatar_url?: string;
    hourly_rate: string;
    currency: string;
    experience_years: string;
    institution?: string;
    specialization_details?: string;
    service_languages?: string;
    service_format?: string;
    has_diploma: boolean;
    diploma_url?: string;
    id_url?: string;
    selfie_url?: string;
    certificate_url?: string;
    resume_url?: string;
    anketa_url?: string;
    verified_status: 'pending' | 'approved' | 'rejected';
}

interface DisputedDeal {
    id: string;
    chat_id: string;
    amount: string;
    status: string;
    client_id: string;
    client_name: string;
    expert_id: string;
    expert_name: string;
    created_at: string;
    updated_at: string;
}

export default function AdminPanel() {
    const [authorized, setAuthorized] = useState(false);
    const [loading, setLoading] = useState(true);

    // Login State
    const [loginPhone, setLoginPhone] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Dashboard State
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState<User[]>([]);
    const [topUps, setTopUps] = useState<TopUp[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [pendingExperts, setPendingExperts] = useState<Expert[]>([]);
    const [verifiedExperts, setVerifiedExperts] = useState<Expert[]>([]);
    const [expertTab, setExpertTab] = useState('pending'); // 'pending' | 'verified'
    const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
    const [newCategory, setNewCategory] = useState({ name_uz: '', name_ru: '', icon: 'Briefcase', price: '100' });
    const [platformSettings, setPlatformSettings] = useState({
        expert_subscription_fee: 20,
        commission_rate: 10,
        admin_card_number: ''
    });
    const [systemStats, setSystemStats] = useState({
        system_treasury_balance: 0,
        total_user_balance: 0,
        total_fees_collected: 0,
        total_locked_balance: 0,
        mentor_escrow_pending: 0,
        mentor_payout_completed: 0
    });
    const [disputedDeals, setDisputedDeals] = useState<DisputedDeal[]>([]);
    const [desktopDownloadUrl, setDesktopDownloadUrl] = useState<string | null>(null);
    const [desktopVersion, setDesktopVersion] = useState<string | null>(null);
    const [desktopFile, setDesktopFile] = useState<File | null>(null);
    const [desktopUploading, setDesktopUploading] = useState(false);
    const [desktopUploadProgress, setDesktopUploadProgress] = useState<number | null>(null);
    const [desktopUrlInput, setDesktopUrlInput] = useState('');
    const [desktopSavingUrl, setDesktopSavingUrl] = useState(false);
    const [adminLogins, setAdminLogins] = useState<AdminLoginAudit[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null | undefined>(null);

    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-37a60.up.railway.app';

    useEffect(() => {
        checkAdminAccess();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!authorized) return;
        if (activeTab !== 'settings' && activeTab !== 'dashboard') return;
        const token = localStorage.getItem('token');
        if (!token) return;
        // Open settings/dashboard -> always re-fetch latest numbers from server.
        fetchData(token);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, authorized]);

    const checkAdminAccess = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            // Try to fetch users. If 403, not admin.
            const res = await fetch(`${API_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setAuthorized(true);
                fetchData(token);
            } else {
                setLoading(false);
            }
        } catch {
            setLoading(false);
        }
    };

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');

        const trimmedPhone = loginPhone.trim();
        const numericPhone = trimmedPhone.replace(/\D/g, '');

        if (!trimmedPhone || !loginPassword) {
            setLoginError('Telefon raqam va parolni kiriting.');
            return;
        }

        if (numericPhone.length < 9) {
            setLoginError('Telefon raqamni to‘liq kiriting.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: trimmedPhone, password: loginPassword })
            });
            const data = await res.json();

            if (res.ok) {
                if (!data.user || data.user.role !== 'admin') {
                    setLoginError('Bu akkaunt admin huquqlariga ega emas.');
                    return;
                }
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setAuthorized(true);
                fetchData(data.token);
            } else {
                if (res.status === 401) {
                    setLoginError('Telefon raqam yoki parol noto‘g‘ri.');
                } else if (res.status === 403) {
                    setLoginError('Bu akkaunt uchun admin panelga kirish taqiqlangan.');
                } else {
                    setLoginError(data.message || 'Kirishda xatolik yuz berdi.');
                }
            }
        } catch {
            setLoginError('Serverga ulanishda xatolik. Internetni tekshirib qayta urinib ko‘ring.');
        }
    };

    const fetchData = async (token: string) => {
        setLoading(true);
        try {
            const [usersRes, topUpsRes, txRes, expertsRes, verifiedRes, categoriesRes, loginsRes, disputesRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/topups`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/experts/pending`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/experts/verified`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/jobs/categories`),
                fetch(`${API_URL}/api/admin/logins?limit=200`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/admin/escrow/disputes`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (usersRes.ok) setUsers(await usersRes.json());
            if (topUpsRes.ok) setTopUps(await topUpsRes.json());
            if (txRes.ok) setTransactions(await txRes.json());
            if (expertsRes.ok) setPendingExperts(await expertsRes.json());
            if (verifiedRes.ok) setVerifiedExperts(await verifiedRes.json());
            if (categoriesRes.ok) setJobCategories(await categoriesRes.json());
            if (loginsRes.ok) setAdminLogins(await loginsRes.json());
            if (disputesRes.ok) setDisputedDeals(await disputesRes.json());

            // Fetch platform settings (admin)
            try {
                const settingsRes = await fetch(`${API_URL}/api/admin/settings`, { headers: { Authorization: `Bearer ${token}` } });
                if (settingsRes.ok) {
                    const settings = await settingsRes.json();
                    const fee = settings.expert_subscription_fee != null ? Number(settings.expert_subscription_fee) : 20;
                    const rate = settings.commission_rate != null ? Number(settings.commission_rate) * 100 : 10;
                    const adminCard = settings.admin_card_number ? String(settings.admin_card_number) : '';
                    setPlatformSettings({ expert_subscription_fee: fee, commission_rate: rate, admin_card_number: adminCard });
                    setSystemStats({
                        system_treasury_balance: Number(settings.system_treasury_balance || 0),
                        total_user_balance: Number(settings.total_user_balance || 0),
                        total_fees_collected: Number(settings.total_fees_collected || 0),
                        total_locked_balance: Number(settings.total_locked_balance || 0),
                        mentor_escrow_pending: Number(settings.mentor_escrow_pending || 0),
                        mentor_payout_completed: Number(settings.mentor_payout_completed || 0)
                    });
                }
            } catch {
                /* defaults */
            }

            // Fetch desktop app download info (public endpoint)
            try {
                const desktopRes = await fetch(`${API_URL}/api/desktop`);
                if (desktopRes.ok) {
                    const desktopData = await desktopRes.json();
                    const url = desktopData?.url || '';
                    const version = desktopData?.version || '';
                    setDesktopDownloadUrl(url || null);
                    setDesktopUrlInput(url);
                    setDesktopVersion(version || null);
                }
            } catch {
                /* desktop URL ixtiyoriy */
            }

            // Optional: Fetch settings if endpoint exists
        } catch { /* defaults */ }
    };

    const handleApproveTopUp = async (requestId: string) => {
        const ok = await confirm({
            title: "To'lovni tasdiqlash",
            description: "Haqiqatan ham ushbu to'lovni tasdiqlaysizmi?",
            confirmLabel: "Tasdiqlash",
            cancelLabel: "Bekor qilish"
        });
        if (!ok) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/admin/topups/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ requestId })
            });
            if (res.ok) {
                showSuccess('To\'lov muvaffaqiyatli tasdiqlandi!');
                fetchData(token!);
            } else {
                const err = await res.json();
                showError('Xato: ' + err.message);
            }
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleRejectTopUp = async (requestId: string) => {
        const ok = await confirm({
            title: "Rad etish",
            description: "Ushbu to'lovni rad etmoqchimisiz?",
            variant: 'danger',
            confirmLabel: "Rad etish"
        });
        if (!ok) return;

        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/api/admin/topups/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ requestId })
            });
            fetchData(token!);
            showSuccess('To\'lov rad etildi.');
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        const token = localStorage.getItem('token');
        const newStatus = currentStatus ? 'blocked' : 'active';
        
        const ok = await confirm({
            title: "Holatni o'zgartirish",
            description: `Foydalanuvchini ${newStatus === 'blocked' ? 'bloklamoqchimisiz' : 'faollashtirmoqchimisiz'}?`,
            variant: newStatus === 'blocked' ? 'danger' : 'default'
        });
        if (!ok) return;

        try {
            await fetch(`${API_URL}/api/admin/users/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId, status: newStatus })
            });
            fetchData(token!);
            showSuccess(`Foydalanuvchi muvaffaqiyatli ${newStatus === 'blocked' ? 'bloklandi' : 'faollashtirildi'}.`);
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleVerifyUserPhone = async (userId: string) => {
        const token = localStorage.getItem('token');
        const ok = await confirm({
            title: "Foydalanuvchini tasdiqlash",
            description: "Ushbu foydalanuvchining telefon raqamini qo'lda tasdiqlamoqchimisiz?",
            variant: 'default'
        });
        if (!ok) return;

        try {
            const res = await fetch(`${API_URL}/api/admin/users/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                showSuccess('Foydalanuvchi muvaffaqiyatli tasdiqlandi!');
                fetchData(token!);
            } else {
                const err = await res.json();
                showError(err.message || 'Tasdiqlashda xatolik yuz berdi');
            }
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleVerifyExpert = async (userId: string, status: 'approved' | 'rejected') => {
        const ok = await confirm({
            title: "Expert tasdig'i",
            description: `Expert statusini ${status === 'approved' ? 'tasdiqlamoqchimisiz' : 'rad etmoqchimisiz'}?`,
            variant: status === 'rejected' ? 'danger' : 'default'
        });
        if (!ok) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/admin/experts/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId, status })
            });
            if (res.ok) {
                showSuccess('Muvaffaqiyatli bajarildi!');
                fetchData(token!);
            } else {
                const err = await res.json();
                showError('Xato: ' + err.message);
            }
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleCreateCategory = async () => {
        const trimmedUz = newCategory.name_uz.trim();
        const trimmedRu = newCategory.name_ru.trim();
        const trimmedPrice = newCategory.price.trim();

        if (!trimmedUz || !trimmedRu || !trimmedPrice) {
            showError('Nomi (UZ), Nomi (RU) va Narxi maydonlari majburiy.');
            return;
        }

        const priceNumber = Number(trimmedPrice);
        if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
            showError('Narx musbat son bo‘lishi kerak.');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/jobs/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    name_uz: trimmedUz,
                    name_ru: trimmedRu,
                    icon: newCategory.icon || 'Briefcase',
                    publication_price_mali: String(priceNumber)
                })
            });
            if (res.ok) {
                showSuccess('Kategoriya qo\'shildi!');
                setNewCategory({ name_uz: '', name_ru: '', icon: 'Briefcase', price: '100' });
                fetchData(token!);
            } else {
                const err = await res.json();
                showError(err.message || 'Kategoriya qo‘shishda xatolik yuz berdi.');
            }
        } catch {
            showError('Server bilan aloqa qilishda xatolik yuz berdi.');
        }
    };

    const handleUpdateSettings = async () => {
        const fee = platformSettings.expert_subscription_fee;
        const rate = platformSettings.commission_rate;
        if (!Number.isFinite(fee) || fee < 0 || fee > 1_000_000) {
            showError('Ekspertni tasdiqlash to‘lovi 0 va 1 000 000 oralig‘ida bo‘lishi kerak.');
            return;
        }
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
            showError('Platform komissiyasi 0 dan 100% gacha bo‘lishi kerak.');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    expert_subscription_fee: fee,
                    commission_rate: rate / 100,
                    admin_card_number: platformSettings.admin_card_number.trim()
                })
            });
            if (res.ok) {
                showSuccess('Sozlamalar saqlandi!');
            } else {
                showError('Xato yuz berdi (Endpoint mavjud emas bo\'lishi mumkin)');
            }
        } catch {
            showError('Tizim xatosi');
        }
    };

    const handleResolveDispute = async (dealId: string, resolution: 'release' | 'refund') => {
        const ok = await confirm({
            title: "Nizoni hal qilish",
            description: `Nizoni ${resolution === 'release' ? 'Mutaxassis foydasiga (pul o\'tkazish)' : 'Mijoz foydasiga (pulni qaytarish)'} orqali hal qilmoqchimisiz?`,
            variant: resolution === 'refund' ? 'danger' : 'default'
        });
        if (!ok) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/api/admin/escrow/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ dealId, resolution })
            });
            if (res.ok) {
                showSuccess('Muvaffaqiyatli hal qilindi!');
                fetchData(token!);
            } else {
                const err = await res.json();
                showError('Xato: ' + err.message);
            }
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleUploadDesktopApp = async () => {
        if (!desktopFile) {
            showError('.exe faylini tanlang.');
            return;
        }

        if (!desktopFile.name.toLowerCase().endsWith('.exe')) {
            showError('Faqat Windows uchun .exe faylini yuklang.');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showError('Tizimga qayta kiring (Token topilmadi).');
            return;
        }

        const formData = new FormData();
        formData.append('files', desktopFile);

        setDesktopUploading(true);
        setDesktopUploadProgress(0);

        try {
            // XMLHttpRequest orqali yuklanish foizini kuzatamiz
            const uploadUrl = `${API_URL}/api/media/upload`;

            const uploadPromise = new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', uploadUrl, true);

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setDesktopUploadProgress(percent);
                    }
                };

                xhr.onreadystatechange = () => {
                    if (xhr.readyState === XMLHttpRequest.DONE) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const json = JSON.parse(xhr.responseText || '{}');
                                resolve(json);
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(formData);
            });

            const uploadData = await uploadPromise;

            if (!uploadData?.files || !uploadData.files[0]?.url) {
                showError(uploadData?.message || 'Faylni yuklashda xatolik yuz berdi.');
                return;
            }

            const url = uploadData.files[0].url as string;

            const saveRes = await fetch(`${API_URL}/api/desktop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ url, version: desktopVersion || undefined }),
            });

            const saveData = await saveRes.json();
            if (!saveRes.ok) {
                showError(saveData?.message || 'Desktop yuklab olish havolasini saqlashda xatolik.');
                return;
            }

            setDesktopDownloadUrl(url);
            setDesktopUploadProgress(100);
            showSuccess('Desktop ilova muvaffaqiyatli yangilandi!');
        } catch {
            showError('Server bilan aloqa qilishda xatolik yuz berdi.');
        } finally {
            setDesktopUploading(false);
            setTimeout(() => setDesktopUploadProgress(null), 1500);
        }
    };

    const handleSaveDesktopUrl = async () => {
        const trimmed = desktopUrlInput.trim();
        if (!trimmed) {
            showError('Havolani kiriting.');
            return;
        }
        if (!/^https?:\/\//i.test(trimmed)) {
            showError('Havola http yoki https bilan boshlanishi kerak.');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            showError('Tizimga qayta kiring (Token topilmadi).');
            return;
        }

        setDesktopSavingUrl(true);
        try {
            const res = await fetch(`${API_URL}/api/desktop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ url: trimmed, version: desktopVersion || undefined }),
            });
            const data = await res.json();
            if (!res.ok) {
                showError(data?.message || 'Havolani saqlashda xatolik yuz berdi.');
                return;
            }

            setDesktopDownloadUrl(trimmed);
            showSuccess('Havola muvaffaqiyatli saqlandi.');
        } catch {
            showError('Server bilan aloqa qilishda xatolik yuz berdi.');
        } finally {
            setDesktopSavingUrl(false);
        }
    };

    const ImageModal = () => (
        selectedImage ? (
            <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
                <div className="relative max-w-4xl w-full h-full flex items-center justify-center">
                    <img src={selectedImage} alt="Document" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    <button className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur-md transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-2 rounded-full backdrop-blur-md text-white/60 text-sm">
                        Rasm yopish uchun istalgan joyga bosing
                    </div>
                </div>
            </div>
        ) : null
    );

    if (loading && !authorized) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-white font-medium animate-pulse">Admin Panel yuklanmoqda...</div>
        </div>
    );

    if (!authorized) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/5 w-full max-w-md shadow-3xl">
                    <h1 className="text-3xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2 text-center">ExpertLine Admin</h1>
                    <p className="text-slate-500 text-center mb-8">Tizimga kirish uchun ruxsat kerak</p>
                    <form onSubmit={handleAdminLogin} className="space-y-5">
                        <div className="space-y-1">
                            <label className="block text-slate-400 text-xs uppercase tracking-widest font-bold ml-1">Telefon raqam</label>
                            <input
                                type="text"
                                value={loginPhone}
                                onChange={e => setLoginPhone(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none transition-all"
                                placeholder="+998..."
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="block text-slate-400 text-xs uppercase tracking-widest font-bold ml-1">Parol</label>
                            <input
                                type="password"
                                value={loginPassword}
                                onChange={e => setLoginPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 focus:border-indigo-500 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none transition-all"
                                placeholder="********"
                            />
                        </div>
                        {loginError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center">
                                {loginError}
                            </div>
                        )}
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20">
                            Dashboardga kirish
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans">
            <ImageModal />
            {/* Header */}
            <header className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/20">M</div>
                    <h1 className="text-xl font-bold bg-linear-to-r from-white to-white/60 bg-clip-text text-transparent">Admin Control</h1>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-slate-400 text-sm hidden md:block">Bugun: {new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' })}</span>
                    <button onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('refreshToken'); localStorage.removeItem('user'); window.location.reload(); }} className="px-4 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 rounded-xl text-sm font-medium transition-all">Logout</button>
                </div>
            </header>

            <div className="max-w-350 mx-auto p-6">
                {/* Navigation Tabs */}
                <nav className="flex flex-wrap gap-2 mb-8 bg-white/5 p-1.5 rounded-2xl border border-white/5 w-fit">
                    {[
                        { id: 'dashboard', label: 'Dashboard', count: null },
                        { id: 'users', label: 'Foydalanuvchilar', count: users.length },
                        { id: 'topups', label: 'Top-Up', count: topUps.filter(t => t.status === 'pending').length },
                        { id: 'transactions', label: 'Tranzaksiyalar', count: null },
                        { id: 'experts', label: 'Ekspertlar', count: pendingExperts.length },
                        { id: 'jobs', label: 'Ishlar/Narxlar', count: jobCategories.length },
                        { id: 'admin-logins', label: 'Admin kirishlari', count: adminLogins.length },
                        { id: 'disputes', label: 'Nizolar', count: disputedDeals.length },
                        { id: 'settings', label: 'Sozlamalar', count: null }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            {tab.label}
                            {tab.id === 'experts' ? (
                                pendingExperts.length > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full bg-red-500 text-white`}>
                                        {pendingExperts.length}
                                    </span>
                                )
                            ) : tab.count !== null && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-800'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Umumiy foydalanuvchilar</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold">{users.length}</span>
                                <span className="text-emerald-500 text-sm font-bold mb-1">+12%</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Kutilayotgan to&apos;lovlar</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-amber-500">{topUps.filter(t => t.status === 'pending').length}</span>
                                <span className="text-slate-500 text-sm mb-1">ta ariza</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Tranzaksiyalar</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-emerald-500">{transactions.length}</span>
                                <span className="text-emerald-500 text-sm font-bold mb-1">jami</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Ekspert arizalari</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-indigo-500">{pendingExperts.length}</span>
                                <span className="text-indigo-500 text-sm font-bold mb-1">yangi</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Tizimdagi mavjud MALI</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-emerald-500">{systemStats.system_treasury_balance.toLocaleString()}</span>
                                <span className="text-slate-500 text-sm mb-1">MALI</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Muzlatilgan MALI</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-cyan-400">{systemStats.total_locked_balance.toLocaleString()}</span>
                                <span className="text-slate-500 text-sm mb-1">MALI</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Mentor oylik (pending)</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-fuchsia-400">{systemStats.mentor_escrow_pending.toLocaleString()}</span>
                                <span className="text-slate-500 text-sm mb-1">MALI</span>
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Mentorga to&apos;langan ish haqi</h3>
                            <div className="flex items-end gap-3">
                                <span className="text-4xl font-bold text-lime-400">{systemStats.mentor_payout_completed.toLocaleString()}</span>
                                <span className="text-slate-500 text-sm mb-1">MALI</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl animate-fade-in">
                        <div className="p-6 border-b border-white/5 bg-white/5">
                            <h2 className="text-xl font-bold">Barcha foydalanuvchilar</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                                    <tr>
                                        <th className="p-6">Foydalanuvchi</th>
                                        <th className="p-6">Aloqa</th>
                                        <th className="p-6">Balans</th>
                                        <th className="p-6">Status</th>
                                        <th className="p-6 text-right">Amallar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {users.map((user: User) => (
                                        <tr key={user.id} className="hover:bg-white/5 transition-all group">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-400 overflow-hidden">
                                                        {user.avatar_url ? <img src={user.avatar_url} alt={`${user.name} avatar`} className="w-full h-full object-cover" /> : user.name[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[15px]">{user.name} {user.surname}</div>
                                                        <div className="text-slate-500 text-xs">@{user.username || 'username'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <div className="text-[14px] text-slate-300">{user.phone || '+998...'}</div>
                                                <div className="text-[12px] text-slate-500">{user.email || 'Email yo\'q'}</div>
                                            </td>
                                            <td className="p-6">
                                                <div className="font-mono text-emerald-400 font-bold">{parseFloat(user.wallet?.balance || '0').toLocaleString()} MALI</div>
                                            </td>
                                            <td className="p-6">
                                                {!user.phone_verified ? (
                                                    <div className="flex flex-col gap-2">
                                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 w-fit">
                                                            Tasdiqlanmagan
                                                        </span>
                                                        <button 
                                                            onClick={() => handleVerifyUserPhone(user.id)}
                                                            className="text-[10px] px-2 py-1 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-600/30 transition-all font-bold w-fit"
                                                        >
                                                            Tasdiqlash
                                                        </button>
                                                    </div>
                                                ) : user.is_active ? (
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        Faol
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                                                        Bloklangan
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                {user.role !== 'admin' && (
                                                    <button
                                                        onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                                        className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${user.is_active ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                                                    >
                                                        {user.is_active ? 'Bloklash' : 'Ochish'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TopUps Tab */}
                {activeTab === 'topups' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        {topUps.map((req: TopUp) => (
                            <div key={req.id} className={`bg-slate-900 p-6 rounded-4xl border transition-all ${req.status === 'pending' ? 'border-amber-500/30 shadow-lg shadow-amber-500/5' : 'border-white/5'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-3xl font-mono font-bold text-white mb-1">{parseFloat(req.amount).toLocaleString()} <span className="text-slate-500 text-lg">MALI</span></p>
                                        <p className="text-slate-400 text-sm">{req.name} ({req.phone || req.email})</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                                        req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {req.status}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <span className="text-slate-500 text-xs italic">{new Date(req.created_at).toLocaleString('uz-UZ')}</span>
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveTopUp(req.id)} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all">Tasdiqlash</button>
                                            <button onClick={() => handleRejectTopUp(req.id)} className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600 text-white rounded-2xl font-bold text-sm transition-all">Rad etish</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                    <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl animate-fade-in">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                                    <tr>
                                        <th className="p-6">Vaqt</th>
                                        <th className="p-6">Tur</th>
                                        <th className="p-6">Kimdan</th>
                                        <th className="p-6">Kimga</th>
                                        <th className="p-6">Miqdor</th>
                                        <th className="p-6">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {transactions.map((t: Transaction) => (
                                        <tr key={t.id} className="hover:bg-white/5 transition-all group">
                                            <td className="p-6 text-xs text-slate-500 font-mono">{new Date(t.created_at).toLocaleString('uz-UZ')}</td>
                                            <td className="p-6"><span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase rounded-md border border-indigo-500/20">{t.type}</span></td>
                                            <td className="p-6 text-sm group-hover:text-white transition-colors">{t.sender_name || 'Tizim'}</td>
                                            <td className="p-6 text-sm text-slate-300">{t.receiver_name}</td>
                                            <td className="p-6 font-mono text-emerald-400 font-bold">{parseFloat(t.amount).toLocaleString()}</td>
                                            <td className="p-6 text-[10px] uppercase font-bold text-emerald-500/60 ">{t.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Admin Logins Tab */}
                {activeTab === 'admin-logins' && (
                    <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl animate-fade-in">
                        <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Admin kirishlari</h2>
                                <p className="text-slate-500 text-xs mt-1">
                                    So&apos;nggi {adminLogins.length} ta admin login urinishlari (muvaffaqiyatli va muvaffaqiyatsiz).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const token = localStorage.getItem('token');
                                    if (!token) return;
                                    fetch(`${API_URL}/api/admin/logins?limit=200`, {
                                        headers: { Authorization: `Bearer ${token}` },
                                    })
                                        .then(res => res.ok ? res.json() : [])
                                        .then(data => setAdminLogins(data || []))
                                        .catch(() => { /* ignore */ });
                                }}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition-all"
                            >
                                Yangilash
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                                    <tr>
                                        <th className="p-4">Vaqt</th>
                                        <th className="p-4">Admin</th>
                                        <th className="p-4">Telefon</th>
                                        <th className="p-4">IP manzil</th>
                                        <th className="p-4">Device</th>
                                        <th className="p-4">Natija</th>
                                        <th className="p-4">Sabab</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {adminLogins.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/5 transition-all">
                                            <td className="p-4 text-slate-400 font-mono">
                                                {new Date(log.created_at).toLocaleString('uz-UZ')}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">
                                                        {log.name || log.surname
                                                            ? `${log.name || ''} ${log.surname || ''}`.trim()
                                                            : 'Noma&apos;lum'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        {log.role || 'role yo&apos;q'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span>{log.phone || log.phone_or_email}</span>
                                                    {log.email && (
                                                        <span className="text-[10px] text-slate-500">{log.email}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {log.ip_address || '-'}
                                            </td>
                                            <td className="p-4 max-w-xs text-[10px] text-slate-500 truncate" title={log.user_agent || ''}>
                                                {log.user_agent || '-'}
                                            </td>
                                            <td className="p-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        log.success
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                                    }`}
                                                >
                                                    {log.success ? 'Muvaffaqiyatli' : 'Xato'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-[11px] text-slate-400">
                                                {log.reason || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {adminLogins.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-500">
                                                Hozircha admin login audit yozuvlari topilmadi.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Expert Management Tab */}
                {activeTab === 'experts' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex gap-4 mb-6 bg-white/5 p-1 rounded-2xl w-fit">
                            <button onClick={() => setExpertTab('pending')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${expertTab === 'pending' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Yangi arizalar ({pendingExperts.length})</button>
                            <button onClick={() => setExpertTab('verified')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${expertTab === 'verified' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Tasdiqlanganlar ({verifiedExperts.length})</button>
                        </div>

                        {(expertTab === 'pending' ? pendingExperts : verifiedExperts).map((exp) => (
                            <div key={exp.id} className="bg-slate-900/80 backdrop-blur-md p-8 rounded-[40px] border border-white/5 flex flex-col gap-8 shadow-2xl hover:border-indigo-500/30 transition-all">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                    <div className="flex gap-6 items-start">
                                        <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-white/10 shrink-0 relative overflow-hidden flex items-center justify-center">
                                            {exp.avatar_url ? <img src={exp.avatar_url} alt={`${exp.name} avatar`} className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-indigo-400">{exp.name[0]}</span>}
                                            <div className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-lg"></div>
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-2xl font-bold text-white">{exp.name} {exp.surname}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-indigo-400 font-bold text-sm bg-indigo-400/10 px-3 py-1 rounded-full border border-indigo-400/20 uppercase tracking-wider">{exp.profession}</span>
                                                <span className="text-slate-500 text-sm">@{exp.username}</span>
                                            </div>
                                            <p className="text-slate-400 text-sm mt-3 leading-relaxed max-w-xl italic">{exp.bio_expert || 'Biografiya kiritilmagan.'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 bg-white/5 p-4 rounded-[28px] border border-white/5 min-w-50">
                                        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Xizmat narxi</span>
                                        <div className="text-3xl font-mono font-bold text-emerald-400">{parseFloat(exp.hourly_rate).toLocaleString()} <span className="text-sm font-sans">{exp.currency}</span></div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-tighter">1 soat uchun</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-black/20 p-5 rounded-3xl space-y-3">
                                        <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Professional Ma&apos;lumot
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Tajriba:</span> <span className="font-bold text-white">{exp.experience_years} yil</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Ta&apos;lim:</span> <span className="font-bold text-white">{exp.institution || 'Mavjud emas'}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Yo&apos;nalish:</span> <span className="font-bold text-indigo-400">{exp.specialization_details || 'Batafsil..'}</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 p-5 rounded-3xl space-y-3">
                                        <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Xizmat tafsilotlari
                                        </h4>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Tillar:</span> <span className="font-bold text-white">{exp.service_languages || 'Kiritilmagan'}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Format:</span> <span className="font-bold text-white">{exp.service_format || 'Mavjud emas'}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-400">Diplom:</span> <span className={`font-bold ${exp.has_diploma ? 'text-emerald-400' : 'text-red-400'}`}>{exp.has_diploma ? 'Mavjud' : 'Yo&apos;q'}</span></div>
                                        </div>
                                    </div>
                                    <div className="bg-black/20 p-5 rounded-3xl space-y-3">
                                        <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div> Tasdiqlash hujjatlari
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {exp.diploma_url && (
                                                <button onClick={() => setSelectedImage(exp.diploma_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
                                                    <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">Diplom</span>
                                                    <div className="w-full h-1 bg-indigo-500/20 rounded-full hidden group-hover:block animate-grow-x"></div>
                                                </button>
                                            )}
                                            {exp.id_url && (
                                                <button onClick={() => setSelectedImage(exp.id_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
                                                    <span className="text-slate-500 group-hover:text-amber-400 transition-colors">Passport / ID</span>
                                                    <div className="w-full h-1 bg-amber-500/20 rounded-full hidden group-hover:block animate-grow-x"></div>
                                                </button>
                                            )}
                                            {exp.selfie_url && (
                                                <button onClick={() => setSelectedImage(exp.selfie_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
                                                    <span className="text-slate-500 group-hover:text-emerald-400 transition-colors">Selfie</span>
                                                </button>
                                            )}
                                            {exp.certificate_url && (
                                                <button onClick={() => setSelectedImage(exp.certificate_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
                                                    <span className="text-slate-500 group-hover:text-pink-400 transition-colors">Sertifikat</span>
                                                </button>
                                            )}
                                            {exp.resume_url && (
                                                <button
                                                    onClick={() => window.open(exp.resume_url, '_blank')}
                                                    className="p-3 bg-indigo-500/10 rounded-2xl hover:bg-indigo-500/20 border border-indigo-500/20 transition-all text-xs flex flex-col items-center gap-1 group col-span-2"
                                                >
                                                    <span className="text-indigo-400 font-bold group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                        REZYUMENI KO&apos;RISH (PDF)
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                    {exp.verified_status === 'pending' ? (
                                        <>
                                            <button onClick={() => handleVerifyExpert(exp.id, 'approved')} className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] py-4 rounded-3xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                Ekspertni tasdiqlash
                                            </button>
                                            <button onClick={() => handleVerifyExpert(exp.id, 'rejected')} className="px-8 py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-3xl font-bold border border-red-500/20 transition-all">
                                                Rad etish
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 p-4 rounded-3xl bg-white/5 flex items-center justify-center gap-4">
                                            <span className={`font-bold uppercase tracking-widest text-sm ${exp.verified_status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                Status: {exp.verified_status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                                            </span>
                                            <button onClick={() => handleVerifyExpert(exp.id, exp.verified_status === 'approved' ? 'rejected' : 'approved')} className="text-[10px] px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">Statusni o&apos;zgartirish</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(expertTab === 'pending' ? pendingExperts : verifiedExperts).length === 0 && (
                            <div className="bg-slate-900/50 p-20 rounded-4xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </div>
                                <p className="text-slate-500 font-medium">Hozircha kutilayotgan arizalar mavjud emas.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Job / Category Management Tab */}
                {activeTab === 'jobs' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Add Category Form */}
                        <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 shadow-2xl">
                            <h2 className="text-xl font-bold mb-6">Yangi kategoriya qo&apos;shish</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Nomi (UZ)</label>
                                    <input type="text" value={newCategory.name_uz} onChange={e => setNewCategory({ ...newCategory, name_uz: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Huquqshunos" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Nomi (RU)</label>
                                    <input type="text" value={newCategory.name_ru} onChange={e => setNewCategory({ ...newCategory, name_ru: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Юрист" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Ikonka (Lucide Name)</label>
                                    <input type="text" value={newCategory.icon} onChange={e => setNewCategory({ ...newCategory, icon: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Gavel" />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Narxi (MALI)</label>
                                    <input type="number" value={newCategory.price} onChange={e => setNewCategory({ ...newCategory, price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="100" />
                                </div>
                            </div>
                            <button onClick={handleCreateCategory} className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all">Qo&apos;shish</button>
                        </div>

                        {/* Category List */}
                        <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="p-6">Ikonka</th>
                                        <th className="p-6">UZ Nomi</th>
                                        <th className="p-6">RU Nomi</th>
                                        <th className="p-6">E&apos;lon narxi</th>
                                        <th className="p-6">Holat</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {jobCategories.map((cat: JobCategory) => (
                                        <tr key={cat.id} className="hover:bg-white/5 transition-all">
                                            <td className="p-6 text-indigo-400 font-bold">{cat.icon}</td>
                                            <td className="p-6 font-bold">{cat.name_uz}</td>
                                            <td className="p-6 text-slate-400">{cat.name_ru}</td>
                                            <td className="p-6 font-mono text-emerald-400 font-bold">{parseFloat(cat.publication_price_mali).toLocaleString()} MALI</td>
                                            <td className="p-6">
                                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold border border-emerald-500/20">FAOL</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Disputes Tab */}
                {activeTab === 'disputes' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl">
                             <div className="p-6 border-b border-white/5 bg-white/5">
                                <h2 className="text-xl font-bold font-sans">E'lonlar bo'yicha nizolar</h2>
                                <p className="text-slate-500 text-xs mt-1">Mijoz "Xizmat foydali bo'lmadi" deb belgilagan kelishuvlar.</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                                        <tr>
                                            <th className="p-6">Kelishuv</th>
                                            <th className="p-6">Mijoz / Mutaxassis</th>
                                            <th className="p-6">Summa</th>
                                            <th className="p-6">Vaqt</th>
                                            <th className="p-6 text-right">Hal qilish</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {disputedDeals.map((d) => (
                                            <tr key={d.id} className="hover:bg-white/5 transition-all">
                                                <td className="p-6">
                                                    <div className="text-xs text-indigo-400 font-mono mb-1">ID: ...{d.id.slice(-8)}</div>
                                                    <button onClick={() => window.open(`/messages/${d.chat_id}`, '_blank')} className="text-[10px] px-2 py-1 bg-white/5 rounded-md hover:bg-white/10 text-slate-400">Chatni ko'rish</button>
                                                </td>
                                                <td className="p-6 text-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-white"><small className="text-slate-500">Mijoz:</small> {d.client_name}</span>
                                                        <span className="text-indigo-300 font-semibold"><small className="text-slate-500">Expert:</small> {d.expert_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-6 font-mono text-emerald-400 font-bold">{parseFloat(d.amount).toLocaleString()} MALI</td>
                                                <td className="p-6 text-[10px] text-slate-500">{new Date(d.updated_at).toLocaleString('uz-UZ')}</td>
                                                <td className="p-6 text-right">
                                                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                                        <button 
                                                            onClick={() => handleResolveDispute(d.id, 'release')}
                                                            className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold hover:bg-emerald-600/30 transition-all uppercase"
                                                        >
                                                            Expertga o'tkazish
                                                        </button>
                                                        <button 
                                                            onClick={() => handleResolveDispute(d.id, 'refund')}
                                                            className="px-3 py-1.5 bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold hover:bg-rose-600/30 transition-all uppercase"
                                                        >
                                                            Mijozga qaytarish
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {disputedDeals.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-10 text-center text-slate-600 italic">Hozircha hech qanday nizo mavjud emas.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                        <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 shadow-2xl">
                            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                                <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </div>
                                Platforma Sozlamalari
                            </h2>

                            <div className="space-y-6">
                                {/* Desktop app settings */}
                                <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] space-y-4">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Desktop ilova (Windows)
                                    </h3>

                                    {desktopDownloadUrl ? (
                                        <div className="text-xs text-slate-300 space-y-2">
                                            <p>Hozirgi yuklab olish havolasi:</p>
                                            <a
                                                href={desktopDownloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="break-all text-sky-300 hover:text-sky-200 underline underline-offset-2"
                                            >
                                                {desktopDownloadUrl}
                                            </a>
                                            <p className="mt-1">
                                                Joriy desktop versiya:{' '}
                                                <span className="font-mono font-semibold">
                                                    {desktopVersion || '—'}
                                                </span>
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">
                                            Hozircha desktop ilova sozlanmagan. Yangi .exe fayl yuklab, havolani faollashtiring.
                                        </p>
                                    )}

                                    <div className="space-y-3">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block">
                                            Yangi .exe faylni yuklash
                                        </label>
                                        <input
                                            type="file"
                                            accept=".exe"
                                            onChange={(e) => setDesktopFile(e.target.files?.[0] || null)}
                                            className="block w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-500/80 file:text-white hover:file:bg-sky-500 cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleUploadDesktopApp}
                                            disabled={desktopUploading}
                                            className="mt-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm shadow-lg shadow-sky-600/20 transition-all"
                                        >
                                            {desktopUploading
                                                ? `Yuklanmoqda${desktopUploadProgress !== null ? ` – ${desktopUploadProgress}%` : '...'}`
                                                : 'Desktop ilovani yangilash'}
                                        </button>
                                        <p className="text-[10px] text-slate-500 mt-2">
                                            Agar Railway katta faylni qabul qilmasa, quyida Google Drive yoki boshqa hosting
                                            havolasini qo&apos;lda kiritishingiz mumkin.
                                        </p>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block">
                                            Google Drive (yoki boshqa) yuklab olish havolasi
                                        </label>
                                        <input
                                            type="text"
                                            value={desktopUrlInput}
                                            onChange={(e) => setDesktopUrlInput(e.target.value)}
                                            placeholder="https://drive.google.com/..."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSaveDesktopUrl}
                                            disabled={desktopSavingUrl || !desktopUrlInput.trim()}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs shadow-lg shadow-emerald-600/20 transition-all"
                                        >
                                            {desktopSavingUrl ? 'Saqlanmoqda...' : 'Havolani saqlash'}
                                        </button>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block">
                                            Desktop versiya raqami (masalan, 1.0.0)
                                        </label>
                                        <input
                                            type="text"
                                            value={desktopVersion || ''}
                                            onChange={(e) => setDesktopVersion(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 outline-none"
                                            placeholder="1.0.0"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Har yangi desktop .exe yuklaganingizda shu versiyani 1.0.1, 1.0.2 va hokazo qilib oshirib boring.
                                            Auto-update tizimi ushbu versiya raqami asosida ishlaydi.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] space-y-4">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Ekspertlar Nazorati
                                    </h3>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white/80">Eksperni tasdiqlash to&apos;lovi (MALI)</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                value={platformSettings.expert_subscription_fee}
                                                onChange={(e) => setPlatformSettings({ ...platformSettings, expert_subscription_fee: parseInt(e.target.value) || 0 })}
                                                min={0}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-mono text-emerald-400 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="20"
                                            />
                                            <div className="bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center px-6 text-slate-500 font-bold">MALI</div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic mt-2 ml-2">Hozircha bu to&apos;lov o&apos;chirilgan (0 MALI). Keyinchalik kerak bo&apos;lsa qayta yoqiladi.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white/80">Platform komissiyasi (%)</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                                value={platformSettings.commission_rate}
                                                onChange={(e) => setPlatformSettings({ ...platformSettings, commission_rate: parseFloat(e.target.value) || 0 })}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-mono text-emerald-400 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="10"
                                            />
                                            <div className="bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center px-6 text-slate-500 font-bold">%</div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic mt-2 ml-2">Dars to&apos;lovi tasdiqlanganda ustozdan olinadigan foiz (masalan 10 = 10%).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white/80">Topup/Withdraw uchun admin karta raqami</label>
                                        <input
                                            type="text"
                                            value={platformSettings.admin_card_number}
                                            onChange={(e) => setPlatformSettings({ ...platformSettings, admin_card_number: e.target.value.replace(/[^\d\s]/g, '').slice(0, 19) })}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg font-mono text-emerald-400 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="8600 1234 5678 9012"
                                        />
                                        <p className="text-[10px] text-slate-500 italic mt-2 ml-2">Wallet bo&apos;limidagi to&apos;ldirish karta maydoni shu qiymatni oladi.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Tizim rezervi</p>
                                            <p className="text-xl font-bold text-emerald-400 mt-2">{systemStats.system_treasury_balance.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Foydalanuvchi balanslari yig&apos;indisi</p>
                                            <p className="text-xl font-bold text-blue-400 mt-2">{systemStats.total_user_balance.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Yig&apos;ilgan fee</p>
                                            <p className="text-xl font-bold text-amber-400 mt-2">{systemStats.total_fees_collected.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Muzlatilgan MALI (jami)</p>
                                            <p className="text-xl font-bold text-cyan-400 mt-2">{systemStats.total_locked_balance.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Mentor oylik (pending escrow)</p>
                                            <p className="text-xl font-bold text-fuchsia-400 mt-2">{systemStats.mentor_escrow_pending.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Mentorga o&apos;tgan ish haqi</p>
                                            <p className="text-xl font-bold text-lime-400 mt-2">{systemStats.mentor_payout_completed.toLocaleString()} MALI</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdateSettings}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] py-5 rounded-[28px] font-bold text-lg shadow-2xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3"
                                >
                                    O'zgarishlarni saqlash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const token = localStorage.getItem('token');
                                        if (!token) return;
                                        fetchData(token);
                                    }}
                                    className="w-full bg-white/10 hover:bg-white/15 py-3 rounded-2xl font-semibold text-sm transition-all"
                                >
                                    Ko'rsatkichlarni yangilash
                                </button>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-4xl flex items-start gap-4">
                            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-amber-500 font-bold uppercase tracking-widest text-xs">Diqqat</h4>
                                <p className="text-white/60 text-xs leading-relaxed">To&apos;lov miqdorini o&apos;zgartirish faqat yangi arizalarga (yoki hali tasdiqlanmaganlarga) ta&apos;sir qiladi. Avval tasdiqlangan ekspertlardan qayta to&apos;lov undirilmaydi.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes scale-in {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                @keyframes grow-x {
                    from { width: 0; }
                    to { width: 100%; }
                }
                .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
                .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .animate-grow-x { animation: grow-x 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}



