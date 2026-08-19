'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft,
    Briefcase,
    GraduationCap,
    HeartPulse,
    MapPin,
    MessageCircle,
    MessageSquare,
    Monitor,
    Plus,
    Scale,
    Search,
    Star,
    UserRound,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';
import { useLanguage } from '@/context/LanguageContext';
import JobForms from '@/components/chat/JobForms';
import {
    formatExpertPublicPrice,
    formatServiceFormatLabel,
    getExpertListingPitch,
    getExpertPanelMode,
    getExpertSpecialtyLine,
    type ExpertPanelMode,
} from '@/lib/expert-roles';
import type { MarketplaceContactPayload } from '@/lib/marketplace-chat';

type WorkTab = 'online' | 'offline';
type RoleFilter = 'all' | 'employer' | 'seeker';
type MarketTab = 'listings' | 'experts';
type ExpertModeFilter = 'all' | ExpertPanelMode;

const EXPERT_MODES: ExpertPanelMode[] = ['mentor', 'legal', 'psychology', 'consult'];

const EXPERT_MODE_META: Record<
    ExpertPanelMode,
    { icon: typeof GraduationCap; titleKey: string; whoKey: string; descKey: string }
> = {
    mentor: {
        icon: GraduationCap,
        titleKey: 'expert_cat_mentor_title',
        whoKey: 'expert_cat_mentor_who',
        descKey: 'expert_cat_mentor_desc',
    },
    legal: {
        icon: Scale,
        titleKey: 'expert_cat_legal_title',
        whoKey: 'expert_cat_legal_who',
        descKey: 'expert_cat_legal_desc',
    },
    psychology: {
        icon: HeartPulse,
        titleKey: 'expert_cat_psychology_title',
        whoKey: 'expert_cat_psychology_who',
        descKey: 'expert_cat_psychology_desc',
    },
    consult: {
        icon: MessageSquare,
        titleKey: 'expert_cat_consult_title',
        whoKey: 'expert_cat_consult_who',
        descKey: 'expert_cat_consult_desc',
    },
};

function resolveExpertMode(ex: ExpertRow): ExpertPanelMode {
    return getExpertPanelMode({
        profession: ex.profession,
        specialty: ex.specialization_details || ex.specialization,
        bio_expert: ex.bio_expert,
        specialty_desc: ex.specialty_desc,
    });
}

function expertRoleTitle(mode: ExpertPanelMode, t: (key: string) => string): string {
    return t(EXPERT_MODE_META[mode].titleKey);
}

type JobRow = {
    id: string;
    user_id?: string;
    sub_type?: 'seeker' | 'employer';
    category_id?: number;
    type?: WorkTab;
    title?: string;
    position?: string;
    company_name?: string;
    full_name?: string;
    short_text?: string;
    location?: string;
    salary_text?: string;
    salary_min?: string;
    price?: string;
    budget?: string;
    work_type?: string;
    work_hours?: string;
    experience_years?: number;
    created_at?: string;
    category_name_uz?: string;
    category_name?: string;
    category?: string;
    category_icon?: string;
    user?: { name?: string; phone?: string };
    skills_json?: { list?: string[] } | string[];
    requirements_json?: { list?: string[] } | string[];
};

type ExpertRow = {
    id: string;
    name?: string;
    surname?: string;
    username?: string;
    avatar_url?: string;
    profession?: string;
    specialization?: string;
    specialization_details?: string;
    experience_years?: number;
    hourly_rate?: number | string;
    service_price?: number | string;
    currency?: string;
    pricing_model?: string;
    service_format?: string;
    specialty_desc?: string;
    expert_proposal?: string;
    bio_expert?: string;
    wiloyat?: string;
    expert_rating?: number;
};

type CategoryRow = {
    id: number;
    name_uz?: string;
    name_ru?: string;
    name_en?: string;
    icon?: string;
};

function asList(raw: JobRow['skills_json']): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
    if (Array.isArray(raw.list)) return raw.list.map(String).filter(Boolean);
    return [];
}

function jobTitle(job: JobRow): string {
    return (
        job.position ||
        job.title ||
        job.company_name ||
        job.full_name ||
        (job.short_text ? String(job.short_text).slice(0, 48) : '') ||
        "E'lon"
    );
}

function jobCompany(job: JobRow): string {
    if (job.sub_type === 'seeker') return job.full_name || job.user?.name || '—';
    return job.company_name || job.user?.name || '—';
}

function jobPay(job: JobRow, negotiable: string): string {
    if (job.salary_text) return String(job.salary_text);
    if (job.salary_min) return `${job.salary_min}`;
    if (job.price || job.budget) return `${job.price || job.budget} MALI`;
    return negotiable;
}

function jobInitial(job: JobRow): string {
    const s = jobCompany(job);
    return (s.replace(/[^A-Za-zА-Яа-яЎўҚқҒғҲҳ0-9]/g, '')[0] || 'I').toUpperCase();
}

function expertName(ex: ExpertRow): string {
    return `${ex.name || ''} ${ex.surname || ''}`.trim() || ex.username || '—';
}

function expertInitial(ex: ExpertRow): string {
    const s = expertName(ex);
    return (s.replace(/[^A-Za-zА-Яа-яЎўҚқҒғҲҳ0-9]/g, '')[0] || 'M').toUpperCase();
}

function avatarSrc(path?: string | null): string | null {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

function formatPosted(iso: string | undefined, lang: string): string {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const mins = Math.max(0, Math.floor((Date.now() - t) / 60000));
    if (lang === 'ru') {
        if (mins < 60) return `${mins} мин. назад`;
        const h = Math.floor(mins / 60);
        if (h < 24) return `${h} ч. назад`;
        return `${Math.floor(h / 24)} дн. назад`;
    }
    if (lang === 'en') {
        if (mins < 60) return `${mins}m ago`;
        const h = Math.floor(mins / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    }
    if (mins < 60) return `${mins} daqiqa oldin`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h} soat oldin`;
    return `${Math.floor(h / 24)} kun oldin`;
}

export type JobsPanelProps = {
    onStartChat?: (user: MarketplaceContactPayload) => void;
    onBack?: () => void;
    initialMarketTab?: MarketTab;
    initialExpertId?: string | null;
};

export default function JobsPanel({
    onStartChat,
    onBack,
    initialMarketTab = 'listings',
    initialExpertId = null,
}: JobsPanelProps) {
    const { t, language } = useLanguage();
    const me = getUser() as { id?: string } | null;
    const [marketTab, setMarketTab] = useState<MarketTab>(initialMarketTab);
    const [workTab, setWorkTab] = useState<WorkTab>('online');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [categoryId, setCategoryId] = useState<number | 'all'>('all');
    const [expertModeFilter, setExpertModeFilter] = useState<ExpertModeFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [jobs, setJobs] = useState<JobRow[]>([]);
    const [experts, setExperts] = useState<ExpertRow[]>([]);
    const [categories, setCategories] = useState<CategoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
    const [mobileDetail, setMobileDetail] = useState(false);
    const [compose, setCompose] = useState<'seeker' | 'employer' | null>(null);

    useEffect(() => {
        setMarketTab(initialMarketTab);
    }, [initialMarketTab]);

    useEffect(() => {
        if (!initialExpertId || marketTab !== 'experts') return;
        if (experts.some((e) => String(e.id) === String(initialExpertId))) {
            setSelectedExpertId(String(initialExpertId));
            setMobileDetail(true);
        }
    }, [experts, initialExpertId, marketTab]);

    const loadJobs = async () => {
        setLoading(true);
        try {
            const typeQ = workTab === 'online' ? 'online' : 'offline';
            const res = await apiFetch(`/api/jobs?type=${typeQ}`);
            if (!res.ok) return;
            const data = await res.json();
            const list: JobRow[] = Array.isArray(data) ? data : data?.jobs || data?.data || [];
            setJobs(list);
        } catch (e) {
            console.error('Failed to fetch jobs:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadExperts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ type: workTab });
            const q = searchTerm.trim();
            if (q) params.set('q', q);
            const res = await apiFetch(`/api/users/experts?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            setExperts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Failed to fetch experts:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (marketTab === 'listings') void loadJobs();
        else void loadExperts();
    }, [marketTab, workTab]);

    useEffect(() => {
        if (marketTab !== 'experts') return;
        const timer = setTimeout(() => void loadExperts(), 300);
        return () => clearTimeout(timer);
    }, [searchTerm, marketTab]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch('/api/jobs/categories');
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && Array.isArray(data)) setCategories(data);
            } catch {
                /* ignore */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredJobs = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return jobs.filter((job) => {
            if (job.type && job.type !== workTab) return false;
            if (roleFilter !== 'all' && job.sub_type && job.sub_type !== roleFilter) return false;
            if (categoryId !== 'all' && Number(job.category_id) !== Number(categoryId)) return false;
            if (!q) return true;
            const hay = `${jobTitle(job)} ${jobCompany(job)} ${job.short_text || ''} ${job.location || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [jobs, workTab, roleFilter, categoryId, searchTerm]);

    const filteredExperts = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        return experts.filter((ex) => {
            const mode = resolveExpertMode(ex);
            if (expertModeFilter !== 'all' && mode !== expertModeFilter) return false;
            if (!q) return true;
            const hay = `${expertName(ex)} ${ex.profession || ''} ${getExpertSpecialtyLine(ex)}`.toLowerCase();
            return hay.includes(q);
        });
    }, [experts, expertModeFilter, searchTerm]);

    const selectedJob = filteredJobs.find((j) => j.id === selectedJobId) || filteredJobs[0] || null;
    const selectedExpert =
        filteredExperts.find((e) => e.id === selectedExpertId) || filteredExperts[0] || null;

    useEffect(() => {
        if (marketTab !== 'listings') return;
        if (selectedJobId && filteredJobs.some((j) => j.id === selectedJobId)) return;
        setSelectedJobId(filteredJobs[0]?.id ?? null);
    }, [filteredJobs, selectedJobId, marketTab]);

    useEffect(() => {
        if (marketTab !== 'experts') return;
        if (selectedExpertId && filteredExperts.some((e) => e.id === selectedExpertId)) return;
        setSelectedExpertId(filteredExperts[0]?.id ?? null);
    }, [filteredExperts, selectedExpertId, marketTab]);

    const jobCategoryCounts = useMemo(() => {
        const map = new Map<number, number>();
        for (const j of jobs) {
            if (j.category_id == null) continue;
            map.set(Number(j.category_id), (map.get(Number(j.category_id)) || 0) + 1);
        }
        return map;
    }, [jobs]);

    const expertModeCounts = useMemo(() => {
        const map = new Map<ExpertPanelMode, number>();
        for (const ex of experts) {
            const mode = resolveExpertMode(ex);
            map.set(mode, (map.get(mode) || 0) + 1);
        }
        return map;
    }, [experts]);

    const catLabel = (cat: CategoryRow) =>
        language === 'ru' ? cat.name_ru || cat.name_uz : language === 'en' ? cat.name_en || cat.name_uz : cat.name_uz;

    const pickJob = (job: JobRow) => {
        setSelectedJobId(job.id);
        setMobileDetail(true);
    };

    const pickExpert = (ex: ExpertRow) => {
        setSelectedExpertId(ex.id);
        setMobileDetail(true);
    };

    const startJobContact = (intent: 'apply' | 'chat') => {
        if (!selectedJob?.user_id || !onStartChat) return;
        if (me?.id && String(me.id) === String(selectedJob.user_id)) return;
        onStartChat({
            id: String(selectedJob.user_id),
            name: jobCompany(selectedJob),
            fromJobListing: true,
            jobId: String(selectedJob.id),
            jobIntent: intent,
            jobTitle: jobTitle(selectedJob),
            jobCompany: jobCompany(selectedJob),
        });
    };

    const startExpertChat = () => {
        if (!selectedExpert?.id || !onStartChat) return;
        if (me?.id && String(me.id) === String(selectedExpert.id)) return;
        onStartChat({
            id: String(selectedExpert.id),
            name: expertName(selectedExpert),
            fromExpertListing: true,
            profession: selectedExpert.profession,
        });
    };

    const ownJob = !!(me?.id && selectedJob?.user_id && String(me.id) === String(selectedJob.user_id));
    const ownExpert = !!(me?.id && selectedExpert?.id && String(me.id) === String(selectedExpert.id));
    const isListings = marketTab === 'listings';
    const totalCount = isListings ? jobs.length : experts.length;
    const emptyMsg = isListings ? t('job_empty') : t('experts_empty');

    return (
        <div className="flex flex-1 min-h-0 h-full w-full bg-[#181818] text-white overflow-hidden">
            <aside className="hidden xl:flex w-[280px] shrink-0 flex-col border-r border-white/[0.06] bg-[#212121]">
                <div className="px-6 pt-5 pb-4 flex items-center gap-3">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.06] hover:text-white"
                            aria-label={t('chats')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-lg bg-[#8774e1] flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-[18px] font-semibold text-[#8774e1] truncate">{t('jobs')}</h2>
                        <p className="text-[11px] text-[#aaaaaa] truncate">ExpertLine</p>
                    </div>
                </div>

                <div className="px-3 pb-3">
                    <MarketTabSwitch marketTab={marketTab} onChange={setMarketTab} t={t} />
                </div>

                <nav className="flex flex-col gap-0.5 px-2">
                    {([
                        { id: 'online' as const, icon: Monitor, label: t('job_type_online') },
                        { id: 'offline' as const, icon: MapPin, label: t('job_type_offline') },
                    ]).map((item) => {
                        const active = workTab === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setWorkTab(item.id)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
                                    active
                                        ? 'bg-[#8774e1]/10 text-[#8774e1] border-l-4 border-[#8774e1]'
                                        : 'text-[#aaaaaa] hover:bg-white/[0.04] border-l-4 border-transparent'
                                }`}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="text-[13px] font-semibold tracking-wide uppercase">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="mt-6 mb-2 px-6">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#777587]">
                        {isListings ? t('select_category') : t('expert_select_type')}
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3">
                    {isListings ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setCategoryId('all')}
                                className={`w-full flex items-center justify-between px-4 py-2 rounded-md text-[14px] ${
                                    categoryId === 'all' ? 'text-white bg-white/[0.06]' : 'text-[#aaaaaa] hover:bg-white/[0.04]'
                                }`}
                            >
                                <span>{t('all')}</span>
                                <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.06]">{totalCount}</span>
                            </button>
                            {categories.map((cat) => {
                                const n = jobCategoryCounts.get(Number(cat.id)) || 0;
                                const active = categoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategoryId(cat.id)}
                                        className={`w-full flex items-center justify-between px-4 py-2 rounded-md text-[14px] ${
                                            active ? 'text-white bg-white/[0.06]' : 'text-[#aaaaaa] hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        <span className="truncate">{cat.icon ? `${cat.icon} ` : ''}{catLabel(cat)}</span>
                                        <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.06] shrink-0">{n}</span>
                                    </button>
                                );
                            })}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setExpertModeFilter('all')}
                                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-md text-left ${
                                    expertModeFilter === 'all' ? 'text-white bg-white/[0.06]' : 'text-[#aaaaaa] hover:bg-white/[0.04]'
                                }`}
                            >
                                <span className="text-[14px]">{t('all')}</span>
                                <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.06]">{totalCount}</span>
                            </button>
                            {EXPERT_MODES.map((mode) => {
                                const meta = EXPERT_MODE_META[mode];
                                const Icon = meta.icon;
                                const active = expertModeFilter === mode;
                                const n = expertModeCounts.get(mode) || 0;
                                return (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setExpertModeFilter(mode)}
                                        className={`w-full flex items-start gap-3 px-4 py-2.5 rounded-md text-left transition-colors ${
                                            active ? 'text-white bg-[#8774e1]/10 border-l-4 border-[#8774e1]' : 'text-[#aaaaaa] hover:bg-white/[0.04] border-l-4 border-transparent'
                                        }`}
                                    >
                                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${active ? 'text-[#8774e1]' : ''}`} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`text-[13px] font-semibold truncate ${active ? 'text-[#8774e1]' : 'text-white'}`}>
                                                    {t(meta.titleKey)}
                                                </span>
                                                <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.06] shrink-0">{n}</span>
                                            </div>
                                            <p className="text-[11px] text-[#777587] truncate">{t(meta.whoKey)}</p>
                                            <p className="text-[10px] text-[#aaaaaa] truncate">{t(meta.descKey)}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                {isListings && (
                    <div className="px-5 py-4 border-t border-white/[0.06] space-y-2">
                        <button
                            type="button"
                            onClick={() => setCompose('employer')}
                            className="w-full bg-[#8774e1] hover:bg-[#7b68d9] text-white py-2.5 rounded-lg text-[13px] font-semibold flex items-center justify-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            {t('hiring_worker')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setCompose('seeker')}
                            className="w-full bg-transparent border border-[#8774e1] text-[#8774e1] hover:bg-[#8774e1]/10 py-2.5 rounded-lg text-[13px] font-semibold"
                        >
                            {t('im_looking_for_job')}
                        </button>
                    </div>
                )}
            </aside>

            <main className={`flex-1 min-w-0 min-h-0 flex flex-col ${mobileDetail ? 'hidden lg:flex' : 'flex'}`}>
                <div className="shrink-0 px-4 lg:px-5 pt-4 pb-3 border-b border-white/[0.06] bg-[#181818]/95 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-3 xl:hidden">
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.06]"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                        )}
                        <h1 className="text-[18px] font-semibold">{t('jobs')}</h1>
                        {isListings && (
                            <div className="ml-auto flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCompose('employer')}
                                    className="h-9 px-3 rounded-lg bg-[#8774e1] text-white text-[12px] font-semibold"
                                >
                                    {t('hiring_worker')}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mb-3 xl:hidden">
                        <MarketTabSwitch marketTab={marketTab} onChange={setMarketTab} t={t} />
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777587]" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('search')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/[0.08] bg-[#212121] text-[15px] text-white placeholder-[#777587] outline-none focus:border-[#8774e1]"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                        <Chip active={workTab === 'online'} onClick={() => setWorkTab('online')}>{t('job_type_online')}</Chip>
                        <Chip active={workTab === 'offline'} onClick={() => setWorkTab('offline')}>{t('job_type_offline')}</Chip>
                        {isListings && (
                            <>
                                <Chip active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>{t('all')}</Chip>
                                <Chip active={roleFilter === 'employer'} onClick={() => setRoleFilter('employer')}>{t('hiring_worker')}</Chip>
                                <Chip active={roleFilter === 'seeker'} onClick={() => setRoleFilter('seeker')}>{t('im_looking_for_job')}</Chip>
                            </>
                        )}
                    </div>
                    {(isListings ? categories.length > 0 : true) && (
                        <div className="flex gap-2 overflow-x-auto custom-scrollbar pt-2 xl:hidden">
                            {isListings ? (
                                <>
                                    <Chip active={categoryId === 'all'} onClick={() => setCategoryId('all')}>{t('all')}</Chip>
                                    {categories.map((cat) => (
                                        <Chip key={cat.id} active={categoryId === cat.id} onClick={() => setCategoryId(cat.id)}>
                                            {catLabel(cat)}
                                        </Chip>
                                    ))}
                                </>
                            ) : (
                                <>
                                    <Chip active={expertModeFilter === 'all'} onClick={() => setExpertModeFilter('all')}>{t('all')}</Chip>
                                    {EXPERT_MODES.map((mode) => (
                                        <Chip key={mode} active={expertModeFilter === mode} onClick={() => setExpertModeFilter(mode)}>
                                            {t(EXPERT_MODE_META[mode].titleKey)}
                                        </Chip>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 lg:p-5 space-y-3">
                    {loading ? (
                        <p className="py-16 text-center text-[#aaaaaa] text-sm">{t('loading')}</p>
                    ) : isListings ? (
                        filteredJobs.length === 0 ? (
                            <p className="py-16 text-center text-[#aaaaaa] text-sm">{emptyMsg}</p>
                        ) : (
                            filteredJobs.map((job) => {
                                const active = selectedJob?.id === job.id;
                                return (
                                    <button
                                        key={job.id}
                                        type="button"
                                        onClick={() => pickJob(job)}
                                        className={`w-full text-left rounded-xl p-4 border transition-colors relative overflow-hidden ${
                                            active
                                                ? 'border-[#8774e1] bg-[#212121] shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
                                                : 'border-white/[0.08] bg-[#212121] hover:border-[#8774e1]/60'
                                        }`}
                                    >
                                        {active && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#8774e1]" />}
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex gap-3 min-w-0">
                                                <div className="w-12 h-12 rounded-lg border border-white/[0.08] bg-[#8774e1]/20 text-[#8774e1] flex items-center justify-center font-bold text-lg shrink-0">
                                                    {jobInitial(job)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className={`text-[16px] font-semibold truncate ${active ? 'text-[#8774e1]' : 'text-white'}`}>
                                                        {jobTitle(job)}
                                                    </h3>
                                                    <p className="text-[13px] text-[#aaaaaa] truncate">{jobCompany(job)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {job.location && (
                                                <span className="px-2 py-1 rounded bg-white/[0.04] text-[12px] text-[#aaaaaa] flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                                                </span>
                                            )}
                                            <span className="px-2 py-1 rounded bg-white/[0.04] text-[12px] text-[#aaaaaa]">
                                                {jobPay(job, t('negotiable_price'))}
                                            </span>
                                        </div>
                                        {job.short_text && (
                                            <p className="text-[13px] text-[#aaaaaa] line-clamp-2 mt-2">{job.short_text}</p>
                                        )}
                                        <p className="text-[11px] text-[#777587] mt-2">{formatPosted(job.created_at, language)}</p>
                                    </button>
                                );
                            })
                        )
                    ) : filteredExperts.length === 0 ? (
                        <p className="py-16 text-center text-[#aaaaaa] text-sm">{emptyMsg}</p>
                    ) : (
                        filteredExperts.map((ex) => {
                            const active = selectedExpert?.id === ex.id;
                            const price = formatExpertPublicPrice(ex, t);
                            const src = avatarSrc(ex.avatar_url);
                            const mode = resolveExpertMode(ex);
                            return (
                                <button
                                    key={ex.id}
                                    type="button"
                                    onClick={() => pickExpert(ex)}
                                    className={`w-full text-left rounded-xl p-4 border transition-colors relative overflow-hidden ${
                                        active
                                            ? 'border-[#8774e1] bg-[#212121] shadow-[0_4px_12px_rgba(0,0,0,0.35)]'
                                            : 'border-white/[0.08] bg-[#212121] hover:border-[#8774e1]/60'
                                    }`}
                                >
                                    {active && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#8774e1]" />}
                                    <div className="flex gap-3 min-w-0">
                                        <div className="w-12 h-12 rounded-lg border border-white/[0.08] bg-[#8774e1]/20 overflow-hidden shrink-0 flex items-center justify-center">
                                            {src ? (
                                                <img src={src} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[#8774e1] font-bold text-lg">{expertInitial(ex)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className={`text-[16px] font-semibold truncate ${active ? 'text-[#8774e1]' : 'text-white'}`}>
                                                {expertName(ex)}
                                            </h3>
                                            <p className="text-[13px] text-[#aaaaaa] truncate">{ex.profession || t('profession')}</p>
                                            {getExpertSpecialtyLine(ex) && (
                                                <p className="text-[12px] text-[#777587] truncate mt-0.5">{getExpertSpecialtyLine(ex)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <span className="px-2 py-1 rounded bg-[#8774e1]/15 text-[#8774e1] text-[11px] font-semibold">
                                            {expertRoleTitle(mode, t)}
                                        </span>
                                        {price.line && (
                                            <span className="px-2 py-1 rounded bg-white/[0.04] text-[12px] text-[#aaaaaa]">{price.line}</span>
                                        )}
                                        {ex.service_format && (
                                            <span className="px-2 py-1 rounded bg-white/[0.04] text-[12px] text-[#aaaaaa]">
                                                {formatServiceFormatLabel(ex.service_format, t)}
                                            </span>
                                        )}
                                        {ex.experience_years != null && (
                                            <span className="px-2 py-1 rounded bg-white/[0.04] text-[12px] text-[#aaaaaa]">
                                                {ex.experience_years} {t('experience_years_label').toLowerCase()}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </main>

            <aside
                className={`${
                    mobileDetail ? 'flex' : 'hidden'
                } lg:flex w-full lg:w-[360px] shrink-0 flex-col border-l border-white/[0.06] bg-[#212121]`}
            >
                {isListings ? (
                    selectedJob ? (
                        <>
                            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
                                <div className="flex items-center gap-2 mb-4 lg:hidden">
                                    <button
                                        type="button"
                                        onClick={() => setMobileDetail(false)}
                                        className="flex h-9 w-9 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.06]"
                                    >
                                        <ArrowLeft className="h-5 w-5" />
                                    </button>
                                    <span className="text-sm text-[#aaaaaa]">{t('jobs')}</span>
                                </div>
                                <div className="w-full h-28 rounded-xl bg-gradient-to-br from-[#8774e1]/30 to-[#212121] border border-white/[0.06] mb-5 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-xl bg-[#8774e1] text-white text-2xl font-bold flex items-center justify-center">
                                        {jobInitial(selectedJob)}
                                    </div>
                                </div>
                                <h2 className="text-[22px] font-semibold leading-7 mb-1">{jobTitle(selectedJob)}</h2>
                                <p className="text-[15px] text-[#8774e1] mb-5">
                                    {jobCompany(selectedJob)}
                                    {selectedJob.location ? ` • ${selectedJob.location}` : ''}
                                </p>
                                <div className="space-y-4">
                                    <section>
                                        <h4 className="text-[16px] font-semibold mb-1">{t('position_label')}</h4>
                                        <p className="text-[13px] text-[#aaaaaa] whitespace-pre-wrap">{selectedJob.short_text || '—'}</p>
                                    </section>
                                    <section>
                                        <h4 className="text-[16px] font-semibold mb-1">{t('salary_label')}</h4>
                                        <p className="text-[13px] text-[#aaaaaa]">{jobPay(selectedJob, t('negotiable_price'))}</p>
                                    </section>
                                    {asList(selectedJob.skills_json).length > 0 && (
                                        <section>
                                            <h4 className="text-[16px] font-semibold mb-1">{t('skills_req')}</h4>
                                            <p className="text-[13px] text-[#aaaaaa]">{asList(selectedJob.skills_json).join(', ')}</p>
                                        </section>
                                    )}
                                </div>
                            </div>
                            <div className="p-5 border-t border-white/[0.06] space-y-2">
                                <button
                                    type="button"
                                    onClick={() => startJobContact('apply')}
                                    disabled={ownJob || !selectedJob.user_id || !onStartChat}
                                    className="w-full bg-[#8774e1] hover:bg-[#7b68d9] disabled:opacity-40 text-white py-3 rounded-xl text-[16px] font-semibold"
                                >
                                    {t('job_apply')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => startJobContact('chat')}
                                    disabled={ownJob || !selectedJob.user_id || !onStartChat}
                                    className="w-full bg-transparent text-[#8774e1] border border-[#8774e1] disabled:opacity-40 py-3 rounded-xl text-[16px] font-semibold flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    {t('job_quick_chat')}
                                </button>
                            </div>
                        </>
                    ) : (
                        <EmptyDetail message={t('select_category')} />
                    )
                ) : selectedExpert ? (
                    <>
                        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-6">
                            <div className="flex items-center gap-2 mb-4 lg:hidden">
                                <button
                                    type="button"
                                    onClick={() => setMobileDetail(false)}
                                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#aaaaaa] hover:bg-white/[0.06]"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <span className="text-sm text-[#aaaaaa]">{t('experts')}</span>
                            </div>
                            <div className="w-full h-28 rounded-xl bg-gradient-to-br from-[#8774e1]/30 to-[#212121] border border-white/[0.06] mb-5 flex items-center justify-center">
                                {avatarSrc(selectedExpert.avatar_url) ? (
                                    <img
                                        src={avatarSrc(selectedExpert.avatar_url)!}
                                        alt=""
                                        className="w-20 h-20 rounded-xl object-cover border-2 border-[#8774e1]/40"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-[#8774e1] text-white text-2xl font-bold flex items-center justify-center">
                                        {expertInitial(selectedExpert)}
                                    </div>
                                )}
                            </div>
                            <h2 className="text-[22px] font-semibold leading-7 mb-1">{expertName(selectedExpert)}</h2>
                            {(() => {
                                const mode = resolveExpertMode(selectedExpert);
                                const meta = EXPERT_MODE_META[mode];
                                return (
                                    <>
                                        <p className="text-[15px] text-[#8774e1] mb-0.5">{expertRoleTitle(mode, t)}</p>
                                        <p className="text-[12px] text-[#777587] mb-1">{t(meta.whoKey)} · {t(meta.descKey)}</p>
                                    </>
                                );
                            })()}
                            <p className="text-[14px] text-[#aaaaaa] mb-1">{selectedExpert.profession || t('profession')}</p>
                            {getExpertSpecialtyLine(selectedExpert) && (
                                <p className="text-[13px] text-[#aaaaaa] mb-4">{getExpertSpecialtyLine(selectedExpert)}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mb-5">
                                {formatExpertPublicPrice(selectedExpert, t).line && (
                                    <span className="px-2.5 py-1 rounded-lg bg-[#8774e1]/15 text-[#8774e1] text-[12px] font-semibold">
                                        {formatExpertPublicPrice(selectedExpert, t).line}
                                    </span>
                                )}
                                {selectedExpert.expert_rating != null && Number(selectedExpert.expert_rating) > 0 && (
                                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-[12px] text-[#aaaaaa] flex items-center gap-1">
                                        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                                        {Number(selectedExpert.expert_rating).toFixed(1)}
                                    </span>
                                )}
                                {selectedExpert.service_format && (
                                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-[12px] text-[#aaaaaa]">
                                        {formatServiceFormatLabel(selectedExpert.service_format, t)}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-4">
                                {getExpertListingPitch(selectedExpert) && (
                                    <section>
                                        <h4 className="text-[16px] font-semibold mb-1">{t('specialty_offer_label')}</h4>
                                        <p className="text-[13px] text-[#aaaaaa] whitespace-pre-wrap">{getExpertListingPitch(selectedExpert)}</p>
                                    </section>
                                )}
                                {selectedExpert.experience_years != null && (
                                    <section>
                                        <h4 className="text-[16px] font-semibold mb-1">{t('experience')}</h4>
                                        <p className="text-[13px] text-[#aaaaaa]">{selectedExpert.experience_years}</p>
                                    </section>
                                )}
                                {selectedExpert.wiloyat && (
                                    <section>
                                        <h4 className="text-[16px] font-semibold mb-1">{t('region')}</h4>
                                        <p className="text-[13px] text-[#aaaaaa]">{selectedExpert.wiloyat}</p>
                                    </section>
                                )}
                            </div>
                        </div>
                        <div className="p-5 border-t border-white/[0.06]">
                            <button
                                type="button"
                                onClick={startExpertChat}
                                disabled={ownExpert || !onStartChat}
                                className="w-full bg-[#8774e1] hover:bg-[#7b68d9] disabled:opacity-40 text-white py-3 rounded-xl text-[16px] font-semibold flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="h-5 w-5" />
                                {t('expert_write')}
                            </button>
                        </div>
                    </>
                ) : (
                    <EmptyDetail message={t('experts_empty')} />
                )}
            </aside>

            {compose && (
                <JobForms
                    subType={compose}
                    categories={categories}
                    onClose={() => setCompose(null)}
                    onSuccess={() => {
                        setCompose(null);
                        void loadJobs();
                    }}
                />
            )}
        </div>
    );
}

function MarketTabSwitch({
    marketTab,
    onChange,
    t,
}: {
    marketTab: MarketTab;
    onChange: (tab: MarketTab) => void;
    t: any;
}) {
    return (
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#181818] border border-white/[0.06]">
            <button
                type="button"
                onClick={() => onChange('listings')}
                className={`h-9 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors ${
                    marketTab === 'listings' ? 'bg-[#8774e1] text-white' : 'text-[#aaaaaa] hover:text-white'
                }`}
            >
                <Briefcase className="h-3.5 w-3.5" />
                {t('job_tab_listings')}
            </button>
            <button
                type="button"
                onClick={() => onChange('experts')}
                className={`h-9 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors ${
                    marketTab === 'experts' ? 'bg-[#8774e1] text-white' : 'text-[#aaaaaa] hover:text-white'
                }`}
            >
                <UserRound className="h-3.5 w-3.5" />
                {t('job_tab_experts')}
            </button>
        </div>
    );
}

function EmptyDetail({ message }: { message: string }) {
    return (
        <div className="flex-1 flex items-center justify-center text-[#aaaaaa] text-sm px-6 text-center">
            {message}
        </div>
    );
}

function Chip({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap ${
                active ? 'bg-[#8774e1] text-white' : 'bg-[#2b2b2b] text-[#aaaaaa] hover:bg-white/[0.08]'
            }`}
        >
            {children}
        </button>
    );
}
