import React, { useState } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { GlassCard } from '../ui/GlassCard';
import { X, User, Briefcase, DollarSign, Book, FileText, Building2, MapPin, Clock, Users, ShieldCheck, CheckCircle2, Monitor } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface JobFormsProps {
    subType: 'seeker' | 'employer';
    categories: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function JobForms({ subType, categories, onClose, onSuccess }: JobFormsProps) {
    const { t, language } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 0);
    const [type, setType] = useState<'online' | 'offline'>('online');

    // Seeker State
    const [seekerData, setSeekerData] = useState({
        full_name: '',
        birth_date: '',
        location: '',
        position: '',
        experience_years: '',
        salary_min: '',
        is_salary_negotiable: true,
        skills: '',
        has_diploma: false,
        has_certificate: false,
        short_text: ''
    });

    // Employer State
    const [employerData, setEmployerData] = useState({
        company_name: '',
        responsible_person: '',
        location: '',
        position: '',
        work_type: 'full-time',
        work_hours: '',
        day_off: '',
        age_range: '',
        gender_pref: 'any',
        requirements: '',
        salary_text: '',
        benefits: '',
        short_text: ''
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-production-ad05.up.railway.app';

            const payload = {
                sub_type: subType,
                category_id: categoryId,
                type,
                ...(subType === 'seeker' ? seekerData : employerData),
                // Map skills/requirements strings to JSON for backend
                skills_json: subType === 'seeker' ? { list: seekerData.skills.split(',') } : undefined,
                requirements_json: subType === 'employer' ? { list: employerData.requirements.split(',') } : undefined,
            };

            const res = await fetch(`${API_URL}/api/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showSuccess(t('job_success'));
                onSuccess();
            } else {
                const err = await res.json();
                showError(err.message || t('server_error'));
            }
        } catch (e) {
            console.error(e);
            showError(t('server_error'));
        } finally {
            setLoading(false);
        }
    };

    const renderSeekerForm = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('full_name')}</label>
                    <input
                        type="text"
                        value={seekerData.full_name}
                        onChange={e => setSeekerData({ ...seekerData, full_name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder={t('job_seeker_placeholder')}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('birth_date')}</label>
                    <input
                        type="date"
                        value={seekerData.birth_date}
                        onChange={e => setSeekerData({ ...seekerData, birth_date: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('position_label')}</label>
                    <input
                        type="text"
                        value={seekerData.position}
                        onChange={e => setSeekerData({ ...seekerData, position: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder={t('job_position_placeholder')}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('experience_years_label')}</label>
                    <input
                        type="number"
                        value={seekerData.experience_years}
                        onChange={e => setSeekerData({ ...seekerData, experience_years: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder="2"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('skills_req')}</label>
                <textarea
                    value={seekerData.skills}
                    onChange={e => setSeekerData({ ...seekerData, skills: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                    placeholder={t('skills_placeholder')}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('min_salary')}</label>
                    <input
                        type="number"
                        value={seekerData.salary_min}
                        onChange={e => setSeekerData({ ...seekerData, salary_min: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder={t('job_salary_placeholder')}
                    />
                </div>
                <div className="flex items-center gap-3 pt-8">
                    <input
                        type="checkbox"
                        checked={seekerData.is_salary_negotiable}
                        onChange={e => setSeekerData({ ...seekerData, is_salary_negotiable: e.target.checked })}
                        className="w-5 h-5 rounded bg-white/5 border-white/10 border"
                    />
                    <label className="text-white/80 text-xs font-bold">{t('negotiable_price')}</label>
                </div>
            </div>
        </div>
    );

    const renderEmployerForm = () => (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('company_name')}</label>
                    <input
                        type="text"
                        value={employerData.company_name}
                        onChange={e => setEmployerData({ ...employerData, company_name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder={t('company_name_placeholder')}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('position_label')}</label>
                    <input
                        type="text"
                        value={employerData.position}
                        onChange={e => setEmployerData({ ...employerData, position: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder={t('job_position_placeholder')}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('work_hours')}</label>
                    <input
                        type="text"
                        value={employerData.work_hours}
                        onChange={e => setEmployerData({ ...employerData, work_hours: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder="9:00 - 18:00"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('salary_label')}</label>
                    <input
                        type="text"
                        value={employerData.salary_text}
                        onChange={e => setEmployerData({ ...employerData, salary_text: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        placeholder={t('negotiable_price')}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('requirements_desc')}</label>
                <textarea
                    value={employerData.requirements}
                    onChange={e => setEmployerData({ ...employerData, requirements: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none h-24 resize-none"
                    placeholder={t('requirements_placeholder')}
                />
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
            <GlassCard className="w-full max-w-[650px] max-h-[90vh] overflow-y-auto bg-[#1c242f] rounded-[40px] border border-white/10 shadow-3xl no-scrollbar flex flex-col !p-0">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white">{subType === 'seeker' ? t('im_looking_for_job') : t('hiring_worker')}</h2>
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">{t('job_posting_form')}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-8 flex-1">
                    {/* Category Selection */}
                    <div className="mb-8 space-y-4">
                        <label className="text-white/40 text-[10px] font-black uppercase tracking-widest ml-1">{t('select_category')}</label>
                        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryId(cat.id)}
                                    className={`flex-shrink-0 px-5 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-tight transition-all ${categoryId === cat.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'}`}
                                >
                                    {language === 'uz' ? cat.name_uz : (language === 'ru' ? cat.name_ru : cat.name_en)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Online / Offline Selection */}
                    <div className="mb-8 grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setType('online')}
                            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${type === 'online' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                        >
                            <Monitor className="h-5 w-5" />
                            <div className="text-left">
                                <div className="text-[10px] font-black uppercase tracking-widest">{t('job_type_online')}</div>
                                <div className="text-[8px] opacity-60">{t('online_desc')}</div>
                            </div>
                        </button>
                        <button
                            onClick={() => setType('offline')}
                            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${type === 'offline' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                        >
                            <MapPin className="h-5 w-5" />
                            <div className="text-left">
                                <div className="text-[10px] font-black uppercase tracking-widest">{t('job_type_offline')}</div>
                                <div className="text-[8px] opacity-60">{t('offline_desc')}</div>
                            </div>
                        </button>
                    </div>

                    {subType === 'seeker' ? renderSeekerForm() : renderEmployerForm()}

                    {/* Payment Info */}
                    <div className="mt-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-[32px] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 rounded-2xl">
                                <DollarSign className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <div className="text-white font-black text-sm uppercase tracking-tight">{t('posting_price')}</div>
                                <div className="text-blue-400 text-xs font-bold">{t('all_transparent')}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-white font-black text-xl">
                                {categories.find(c => c.id === categoryId)?.publication_price_mali || '100.00'}
                                <span className="text-[10px] opacity-40 ml-1">MALI</span>
                            </div>
                            <div className="text-white/20 text-[8px] font-black uppercase tracking-tighter">{t('one_time_payment')}</div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-white/5 border-t border-white/5 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? t('sending_status') : (
                            <>
                                <CheckCircle2 className="h-5 w-5" />
                                {t('confirm_posting')}
                            </>
                        )}
                    </button>
                </div>
            </GlassCard>
        </div>
    );
}


