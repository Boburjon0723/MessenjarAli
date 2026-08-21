'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useNotification } from '@/context/NotificationContext';
import { apiFetch } from '@/lib/api';
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
    PieChart,
} from 'lucide-react';

type ExpenseType = 'expense' | 'income';

type CategoryDef = {
    name: string;
    key: string;
    icon: React.ComponentType<{ className?: string }>;
    hex: string;
    soft: string;
};

function localYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function monthRange(viewDate: Date): { start: string; end: string } {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    return { start: localYmd(start), end: localYmd(end) };
}

function formatMoney(n: number, locale: string): string {
    return Math.round(Number(n) || 0).toLocaleString(locale);
}

const CATEGORIES: CategoryDef[] = [
    { name: 'Oziq-ovqat', key: 'cat_food', icon: ShoppingBag, hex: '#34d399', soft: 'rgba(52,211,153,0.15)' },
    { name: 'Transport', key: 'cat_transport', icon: Car, hex: '#60a5fa', soft: 'rgba(96,165,250,0.15)' },
    { name: 'Xizmatlar', key: 'cat_services', icon: Settings, hex: '#fbbf24', soft: 'rgba(251,191,36,0.15)' },
    { name: 'Moliya', key: 'cat_finance', icon: Coins, hex: '#a78bfa', soft: 'rgba(167,139,250,0.15)' },
    { name: "Ko'ngilochar", key: 'cat_entertainment', icon: Music, hex: '#f472b6', soft: 'rgba(244,114,182,0.15)' },
    { name: "Sog'liq", key: 'cat_health', icon: HeartPulse, hex: '#fb7185', soft: 'rgba(251,113,133,0.15)' },
    { name: 'Boshqa', key: 'cat_other', icon: MoreHorizontal, hex: '#94a3b8', soft: 'rgba(148,163,184,0.15)' },
];

function normalizeCategory(name: string): string {
    if (name === 'MALI') return 'Moliya';
    return name;
}

export default function ExpenseTracker() {
    const { language, t } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [stats, setStats] = useState<{ totals: any[]; categories: any[] }>({
        totals: [],
        categories: [],
    });
    const [showAddForm, setShowAddForm] = useState(false);
    const [showAll, setShowAll] = useState(false);
    const [formData, setFormData] = useState({
        amount: '',
        category: 'Oziq-ovqat',
        description: '',
        type: 'expense' as ExpenseType,
        date: localYmd(new Date()),
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [viewDate, setViewDate] = useState(new Date());
    const [confirmModal, setConfirmModal] = useState<{ show: boolean; id: number | string | null }>({
        show: false,
        id: null,
    });

    const locale = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ';
    const { start, end } = useMemo(() => monthRange(viewDate), [viewDate]);

    const getTranslatedCategory = (name: string) => {
        const n = normalizeCategory(name);
        const cat = CATEGORIES.find((c) => c.name === n);
        if (cat) return t(cat.key as any);
        return n;
    };

    const findCategory = (name: string) => {
        const n = normalizeCategory(name);
        return CATEGORIES.find((c) => c.name === n) || CATEGORIES[CATEGORIES.length - 1];
    };

    const fetchData = useCallback(async () => {
        setFetching(true);
        try {
            const [listRes, statsRes] = await Promise.all([
                apiFetch(`/api/expenses?startDate=${start}&endDate=${end}`),
                apiFetch(`/api/expenses/stats?startDate=${start}&endDate=${end}`),
            ]);
            if (listRes.ok) setExpenses(await listRes.json());
            else if (listRes.status >= 500) showError(t('server_error') as string);
            if (statsRes.ok) setStats(await statsRes.json());
        } catch (e) {
            console.error(e);
            showError(t('server_error') as string);
        } finally {
            setFetching(false);
        }
    }, [start, end, showError, t]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            showError(t('amount_uzs') as string);
            return;
        }
        setLoading(true);
        try {
            const res = await apiFetch('/api/expenses', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    category: formData.category,
                    description: formData.description.trim() || null,
                    type: formData.type,
                    date: formData.date || localYmd(new Date()),
                }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || (t('server_error') as string));
            }
            setShowAddForm(false);
            setFormData({
                amount: '',
                category: 'Oziq-ovqat',
                description: '',
                type: 'expense',
                date: localYmd(new Date()),
            });
            showSuccess(t('save_record') as string);
            await fetchData();
        } catch (err: any) {
            console.error(err);
            showError(err?.message || (t('server_error') as string));
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = async () => {
        if (confirmModal.id == null) return;
        try {
            const res = await apiFetch('/api/expenses/' + confirmModal.id, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error((err as any).message || (t('server_error') as string));
            }
            showSuccess(t('success_update') as string);
            await fetchData();
        } catch (err: any) {
            showError(err?.message || (t('server_error') as string));
        } finally {
            setConfirmModal({ show: false, id: null });
        }
    };

    const totalIncome = Number(stats.totals.find((x) => x.type === 'income')?.total || 0);
    const totalExpense = Number(stats.totals.find((x) => x.type === 'expense')?.total || 0);
    const balance = totalIncome - totalExpense;

    const chartData = useMemo(() => {
        const expensesOnly = (stats.categories || []).filter((c: any) => c.type === 'expense');
        const total = expensesOnly.reduce((acc: number, curr: any) => acc + parseFloat(curr.total), 0);
        if (!total) return [];
        let accumulatedPercent = 0;
        return expensesOnly.map((c: any) => {
            const percent = (parseFloat(c.total) / total) * 100;
            const startPct = accumulatedPercent;
            accumulatedPercent += percent;
            return { ...c, percent, start: startPct };
        });
    }, [stats.categories]);

    const changeMonth = (offset: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
        setShowAll(false);
    };

    const visibleExpenses = showAll ? expenses : expenses.slice(0, 8);

    return (
        <div className="flex-1 min-h-0 h-full flex flex-col bg-[#0f0f0f] overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="mx-auto w-full max-w-5xl px-4 py-5 md:px-6 md:py-6 space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-[22px] md:text-[26px] font-bold text-white tracking-tight truncate">
                                {t('finance_control')}
                            </h2>
                            <div className="mt-1.5 flex items-center gap-2 text-[#aaaaaa] text-[13px]">
                                <Calendar className="h-4 w-4 shrink-0" />
                                <span className="capitalize">
                                    {viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                                </span>
                                <div className="flex items-center ml-1">
                                    <button
                                        type="button"
                                        onClick={() => changeMonth(-1)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-[#aaaaaa] hover:text-white"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => changeMonth(1)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-[#aaaaaa] hover:text-white"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAddForm(true)}
                            className="shrink-0 inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-[#6ab3f3] hover:bg-[#5aa3e3] text-white font-semibold shadow-lg shadow-[#6ab3f3]/20 transition-all active:scale-[0.98]"
                        >
                            <Plus className="h-5 w-5" />
                            <span className="hidden sm:inline">{t('add')}</span>
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <StatCard
                            label={t('balance')}
                            value={formatMoney(balance, locale)}
                            icon={<TrendingUp className="h-4 w-4" />}
                            accent="#6ab3f3"
                        />
                        <StatCard
                            label={t('income')}
                            value={formatMoney(totalIncome, locale)}
                            icon={<ArrowUpCircle className="h-4 w-4" />}
                            accent="#34d399"
                        />
                        <StatCard
                            label={t('expense')}
                            value={formatMoney(totalExpense, locale)}
                            icon={<ArrowDownCircle className="h-4 w-4" />}
                            accent="#fb7185"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Chart */}
                        <section className="rounded-2xl border border-white/[0.06] bg-[#212121] p-5">
                            <div className="flex items-center gap-2 mb-5">
                                <PieChart className="h-5 w-5 text-[#6ab3f3]" />
                                <h3 className="text-white font-semibold text-[15px]">{t('expense_breakdown')}</h3>
                            </div>

                            {fetching ? (
                                <div className="flex justify-center py-16">
                                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#6ab3f3]" />
                                </div>
                            ) : chartData.length > 0 ? (
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative w-44 h-44">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                            {chartData.map((d: any, i: number) => {
                                                const cat = findCategory(d.category);
                                                return (
                                                    <circle
                                                        key={i}
                                                        cx="50"
                                                        cy="50"
                                                        r="40"
                                                        fill="transparent"
                                                        stroke={cat.hex}
                                                        strokeWidth="10"
                                                        strokeDasharray={`${d.percent * 2.513} 251.3`}
                                                        strokeDashoffset={`${-d.start * 2.513}`}
                                                        strokeLinecap="butt"
                                                    />
                                                );
                                            })}
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                            <p className="text-[10px] text-[#6d7f8f] font-bold uppercase tracking-wider">
                                                {t('total')}
                                            </p>
                                            <p className="text-xl font-bold text-white">
                                                {formatMoney(totalExpense, locale)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full space-y-2">
                                        {chartData.slice(0, 5).map((d: any, i: number) => {
                                            const cat = findCategory(d.category);
                                            const Icon = cat.icon;
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2.5"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <span
                                                            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                                                            style={{ background: cat.soft, color: cat.hex }}
                                                        >
                                                            <Icon className="h-4 w-4" />
                                                        </span>
                                                        <span className="text-white/80 text-sm truncate">
                                                            {getTranslatedCategory(d.category)}
                                                        </span>
                                                    </div>
                                                    <div className="text-right shrink-0 pl-2">
                                                        <p className="text-white text-sm font-semibold">
                                                            {formatMoney(parseFloat(d.total), locale)}
                                                        </p>
                                                        <p className="text-[11px] text-[#6d7f8f]">
                                                            {Math.round(d.percent)}%
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04]">
                                        <PieChart className="h-7 w-7 text-white/20" />
                                    </div>
                                    <p className="text-[#aaaaaa] text-sm max-w-[240px]">{t('no_expenses_month')}</p>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddForm(true)}
                                        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6ab3f3]/15 px-3.5 text-[13px] font-semibold text-[#6ab3f3] hover:bg-[#6ab3f3]/25"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {t('add_record')}
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Categories */}
                        <section>
                            <h3 className="mb-3 px-1 text-[12px] font-semibold uppercase tracking-wider text-[#777587]">
                                {t('categories')}
                            </h3>
                            <div className="grid grid-cols-2 gap-2.5">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    const amount = Number(
                                        stats.categories.find(
                                            (c: any) =>
                                                normalizeCategory(c.category) === cat.name &&
                                                c.type === 'expense'
                                        )?.total || 0
                                    );
                                    return (
                                        <button
                                            key={cat.name}
                                            type="button"
                                            onClick={() => {
                                                setFormData((f) => ({
                                                    ...f,
                                                    category: cat.name,
                                                    type: 'expense',
                                                }));
                                                setShowAddForm(true);
                                            }}
                                            className="rounded-2xl border border-white/[0.06] bg-[#212121] p-3.5 text-left hover:bg-white/[0.04] transition-colors h-[88px] flex flex-col justify-between"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                                                    style={{ background: cat.soft, color: cat.hex }}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <span
                                                    className="text-[11px] font-bold uppercase tracking-wide truncate"
                                                    style={{ color: cat.hex }}
                                                >
                                                    {getTranslatedCategory(cat.name)}
                                                </span>
                                            </div>
                                            <p className="text-white font-bold text-[15px] leading-none">
                                                {formatMoney(amount, locale)}{' '}
                                                <span className="text-[10px] font-normal text-white/40">UZS</span>
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </div>

                    {/* History */}
                    <section className="space-y-3 pb-10">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-white font-semibold text-[16px]">{t('recent_activities')}</h3>
                            {expenses.length > 8 && (
                                <button
                                    type="button"
                                    onClick={() => setShowAll((v) => !v)}
                                    className="text-[#6ab3f3] text-[13px] font-semibold hover:underline"
                                >
                                    {showAll ? t('cancel') : t('show_all_finance')}
                                </button>
                            )}
                        </div>

                        {fetching ? (
                            <div className="flex justify-center py-12">
                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-[#6ab3f3]" />
                            </div>
                        ) : expenses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#212121]/60 py-14 px-4 text-center">
                                <Plus className="h-8 w-8 text-white/15 mb-3" />
                                <p className="text-[#aaaaaa] text-sm">{t('no_finance_records')}</p>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(true)}
                                    className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#6ab3f3] px-4 text-[13px] font-semibold text-white"
                                >
                                    <Plus className="h-4 w-4" />
                                    {t('add')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {visibleExpenses.map((ex: any) => {
                                    const cat = findCategory(ex.category);
                                    const Icon = cat.icon;
                                    const isIncome = ex.type === 'income';
                                    return (
                                        <div
                                            key={ex.id}
                                            className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#212121] px-3.5 py-3 hover:bg-white/[0.04] transition-colors"
                                        >
                                            <span
                                                className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                                                style={{ background: cat.soft, color: cat.hex }}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-semibold text-[14px] truncate">
                                                    {getTranslatedCategory(ex.category)}
                                                </p>
                                                <p className="text-[#6d7f8f] text-[12px] truncate">
                                                    {ex.description ||
                                                        (language === 'ru'
                                                            ? 'Без описания'
                                                            : language === 'en'
                                                              ? 'No description'
                                                              : 'Izohsiz')}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p
                                                    className={`text-[15px] font-bold ${
                                                        isIncome ? 'text-emerald-400' : 'text-white'
                                                    }`}
                                                >
                                                    {isIncome ? '+' : '-'}
                                                    {formatMoney(parseFloat(ex.amount), locale)}
                                                </p>
                                                <p className="text-[11px] text-[#6d7f8f]">
                                                    {new Date(ex.date).toLocaleDateString(locale, {
                                                        day: 'numeric',
                                                        month: 'short',
                                                    })}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmModal({ show: true, id: ex.id })}
                                                className="p-2 rounded-full text-white/20 hover:text-rose-400 hover:bg-rose-400/10 transition-colors"
                                                aria-label={t('yes_delete')}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Add modal */}
            {showAddForm && (
                <div
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                    onClick={() => setShowAddForm(false)}
                >
                    <div
                        className="w-full sm:max-w-[400px] max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#212121] border border-white/[0.08] shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] bg-[#212121]">
                            <h3 className="text-white font-semibold text-[16px]">{t('add_record')}</h3>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="p-2 rounded-full text-[#aaaaaa] hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#181818]">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'expense' })}
                                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                        formData.type === 'expense'
                                            ? 'bg-rose-500 text-white'
                                            : 'text-[#aaaaaa] hover:text-white'
                                    }`}
                                >
                                    {t('expense')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'income' })}
                                    className={`py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                        formData.type === 'income'
                                            ? 'bg-emerald-500 text-white'
                                            : 'text-[#aaaaaa] hover:text-white'
                                    }`}
                                >
                                    {t('income')}
                                </button>
                            </div>

                            <div>
                                <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#6d7f8f]">
                                    {t('category')}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CATEGORIES.map((cat) => {
                                        const Icon = cat.icon;
                                        const active = formData.category === cat.name;
                                        return (
                                            <button
                                                key={cat.name}
                                                type="button"
                                                onClick={() =>
                                                    setFormData({ ...formData, category: cat.name })
                                                }
                                                className={`flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-[12px] font-medium border transition-colors ${
                                                    active
                                                        ? 'border-[#6ab3f3] bg-[#6ab3f3]/10 text-white'
                                                        : 'border-white/[0.06] bg-[#181818] text-white/70 hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <span
                                                    className="flex h-7 w-7 items-center justify-center rounded-lg shrink-0"
                                                    style={{ background: cat.soft, color: cat.hex }}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                </span>
                                                <span className="truncate">{getTranslatedCategory(cat.name)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#6d7f8f]">
                                    {t('amount_uzs')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        min="1"
                                        step="any"
                                        placeholder="0"
                                        required
                                        className="w-full rounded-xl border border-white/10 bg-[#181818] p-3.5 pr-14 text-white text-xl font-bold outline-none focus:border-[#6ab3f3]"
                                        value={formData.amount}
                                        onChange={(e) =>
                                            setFormData({ ...formData, amount: e.target.value })
                                        }
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-bold text-sm">
                                        UZS
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#6d7f8f]">
                                    {t('description')}
                                </label>
                                <input
                                    type="text"
                                    placeholder={t('why_placeholder') as string}
                                    className="w-full rounded-xl border border-white/10 bg-[#181818] p-3.5 text-white outline-none focus:border-[#6ab3f3]"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({ ...formData, description: e.target.value })
                                    }
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#6d7f8f]">
                                    {t('date_label')}
                                </label>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border border-white/10 bg-[#181818] p-3.5 text-white outline-none focus:border-[#6ab3f3] [color-scheme:dark]"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3.5 rounded-2xl text-white font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${
                                    formData.type === 'expense'
                                        ? 'bg-rose-500 hover:bg-rose-600'
                                        : 'bg-emerald-500 hover:bg-emerald-600'
                                }`}
                            >
                                {loading ? t('saving') : t('save_record')}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {confirmModal.show && (
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={() => setConfirmModal({ show: false, id: null })}
                >
                    <div
                        className="w-full max-w-[320px] rounded-2xl bg-[#212121] border border-white/[0.08] p-6 text-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                            <Trash2 className="h-7 w-7" />
                        </div>
                        <h4 className="text-white font-bold text-lg mb-2">{t('delete_confirm_title')}</h4>
                        <p className="text-[#aaaaaa] text-sm mb-6">{t('delete_confirm_desc')}</p>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmModal({ show: false, id: null })}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold"
                            >
                                {t('no_label')}
                            </button>
                            <button
                                type="button"
                                onClick={() => void confirmDelete()}
                                className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold"
                            >
                                {t('yes_delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    accent,
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    accent: string;
}) {
    return (
        <div
            className="rounded-2xl border border-white/[0.06] bg-[#212121] p-4 h-[104px] flex flex-col justify-between"
            style={{ boxShadow: `inset 0 0 0 1px ${accent}22` }}
        >
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                    {label}
                </p>
                <span style={{ color: `${accent}88` }}>{icon}</span>
            </div>
            <p className="text-[22px] font-bold text-white truncate leading-none">
                {value} <span className="text-[10px] font-normal text-white/40">UZS</span>
            </p>
        </div>
    );
}
