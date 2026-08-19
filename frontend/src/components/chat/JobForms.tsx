import React, { useState } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { X, DollarSign, MapPin, CheckCircle2, Monitor } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch } from '@/lib/api';

interface JobFormsProps {
    subType: 'seeker' | 'employer';
    categories: any[];
    onClose: () => void;
    onSuccess: () => void;
}

const field =
    'w-full h-9 bg-[#181818] border border-white/[0.08] rounded-lg px-3 text-[13px] text-white placeholder-[#777587] outline-none focus:border-[#8774e1]';
const label = 'block text-[10px] font-semibold uppercase tracking-wide text-[#aaaaaa] mb-1';

export default function JobForms({ subType, categories, onClose, onSuccess }: JobFormsProps) {
    const { t, language } = useLanguage();
    const { showError, showSuccess } = useNotification();
    const [loading, setLoading] = useState(false);
    const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 0);
    const [type, setType] = useState<'online' | 'offline'>('online');

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
        short_text: '',
    });

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
        short_text: '',
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                sub_type: subType,
                category_id: categoryId,
                type,
                ...(subType === 'seeker' ? seekerData : employerData),
                skills_json: subType === 'seeker' ? { list: seekerData.skills.split(',') } : undefined,
                requirements_json: subType === 'employer' ? { list: employerData.requirements.split(',') } : undefined,
            };

            const res = await apiFetch('/api/jobs', {
                method: 'POST',
                body: JSON.stringify(payload),
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

    const catName = (cat: { name_uz?: string; name_ru?: string; name_en?: string }) =>
        language === 'uz' ? cat.name_uz : language === 'ru' ? cat.name_ru : cat.name_en;

    const price = categories.find((c) => c.id === categoryId)?.publication_price_mali || '100.00';

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-3">
            <div className="w-full max-w-[480px] max-h-[min(92vh,720px)] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#212121] shadow-[0_16px_48px_rgba(0,0,0,0.55)] flex flex-col">
                <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[16px] font-semibold text-white truncate">
                            {subType === 'seeker' ? t('im_looking_for_job') : t('hiring_worker')}
                        </h2>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-[#777587]">
                            {t('job_posting_form')}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 shrink-0 rounded-full bg-[#2b2b2b] text-[#aaaaaa] hover:text-white hover:bg-white/[0.08] flex items-center justify-center"
                        aria-label={t('cancel')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
                    <div>
                        <span className={label}>{t('select_category')}</span>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                            {categories.map((cat) => {
                                const active = categoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setCategoryId(cat.id)}
                                        className={`h-7 shrink-0 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${
                                            active
                                                ? 'bg-[#8774e1] text-white'
                                                : 'bg-[#2b2b2b] text-[#aaaaaa] hover:bg-white/[0.08]'
                                        }`}
                                    >
                                        {catName(cat)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 p-0.5 rounded-lg bg-[#181818] border border-white/[0.06]">
                        <button
                            type="button"
                            onClick={() => setType('online')}
                            className={`h-9 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors ${
                                type === 'online' ? 'bg-[#8774e1] text-white' : 'text-[#aaaaaa] hover:text-white'
                            }`}
                        >
                            <Monitor className="h-3.5 w-3.5" />
                            {t('job_type_online')}
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('offline')}
                            className={`h-9 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors ${
                                type === 'offline' ? 'bg-[#8774e1] text-white' : 'text-[#aaaaaa] hover:text-white'
                            }`}
                        >
                            <MapPin className="h-3.5 w-3.5" />
                            {t('job_type_offline')}
                        </button>
                    </div>

                    {subType === 'seeker' ? (
                        <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={label}>{t('full_name')}</label>
                                    <input
                                        type="text"
                                        value={seekerData.full_name}
                                        onChange={(e) => setSeekerData({ ...seekerData, full_name: e.target.value })}
                                        className={field}
                                        placeholder={t('job_seeker_placeholder')}
                                    />
                                </div>
                                <div>
                                    <label className={label}>{t('birth_date')}</label>
                                    <input
                                        type="date"
                                        value={seekerData.birth_date}
                                        onChange={(e) => setSeekerData({ ...seekerData, birth_date: e.target.value })}
                                        className={field}
                                    />
                                </div>
                                <div>
                                    <label className={label}>{t('position_label')}</label>
                                    <input
                                        type="text"
                                        value={seekerData.position}
                                        onChange={(e) => setSeekerData({ ...seekerData, position: e.target.value })}
                                        className={field}
                                        placeholder={t('job_position_placeholder')}
                                    />
                                </div>
                                <div>
                                    <label className={label}>{t('experience_years_label')}</label>
                                    <input
                                        type="number"
                                        value={seekerData.experience_years}
                                        onChange={(e) => setSeekerData({ ...seekerData, experience_years: e.target.value })}
                                        className={field}
                                        placeholder="2"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={label}>{t('skills_req')}</label>
                                <textarea
                                    value={seekerData.skills}
                                    onChange={(e) => setSeekerData({ ...seekerData, skills: e.target.value })}
                                    className={`${field} h-[72px] py-2 resize-none`}
                                    placeholder={t('skills_placeholder')}
                                />
                            </div>
                            <div className="flex items-end gap-2">
                                <div className="flex-1 min-w-0">
                                    <label className={label}>{t('min_salary')}</label>
                                    <input
                                        type="number"
                                        value={seekerData.salary_min}
                                        onChange={(e) => setSeekerData({ ...seekerData, salary_min: e.target.value })}
                                        className={field}
                                        placeholder={t('job_salary_placeholder')}
                                        disabled={seekerData.is_salary_negotiable}
                                    />
                                </div>
                                <label className="h-9 shrink-0 px-2.5 rounded-lg border border-white/[0.08] bg-[#181818] flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={seekerData.is_salary_negotiable}
                                        onChange={(e) =>
                                            setSeekerData({ ...seekerData, is_salary_negotiable: e.target.checked })
                                        }
                                        className="accent-[#8774e1] w-3.5 h-3.5"
                                    />
                                    <span className="text-[11px] font-medium text-white whitespace-nowrap">
                                        {t('negotiable_price')}
                                    </span>
                                </label>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={label}>{t('company_name')}</label>
                                    <input
                                        type="text"
                                        value={employerData.company_name}
                                        onChange={(e) =>
                                            setEmployerData({ ...employerData, company_name: e.target.value })
                                        }
                                        className={field}
                                        placeholder={t('company_name_placeholder')}
                                    />
                                </div>
                                <div>
                                    <label className={label}>{t('position_label')}</label>
                                    <input
                                        type="text"
                                        value={employerData.position}
                                        onChange={(e) => setEmployerData({ ...employerData, position: e.target.value })}
                                        className={field}
                                        placeholder={t('job_position_placeholder')}
                                    />
                                </div>
                                <div>
                                    <label className={label}>{t('work_hours')}</label>
                                    <input
                                        type="text"
                                        value={employerData.work_hours}
                                        onChange={(e) =>
                                            setEmployerData({ ...employerData, work_hours: e.target.value })
                                        }
                                        className={field}
                                        placeholder="9:00 - 18:00"
                                    />
                                </div>
                                <div>
                                    <label className={label}>{t('salary_label')}</label>
                                    <input
                                        type="text"
                                        value={employerData.salary_text}
                                        onChange={(e) =>
                                            setEmployerData({ ...employerData, salary_text: e.target.value })
                                        }
                                        className={field}
                                        placeholder={t('negotiable_price')}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={label}>{t('requirements_desc')}</label>
                                <textarea
                                    value={employerData.requirements}
                                    onChange={(e) =>
                                        setEmployerData({ ...employerData, requirements: e.target.value })
                                    }
                                    className={`${field} h-[72px] py-2 resize-none`}
                                    placeholder={t('requirements_placeholder')}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2.5 rounded-xl border border-[#8774e1]/25 bg-[#8774e1]/10 px-3 py-2">
                        <div className="w-8 h-8 rounded-lg bg-[#8774e1] flex items-center justify-center shrink-0">
                            <DollarSign className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold text-white leading-tight">{t('posting_price')}</div>
                            <div className="text-[10px] text-[#aaaaaa]">{t('all_transparent')}</div>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-[15px] font-semibold text-white leading-tight">
                                {price}
                                <span className="text-[10px] text-[#aaaaaa] ml-1">MALI</span>
                            </div>
                            <div className="text-[9px] uppercase tracking-wide text-[#777587]">{t('one_time_payment')}</div>
                        </div>
                    </div>
                </div>

                <div className="shrink-0 px-4 py-3 border-t border-white/[0.06] flex gap-2 bg-[#1c1c1c]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-4 rounded-xl bg-[#2b2b2b] hover:bg-white/[0.08] text-white text-[13px] font-semibold"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 h-10 rounded-xl bg-[#8774e1] hover:bg-[#7b68d9] disabled:opacity-50 text-white text-[13px] font-semibold flex items-center justify-center gap-1.5"
                    >
                        {loading ? (
                            t('sending_status')
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                {t('confirm_posting')}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
