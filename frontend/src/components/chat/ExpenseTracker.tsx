import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { GlassCard } from '../ui/GlassCard';
import { AnimatedModal } from '../ui/AnimatedModal';
import {
    Plus,
    Trash2,
    ArrowUpCircle,
    ArrowDownCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    Car,
    Settings,
    Coins,
    Music,
    HeartPulse,
    MoreHorizontal,
    X,
    TrendingUp,
    PieChart
} from 'lucide-react';

export default function ExpenseTracker() {
    const { language, t } = useLanguage();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ totals: [], categories: [] });
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ amount: '', category: 'Oziq-ovqat', description: '', type: 'expense' });
    const [loading, setLoading] = useState(false);

    // Month/Year Filtering
    const [viewDate, setViewDate] = useState(new Date());

    // Custom Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{ show: boolean, id: number | null }>({ show: false, id: null });

    const categories = [
        { name: 'Oziq-ovqat', key: 'cat_food', icon: ShoppingBag, color: 'emerald' },
        { name: 'Transport', key: 'cat_transport', icon: Car, color: 'blue' },
        { name: 'Xizmatlar', key: 'cat_services', icon: Settings, color: 'amber' },
        { name: 'MALI', key: 'MALI', icon: Coins, color: 'purple' },
        { name: 'Ko\'ngilochar', key: 'cat_entertainment', icon: Music, color: 'pink' },
        { name: 'Sog\'liq', key: 'cat_health', icon: HeartPulse, color: 'rose' },
        { name: 'Boshqa', key: 'cat_other', icon: MoreHorizontal, color: 'slate' }
    ];

    const getTranslatedCategory = (name: string) => {
        const cat = categories.find(c => c.name === name);
        if (cat) {
            return cat.key === 'MALI' ? 'MALI' : t(cat.key as any);
        }
        return name;
    };

    const fetchExpenses = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

            // Format dates for the month
            const startStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString().split('T')[0];
            const endStr = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).toISOString().split('T')[0];

            const res = await fetch(`${API_URL}/api/expenses?startDate=${startStr}&endDate=${endStr}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) setExpenses(await res.json());
        } catch (e) { console.error(e); }
    }, [viewDate]);

    const fetchStats = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
            const res = await fetch(API_URL + '/api/expenses/stats', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        fetchExpenses();
        fetchStats();
    }, [fetchExpenses, fetchStats]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount) return;
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
            const res = await fetch(API_URL + '/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ ...formData, amount: parseFloat(formData.amount) })
            });
            if (res.ok) {
                setShowAddForm(false);
                setFormData({ amount: '', category: 'Oziq-ovqat', description: '', type: 'expense' });
                fetchExpenses();
                fetchStats();
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const deleteExpense = async (id: number) => {
        setConfirmModal({ show: true, id });
    };

    const confirmDelete = async () => {
        if (!confirmModal.id) return;
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';
            const res = await fetch(API_URL + '/api/expenses/' + confirmModal.id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.ok) {
                fetchExpenses();
                fetchStats();
            }
        } catch (e) { console.error(e); } finally {
            setConfirmModal({ show: false, id: null });
        }
    };

    const totalIncome = stats.totals.find((t: any) => t.type === 'income')?.total || 0;
    const totalExpense = stats.totals.find((t: any) => t.type === 'expense')?.total || 0;
    const balance = totalIncome - totalExpense;

    const getChartData = () => {
        if (!stats.categories || stats.categories.length === 0) return [];
        const expensesOnly = stats.categories.filter((c: any) => c.type === 'expense');
        const total = expensesOnly.reduce((acc: number, curr: any) => acc + parseFloat(curr.total), 0);

        let accumulatedPercent = 0;
        return expensesOnly.map((c: any) => {
            const percent = (parseFloat(c.total) / total) * 100;
            const start = accumulatedPercent;
            accumulatedPercent += percent;
            return { ...c, percent, start };
        });
    };

    const chartData = getChartData();

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(newDate);
    };

    const locale = language === 'ru' ? 'ru-RU' : (language === 'en' ? 'en-US' : 'uz-UZ');

    return (
        <div className="flex-1 min-h-0 h-full flex flex-col gap-6 p-4 md:p-6 overflow-y-auto overscroll-y-contain custom-scrollbar">
            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">{t('finance_control')}</h2>
                    <div className="flex items-center gap-2 text-white/50 text-sm">
                        <Calendar className="h-4 w-4" />
                        <span className="capitalize">{viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}</span>
                        <div className="flex items-center gap-1 ml-2">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="h-4 w-4" /></button>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><ChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                    <Plus className="h-6 w-6" />
                    <span className="hidden md:block font-bold">{t('add')}</span>
                </button>
            </div>

            {/* QUICK STATS - Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-5 border-blue-500/10 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-center">
                        <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">{t('balance')}</p>
                        <TrendingUp className="h-4 w-4 text-blue-400/50" />
                    </div>
                    <p className="text-2xl font-bold text-white truncate">{parseFloat(String(balance)).toLocaleString()} <span className="text-[10px] font-normal text-white/40">UZS</span></p>
                </GlassCard>
                <GlassCard className="p-5 border-emerald-500/10 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-center">
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">{t('income')}</p>
                        <ArrowUpCircle className="h-4 w-4 text-emerald-400/50" />
                    </div>
                    <p className="text-2xl font-bold text-white truncate">{parseFloat(String(totalIncome)).toLocaleString()} <span className="text-[10px] font-normal text-white/40">UZS</span></p>
                </GlassCard>
                <GlassCard className="p-5 border-rose-500/10 bg-gradient-to-br from-rose-500/10 to-pink-500/10 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-center">
                        <p className="text-rose-400 text-[10px] font-bold uppercase tracking-widest">{t('expense')}</p>
                        <ArrowDownCircle className="h-4 w-4 text-rose-400/50" />
                    </div>
                    <p className="text-2xl font-bold text-white truncate">{parseFloat(String(totalExpense)).toLocaleString()} <span className="text-[10px] font-normal text-white/40">UZS</span></p>
                </GlassCard>
            </div>

            {/* CHART & BREAKDOWN */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visual Chart Card */}
                <GlassCard className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="h-5 w-5 text-blue-400" />
                        <h3 className="text-white font-bold">{t('expense_breakdown')}</h3>
                    </div>

                    {chartData.length > 0 ? (
                        <div className="flex flex-col items-center gap-8">
                            <div className="relative w-44 h-44 md:w-52 md:h-52">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    {chartData.map((d: any, i: number) => {
                                        const category = categories.find(c => c.name === d.category);
                                        const color = category?.color || 'slate';
                                        return (
                                            <circle
                                                key={i}
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="transparent"
                                                stroke={`currentColor`}
                                                strokeWidth="10"
                                                strokeDasharray={`${d.percent * 2.51} 251`}
                                                strokeDashoffset={`${-d.start * 2.51}`}
                                                className={`text-${color}-500/80 hover:text-${color}-400 transition-all duration-700 cursor-pointer stroke-round`}
                                            />
                                        );
                                    })}
                                    <circle cx="50" cy="50" r="32" fill="transparent" />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{t('total')}</p>
                                    <p className="text-xl md:text-2xl font-bold text-white">{parseFloat(String(totalExpense)).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="w-full grid grid-cols-1 gap-2">
                                {chartData.slice(0, 4).map((d: any, i: number) => {
                                    const category = categories.find(c => c.name === d.category);
                                    const Icon = category?.icon || MoreHorizontal;
                                    const color = category?.color || 'slate';
                                    return (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-${color}-500/20 text-${color}-400 group-hover:scale-110 transition-transform`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span className="text-white/70 text-sm font-medium">{getTranslatedCategory(d.category)}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold text-sm">{parseFloat(d.total).toLocaleString()} UZS</p>
                                                <p className="text-[10px] text-white/30 font-bold">{Math.round(d.percent)}%</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <TrendingUp className="h-10 w-10 text-white/10" />
                            </div>
                            <p className="text-white/20 text-sm max-w-[200px]">{t('no_expenses_month')}</p>
                        </div>
                    )}
                </GlassCard>

                {/* Categories Grid Card */}
                <div className="space-y-4">
                    <h3 className="text-white/70 font-bold text-sm px-2 uppercase tracking-widest">{t('categories')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.map(cat => {
                            const Icon = cat.icon;
                            const amount = stats.categories.find((c: any) => c.category === cat.name && c.type === 'expense')?.total || 0;
                            return (
                                <GlassCard key={cat.name} className={`p-4 border-${cat.color}-500/10 hover:border-${cat.color}-500/30 transition-all group relative overflow-hidden h-24 flex flex-col justify-between`}>
                                    <div className={`absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-500`}>
                                        <Icon className="w-20 h-20 text-white" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg bg-${cat.color}-500/20 text-${cat.color}-400`}>
                                            <Icon className="h-3 w-3" />
                                        </div>
                                        <p className={`text-${cat.color}-400 text-[10px] font-bold uppercase tracking-wider`}>{getTranslatedCategory(cat.name)}</p>
                                    </div>
                                    <p className="text-white font-bold text-lg leading-none z-10">{parseFloat(amount).toLocaleString()} <span className="text-[10px] font-normal text-white/40">UZS</span></p>
                                </GlassCard>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ADD FORM MODAL-LIKE (only shown if showAddForm is true) */}
            <AnimatedModal
                open={showAddForm}
                zClass="z-[200]"
                onBackdropClick={() => setShowAddForm(false)}
                className="bg-black/60 backdrop-blur-md p-4"
            >
                    <GlassCard className="w-full max-w-[400px] p-0 overflow-hidden bg-[rgba(var(--glass-rgb),0.8)] border-white/10">
                        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                            <h3 className="text-white font-bold tracking-tight">{t('add_record')}</h3>
                            <button onClick={() => setShowAddForm(false)} className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-xl">
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'expense' })} className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${formData.type === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>{t('expense')}</button>
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'income' })} className={`py-2 px-4 rounded-lg text-sm font-bold transition-all ${formData.type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>{t('income')}</button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest ml-1">{t('category')}</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 appearance-none transition-all"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {categories.map(c => <option key={c.name} value={c.name} className="bg-[#1c242f]">{getTranslatedCategory(c.name)}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest ml-1">{t('amount_uzs')}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold text-xl focus:outline-none focus:border-blue-500 transition-all"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 font-bold">UZS</span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-white/40 text-[10px] font-bold uppercase tracking-widest ml-1">{t('description')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('why_placeholder')}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-all"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 py-4 ${formData.type === 'expense' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'} text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
                                >
                                    {loading ? t('saving') : (
                                        <>
                                            <Plus className="h-5 w-5" />
                                            <span>{t('save_record')}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </GlassCard>
            </AnimatedModal>

            {/* TRANSACTION HISTORY */}
            <div className="space-y-4 pb-12">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-white font-bold text-lg">{t('recent_activities')}</h3>
                    <button className="text-blue-400 text-xs font-bold hover:underline">{t('show_all_finance')}</button>
                </div>
                <div className="space-y-2">
                    {expenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 bg-white/5 border border-dashed border-white/10 rounded-3xl">
                            <Plus className="h-10 w-10 text-white/5 mb-3" />
                            <p className="text-white/20 text-sm italic">{t('no_finance_records')}</p>
                        </div>
                    ) : (
                        expenses.map((ex: any) => {
                            const category = categories.find(c => c.name === ex.category);
                            const Icon = category?.icon || MoreHorizontal;
                            const color = category?.color || 'slate';
                            return (
                                <div key={ex.id} className="group bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 hover:border-white/10 transition-all animate-fade-in relative">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl bg-${color}-500/10 text-${color}-400 group-hover:scale-110 transition-transform flex-shrink-0 shadow-inner`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 pr-2">
                                            <p className="text-white font-bold tracking-tight truncate">{getTranslatedCategory(ex.category)}</p>
                                            <p className="text-white/40 text-xs truncate max-w-[150px] md:max-w-none">{ex.description || (language === 'ru' ? 'Без описания' : (language === 'en' ? 'No description' : 'Izohsiz'))}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`text-base md:text-lg font-bold ${ex.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                                                {ex.type === 'income' ? '+' : '-'}{parseFloat(ex.amount).toLocaleString()}
                                            </p>
                                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">{new Date(ex.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                        <button
                                            onClick={() => deleteExpense(ex.id)}
                                            className="p-2 text-white/5 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all group-hover:scale-110"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* CUSTOM CONFIRM MODAL */}
            <AnimatedModal
                open={confirmModal.show}
                zClass="z-[300]"
                onBackdropClick={() => setConfirmModal({ show: false, id: null })}
                className="bg-black/60 backdrop-blur-md p-4"
            >
                    <GlassCard className="w-full max-w-[320px] p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="h-8 w-8" />
                        </div>
                        <h4 className="text-white font-bold text-lg mb-2">{t('delete_confirm_title')}</h4>
                        <p className="text-white/40 text-sm mb-6">{t('delete_confirm_desc')}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmModal({ show: false, id: null })} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all">{t('no_label')}</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl shadow-lg shadow-rose-500/20 transition-all">{t('yes_delete')}</button>
                        </div>
                    </GlassCard>
            </AnimatedModal>
        </div>
    );
}


