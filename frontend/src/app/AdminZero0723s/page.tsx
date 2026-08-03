'use client';
import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { apiFetch, logoutSession } from '@/lib/api';
import { getToken, setAuth } from '@/lib/auth-storage';
import { uploadFileWithProgress } from '@/lib/upload';
import type {
    User,
    TopUp,
    Transaction,
    JobCategory,
    AdminLoginAudit,
    Expert,
    DisputedDeal,
} from './adminTypes';
import { AdminDashboardTab } from './tabs/AdminDashboardTab';
import { AdminUsersTab } from './tabs/AdminUsersTab';
import { AdminTopUpsTab } from './tabs/AdminTopUpsTab';
import { AdminTransactionsTab } from './tabs/AdminTransactionsTab';
import { AdminLoginsTab } from './tabs/AdminLoginsTab';
import { AdminExpertsTab } from './tabs/AdminExpertsTab';
import { AdminJobsTab } from './tabs/AdminJobsTab';
import { AdminDisputesTab } from './tabs/AdminDisputesTab';
import { AdminSettingsTab } from './tabs/AdminSettingsTab';

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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    useEffect(() => {
        checkAdminAccess();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!authorized) return;
        if (activeTab !== 'settings' && activeTab !== 'dashboard') return;
        const token = getToken();
        if (!token) return;
        // Open settings/dashboard -> always re-fetch latest numbers from server.
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, authorized]);

    const checkAdminAccess = async () => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        try {
            // Try to fetch users. If 403, not admin.
            const res = await apiFetch('/api/admin/users');
            if (res.ok) {
                setAuthorized(true);
                fetchData();
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
                body: JSON.stringify({ phone: trimmedPhone, password: loginPassword }),
                credentials: 'include'
            });
            const data = await res.json();

            if (res.ok) {
                if (!data.user || data.user.role !== 'admin') {
                    setLoginError('Bu akkaunt admin huquqlariga ega emas.');
                    return;
                }
                setAuth(data.token, data.refreshToken || '', data.user as Record<string, unknown>, true, data.csrfToken);
                setAuthorized(true);
                fetchData();
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, topUpsRes, txRes, expertsRes, verifiedRes, categoriesRes, loginsRes, disputesRes] = await Promise.all([
                apiFetch('/api/admin/users'),
                apiFetch('/api/admin/topups'),
                apiFetch('/api/admin/transactions'),
                apiFetch('/api/admin/experts/pending'),
                apiFetch('/api/admin/experts/verified'),
                fetch(`${API_URL}/api/jobs/categories`),
                apiFetch('/api/admin/logins?limit=200'),
                apiFetch('/api/admin/escrow/disputes'),
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
                const settingsRes = await apiFetch('/api/admin/settings');
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

        try {
            const res = await apiFetch('/api/admin/topups/approve', {
                method: 'POST',
                body: JSON.stringify({ requestId })
            });
            if (res.ok) {
                showSuccess('To\'lov muvaffaqiyatli tasdiqlandi!');
                fetchData();
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

        try {
            await apiFetch('/api/admin/topups/reject', {
                method: 'POST',
                body: JSON.stringify({ requestId })
            });
            fetchData();
            showSuccess('To\'lov rad etildi.');
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
        const newStatus = currentStatus ? 'blocked' : 'active';
        
        const ok = await confirm({
            title: "Holatni o'zgartirish",
            description: `Foydalanuvchini ${newStatus === 'blocked' ? 'bloklamoqchimisiz' : 'faollashtirmoqchimisiz'}?`,
            variant: newStatus === 'blocked' ? 'danger' : 'default'
        });
        if (!ok) return;

        try {
            await apiFetch('/api/admin/users/status', {
                method: 'POST',
                body: JSON.stringify({ userId, status: newStatus })
            });
            fetchData();
            showSuccess(`Foydalanuvchi muvaffaqiyatli ${newStatus === 'blocked' ? 'bloklandi' : 'faollashtirildi'}.`);
        } catch { showError('Amal bajarilmadi'); }
    };

    const handleVerifyUserPhone = async (userId: string) => {
        const ok = await confirm({
            title: "Foydalanuvchini tasdiqlash",
            description: "Ushbu foydalanuvchining telefon raqamini qo'lda tasdiqlamoqchimisiz?",
            variant: 'default'
        });
        if (!ok) return;

        try {
            const res = await apiFetch('/api/admin/users/verify', {
                method: 'POST',
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                showSuccess('Foydalanuvchi muvaffaqiyatli tasdiqlandi!');
                fetchData();
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

        try {
            const res = await apiFetch('/api/admin/experts/verify', {
                method: 'POST',
                body: JSON.stringify({ userId, status })
            });
            if (res.ok) {
                showSuccess('Muvaffaqiyatli bajarildi!');
                fetchData();
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

        try {
            const res = await apiFetch('/api/jobs/categories', {
                method: 'POST',
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
                fetchData();
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

        try {
            const res = await apiFetch('/api/admin/settings', {
                method: 'PUT',
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

        try {
            const res = await apiFetch('/api/admin/escrow/resolve', {
                method: 'POST',
                body: JSON.stringify({ dealId, resolution })
            });
            if (res.ok) {
                showSuccess('Muvaffaqiyatli hal qilindi!');
                fetchData();
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

        if (!getToken()) {
            showError('Tizimga qayta kiring (Token topilmadi).');
            return;
        }

        const formData = new FormData();
        formData.append('files', desktopFile);

        setDesktopUploading(true);
        setDesktopUploadProgress(0);

        try {
            const uploadData = await uploadFileWithProgress('/api/media/upload', formData, (progress) => {
                setDesktopUploadProgress(progress.percent);
            });

            if (!uploadData?.files || !uploadData.files[0]?.url) {
                showError(uploadData?.message || 'Faylni yuklashda xatolik yuz berdi.');
                return;
            }

            const url = uploadData.files[0].url as string;

            const saveRes = await apiFetch('/api/desktop', {
                method: 'POST',
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

        if (!getToken()) {
            showError('Tizimga qayta kiring (Token topilmadi).');
            return;
        }

        setDesktopSavingUrl(true);
        try {
            const res = await apiFetch('/api/desktop', {
                method: 'POST',
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
                    <button onClick={() => { void logoutSession().then(() => window.location.reload()); }} className="px-4 py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 rounded-xl text-sm font-medium transition-all">Logout</button>
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
                {activeTab === 'dashboard' && (
                    <AdminDashboardTab
                        users={users}
                        topUps={topUps}
                        transactions={transactions}
                        pendingExperts={pendingExperts}
                        systemStats={systemStats}
                    />
                )}
                {activeTab === 'users' && (
                    <AdminUsersTab
                        users={users}
                        onVerifyPhone={handleVerifyUserPhone}
                        onToggleStatus={handleToggleUserStatus}
                    />
                )}
                {activeTab === 'topups' && (
                    <AdminTopUpsTab
                        topUps={topUps}
                        onApprove={handleApproveTopUp}
                        onReject={handleRejectTopUp}
                    />
                )}
                {activeTab === 'transactions' && (
                    <AdminTransactionsTab transactions={transactions} />
                )}
                {activeTab === 'admin-logins' && (
                    <AdminLoginsTab
                        adminLogins={adminLogins}
                        onRefresh={() => {
                            if (!getToken()) return;
                            apiFetch('/api/admin/logins?limit=200')
                                .then(res => res.ok ? res.json() : [])
                                .then(data => setAdminLogins(data || []))
                                .catch(() => { /* ignore */ });
                        }}
                    />
                )}
                {activeTab === 'experts' && (
                    <AdminExpertsTab
                        expertTab={expertTab}
                        pendingExperts={pendingExperts}
                        verifiedExperts={verifiedExperts}
                        onExpertTabChange={setExpertTab}
                        onSelectImage={(url) => setSelectedImage(url || null)}
                        onVerify={handleVerifyExpert}
                    />
                )}
                {activeTab === 'jobs' && (
                    <AdminJobsTab
                        jobCategories={jobCategories}
                        newCategory={newCategory}
                        onNewCategoryChange={setNewCategory}
                        onCreate={handleCreateCategory}
                    />
                )}
                {activeTab === 'disputes' && (
                    <AdminDisputesTab
                        disputedDeals={disputedDeals}
                        onResolve={handleResolveDispute}
                    />
                )}
                {activeTab === 'settings' && (
                    <AdminSettingsTab
                        desktopDownloadUrl={desktopDownloadUrl}
                        desktopVersion={desktopVersion}
                        desktopFile={desktopFile}
                        desktopUploading={desktopUploading}
                        desktopUploadProgress={desktopUploadProgress}
                        desktopUrlInput={desktopUrlInput}
                        desktopSavingUrl={desktopSavingUrl}
                        platformSettings={platformSettings}
                        systemStats={systemStats}
                        onDesktopFileChange={setDesktopFile}
                        onUploadDesktop={handleUploadDesktopApp}
                        onDesktopUrlInputChange={setDesktopUrlInput}
                        onSaveDesktopUrl={handleSaveDesktopUrl}
                        onDesktopVersionChange={setDesktopVersion}
                        onPlatformSettingsChange={setPlatformSettings}
                        onUpdateSettings={handleUpdateSettings}
                        onRefreshStats={() => { if (!getToken()) return; fetchData(); }}
                    />
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



