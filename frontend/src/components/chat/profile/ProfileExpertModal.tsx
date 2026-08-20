'use client';

import React from 'react';
import { GlassButton } from '../../ui/GlassButton';
import { Award, X, Clock, CheckCircle, Bell, FileText, Plus } from 'lucide-react';
import { isMentorProfession, normalizeExpertGroupName } from '@/lib/expert-roles';

export type ProfileExpertModalProps = {
    t: (...args: any[]) => string;
    language: string;
    isLegalMode: boolean;
    verifiedStatus: 'none' | 'pending' | 'approved' | 'rejected';
    onClose: () => void;
    profession: string;
    setProfession: (v: string) => void;
    professionRef: React.RefObject<HTMLSelectElement | null>;
    specializationDetails: string;
    setSpecializationDetails: (v: string) => void;
    specializationRef: React.RefObject<HTMLInputElement | null>;
    experience: number;
    setExperience: (v: number) => void;
    experienceRef: React.RefObject<HTMLInputElement | null>;
    hasDiploma: boolean;
    setHasDiploma: (v: boolean) => void;
    expertErrors: {
        profession?: string;
        specialization?: string;
        experience?: string;
        price?: string;
        selfie?: string;
        resume?: string;
        anketa?: string;
        groups?: string;
    };
    expertFormPh: { direction: string; experienceExample: string; listing: string; [k: string]: string };
    expertFormPricingHint: { title: string; body: string };
    resumeRef: React.RefObject<HTMLInputElement | null>;
    resumeUrl: string;
    handleDocumentUpload: (key: string, file: File) => void;
    price: number;
    setPrice: (v: number) => void;
    priceRef: React.RefObject<HTMLInputElement | null>;
    pricingModel: 'hourly' | 'session';
    setPricingModel: (v: 'hourly' | 'session') => void;
    currency: string;
    setCurrency: (v: string) => void;
    serviceLanguages: string;
    setServiceLanguages: (v: string) => void;
    serviceFormat: string;
    setServiceFormat: (v: string) => void;
    availableGroupsLoading: boolean;
    newGroupName: string;
    setNewGroupName: (v: string) => void;
    expertGroups: { id: string; name: string; time: string; chatId?: string }[];
    setExpertGroups: (v: { id: string; name: string; time: string; chatId?: string }[]) => void;
    availableGroups: { id: string; name: string; time: string; chatId?: string }[];
    specialtyDesc: string;
    setSpecialtyDesc: (v: string) => void;
    bioExpert: string;
    setBioExpert: (v: string) => void;
    onSave: () => void;
};

const fieldCls = (hasError?: string) =>
    `w-full bg-white/5 rounded-lg py-1.5 px-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none border ${
        hasError ? 'border-red-500/70' : 'border-white/10 focus:border-[#00A884]'
    }`;

const labelCls = 'text-white/45 text-[10px] font-semibold tracking-wide';

function Segmented<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { key: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex p-0.5 rounded-lg bg-white/[0.06] border border-white/10 gap-0.5">
            {options.map((opt) => (
                <button
                    key={opt.key}
                    type="button"
                    onClick={() => onChange(opt.key)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all ${
                        value === opt.key
                            ? 'bg-[#00A884] text-white shadow-sm'
                            : 'text-white/55 hover:text-white/85 hover:bg-white/5'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

export function ProfileExpertModal({
    t,
    language,
    isLegalMode,
    verifiedStatus,
    onClose,
    profession,
    setProfession,
    professionRef,
    specializationDetails,
    setSpecializationDetails,
    specializationRef,
    experience,
    setExperience,
    experienceRef,
    hasDiploma,
    setHasDiploma,
    expertErrors,
    expertFormPh,
    expertFormPricingHint,
    resumeRef,
    resumeUrl,
    handleDocumentUpload,
    price,
    setPrice,
    priceRef,
    pricingModel,
    setPricingModel,
    currency,
    setCurrency,
    serviceLanguages,
    setServiceLanguages,
    serviceFormat,
    setServiceFormat,
    availableGroupsLoading,
    newGroupName,
    setNewGroupName,
    expertGroups,
    setExpertGroups,
    availableGroups,
    specialtyDesc,
    setSpecialtyDesc,
    bioExpert,
    setBioExpert,
    onSave,
}: ProfileExpertModalProps) {
    const priceTypeLabel =
        language === 'uz' ? 'Narx turi' : language === 'ru' ? 'Тип цены' : 'Price type';
    const currencyLabel =
        language === 'uz' ? 'Valyuta' : language === 'ru' ? 'Валюта' : 'Currency';
    const formatLabel =
        language === 'uz' ? 'Xizmat turi' : language === 'ru' ? 'Формат' : 'Format';
    const priceFieldLabel =
        pricingModel === 'session'
            ? isLegalMode
                ? language === 'uz'
                    ? 'Maslahat narxi'
                    : language === 'ru'
                      ? 'Цена услуги'
                      : 'Service price'
                : `${t('session')} ${t('price').toLowerCase()}`
            : `1 ${t('hourly').toLowerCase()} ${t('price').toLowerCase()}`;

    return (
        <div
            className="absolute inset-0 z-[110] flex items-center justify-center bg-[#0f1419]/88 backdrop-blur-lg px-0 sm:px-4 py-0 sm:py-4 animate-fade-in"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="expert-profile-title"
                className="w-full h-[100dvh] sm:h-auto sm:max-h-[88vh] max-w-xl rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-white/25 flex flex-col overflow-hidden text-white"
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-4 pt-3.5 pb-2.5 flex-shrink-0 border-b border-white/10 flex items-center justify-between gap-3">
                    <h3
                        id="expert-profile-title"
                        className="text-white font-bold text-base sm:text-lg flex items-center gap-2"
                    >
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/10">
                            <Award className="h-4 w-4 text-[#00A884]" />
                        </span>
                        {t('specialist_profile')}
                    </h3>
                    <button
                        type="button"
                        onClick={() => onClose()}
                        className="text-white/70 hover:text-white bg-white/10 hover:bg-white/15 p-2 rounded-full border border-white/10 transition-all"
                        aria-label={t('cancel')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {(verifiedStatus === 'pending' || verifiedStatus === 'approved') && (
                    <div
                        className={`mx-4 mt-2 px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                            verifiedStatus === 'pending'
                                ? 'bg-amber-500/[0.12] border border-amber-400/25'
                                : 'bg-[#00A884]/10 border border-[#00A884]/30'
                        }`}
                    >
                        {verifiedStatus === 'pending' ? (
                            <Clock className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        ) : (
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                        <span
                            className={`font-semibold text-[11px] ${
                                verifiedStatus === 'pending' ? 'text-yellow-500' : 'text-emerald-500'
                            }`}
                        >
                            {verifiedStatus === 'pending' ? t('wait_admin_generic') : `✓ ${t('verified')}`}
                        </span>
                        {verifiedStatus === 'pending' && (
                            <span className="text-white/50 text-[10px] truncate">{t('expert_pending_desc')}</span>
                        )}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-3 py-3 min-h-0">
                    {/* 1. Basic */}
                    <section className="space-y-2">
                        <h4 className="text-[#00A884] font-bold text-[10px] uppercase tracking-wider">
                            {t('basic_info')}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1 sm:col-span-2">
                                <label className={labelCls}>{t('profession_type')}</label>
                                <select
                                    ref={professionRef}
                                    value={profession}
                                    onChange={(e) => setProfession(e.target.value)}
                                    className={`${fieldCls(expertErrors.profession)} appearance-none`}
                                >
                                    <option value="" className="bg-[#121B22]">
                                        {t('select')}...
                                    </option>
                                    <optgroup
                                        label="Ta'lim va Mentorlik"
                                        className="bg-[#121B22] text-emerald-400 font-bold"
                                    >
                                        <option value="O'qituvchi">O&apos;qituvchi (Mentor)</option>
                                        <option value="Mentor">Mentor (Biznes/Shaxsiy)</option>
                                        <option value="Startap mentori">Startap mentori</option>
                                        <option value="Dasturchi mentor">Dasturchi mentor</option>
                                    </optgroup>
                                    <optgroup label="Huquq sohasi" className="bg-[#121B22] text-[#00A884] font-bold">
                                        <option value="Advokat">Advokat</option>
                                        <option value="Yurist">Yurist</option>
                                        <option value="Notarius maslahatchi">Notarius maslahatchi</option>
                                        <option value="Soliq maslahatchisi">Soliq maslahatchisi</option>
                                        <option value="Mehnat huquqi eksperti">Mehnat huquqi eksperti</option>
                                        <option value="Migratsiya maslahatchisi">Migratsiya maslahatchisi</option>
                                    </optgroup>
                                    <optgroup label="Psixologiya" className="bg-[#121B22] text-[#00A884] font-bold">
                                        <option value="Klinik psixolog">Klinik psixolog</option>
                                        <option value="Oila psixologi">Oila psixologi</option>
                                        <option value="Bolalar psixologi">Bolalar psixologi</option>
                                        <option value="Psixoterapevt">Psixoterapevt</option>
                                        <option value="Stress / depressiya mutaxassisi">
                                            Stress / depressiya mutaxassisi
                                        </option>
                                        <option value="Career coach">Career coach</option>
                                    </optgroup>
                                    <optgroup
                                        label="Biznes va moliya"
                                        className="bg-[#121B22] text-[#00A884] font-bold"
                                    >
                                        <option value="Biznes konsultant">Biznes konsultant</option>
                                        <option value="Startap mentori">Startap mentori</option>
                                        <option value="Marketing strateg">Marketing strateg</option>
                                        <option value="SMM mutaxassis">SMM mutaxassis</option>
                                        <option value="Moliyaviy maslahatchi">Moliyaviy maslahatchi</option>
                                        <option value="Investitsiya eksperti">Investitsiya eksperti</option>
                                    </optgroup>
                                    <option value="Other" className="bg-[#121B22]">
                                        Boshqa
                                    </option>
                                </select>
                                {expertErrors.profession && (
                                    <p className="text-[10px] text-red-400">{expertErrors.profession}</p>
                                )}
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <label className={labelCls}>{t('specialization_req')}</label>
                                <input
                                    ref={specializationRef}
                                    value={specializationDetails}
                                    onChange={(e) => setSpecializationDetails(e.target.value)}
                                    placeholder={expertFormPh.direction}
                                    className={fieldCls(expertErrors.specialization)}
                                />
                                {expertErrors.specialization && (
                                    <p className="text-[10px] text-red-400">{expertErrors.specialization}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>{t('experience_years_label')}</label>
                                <input
                                    ref={experienceRef}
                                    type="number"
                                    value={experience || 0}
                                    onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                                    placeholder={expertFormPh.experienceExample}
                                    className={fieldCls(expertErrors.experience)}
                                />
                                {expertErrors.experience && (
                                    <p className="text-[10px] text-red-400">{expertErrors.experience}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>{t('has_diploma_label')}</label>
                                <Segmented
                                    value={hasDiploma ? 'yes' : 'no'}
                                    onChange={(v) => setHasDiploma(v === 'yes')}
                                    options={[
                                        { key: 'yes', label: t('yes_label') },
                                        { key: 'no', label: t('no_label') },
                                    ]}
                                />
                            </div>
                        </div>
                    </section>

                    {/* 2. Documents + finance row */}
                    <section className="space-y-2">
                        <h4 className="text-[#00A884] font-bold text-[10px] uppercase tracking-wider">
                            {t('documents_req')}
                        </h4>
                        <button
                            type="button"
                            onClick={() => resumeRef.current?.click()}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed transition-all text-left ${
                                expertErrors.resume
                                    ? 'bg-red-500/5 border-red-500/60'
                                    : resumeUrl
                                      ? 'bg-emerald-500/10 border-emerald-500/30'
                                      : 'bg-white/5 border-white/10 hover:border-[#00A884]/40'
                            }`}
                        >
                            <span
                                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                                    expertErrors.resume
                                        ? 'bg-red-500/20 text-red-400'
                                        : resumeUrl
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'bg-white/5 text-indigo-400'
                                }`}
                            >
                                <FileText className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span
                                    className={`block text-xs font-semibold ${
                                        expertErrors.resume
                                            ? 'text-red-400'
                                            : resumeUrl
                                              ? 'text-emerald-400'
                                              : 'text-white/70'
                                    }`}
                                >
                                    {resumeUrl ? t('uploaded_status') : t('resume_pdf_req')}
                                </span>
                                <span className="block text-[10px] text-white/35 truncate">PDF</span>
                            </span>
                        </button>
                        <input
                            type="file"
                            ref={resumeRef as React.RefObject<HTMLInputElement>}
                            className="hidden"
                            accept=".pdf"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleDocumentUpload('resume', file);
                            }}
                        />
                        {expertErrors.resume && (
                            <p className="text-[10px] text-red-400">{expertErrors.resume}</p>
                        )}
                    </section>

                    {/* 3. Pricing */}
                    <section className="space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <h4 className="text-[#00A884] font-bold text-[10px] uppercase tracking-wider">
                                {t('finance')}
                            </h4>
                            <p
                                className="text-[10px] text-white/40 truncate max-w-[65%]"
                                title={expertFormPricingHint.body}
                            >
                                {expertFormPricingHint.title}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1 sm:col-span-2">
                                <label className={labelCls}>{priceTypeLabel}</label>
                                <Segmented
                                    value={pricingModel}
                                    onChange={setPricingModel}
                                    options={[
                                        ...(isLegalMode
                                            ? []
                                            : [{ key: 'hourly' as const, label: t('hourly') }]),
                                        {
                                            key: 'session' as const,
                                            label: isLegalMode
                                                ? language === 'uz'
                                                    ? 'Bir martalik'
                                                    : language === 'ru'
                                                      ? 'Единоразова'
                                                      : 'One-time'
                                                : t('session'),
                                        },
                                    ]}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>{priceFieldLabel}</label>
                                <input
                                    ref={priceRef}
                                    type="number"
                                    value={price || 0}
                                    onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                    className={fieldCls(expertErrors.price)}
                                />
                                {expertErrors.price && (
                                    <p className="text-[10px] text-red-400">{expertErrors.price}</p>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>{currencyLabel}</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className={`${fieldCls()} appearance-none`}
                                >
                                    <option value="MALI" className="bg-[#121B22]">
                                        MALI
                                    </option>
                                    <option value="UZS" className="bg-[#121B22]">
                                        UZS
                                    </option>
                                    <option value="USD" className="bg-[#121B22]">
                                        USD
                                    </option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>{t('languages')}</label>
                                <input
                                    value={serviceLanguages}
                                    onChange={(e) => setServiceLanguages(e.target.value)}
                                    placeholder={t('languages_list')}
                                    className={fieldCls()}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>{formatLabel}</label>
                                <Segmented
                                    value={(serviceFormat === 'offline' ? 'offline' : 'online') as 'online' | 'offline'}
                                    onChange={setServiceFormat}
                                    options={[
                                        { key: 'online', label: t('job_type_online') },
                                        { key: 'offline', label: t('job_type_offline') },
                                    ]}
                                />
                            </div>
                        </div>
                    </section>

                    {/* 4. Mentor groups */}
                    {isMentorProfession(profession) && (
                        <section className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-[#00A884] font-bold text-[10px] uppercase tracking-wider">
                                    {t('mentor_groups_title')}
                                </h4>
                                {availableGroupsLoading && (
                                    <span className="text-[10px] text-emerald-200">{t('loading')}</span>
                                )}
                            </div>

                            <div className="flex gap-1.5">
                                <input
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    placeholder={t('add_group_placeholder')}
                                    className={`${fieldCls()} flex-1`}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        const name = newGroupName.trim();
                                        if (!name) return;
                                        const key = normalizeExpertGroupName(name);
                                        if (
                                            expertGroups.some(
                                                (g) => normalizeExpertGroupName(g.name) === key
                                            )
                                        ) {
                                            setNewGroupName('');
                                            return;
                                        }
                                        const existing = availableGroups.find(
                                            (ag) => normalizeExpertGroupName(ag.name) === key
                                        );
                                        setExpertGroups([
                                            ...expertGroups,
                                            existing
                                                ? {
                                                      id: String(existing.chatId || existing.id),
                                                      name: existing.name,
                                                      time: existing.time || '',
                                                      chatId: String(existing.chatId || existing.id),
                                                  }
                                                : {
                                                      id: Date.now().toString(),
                                                      name,
                                                      time: '',
                                                  },
                                        ]);
                                        setNewGroupName('');
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const name = newGroupName.trim();
                                        if (!name) return;
                                        const key = normalizeExpertGroupName(name);
                                        if (
                                            expertGroups.some(
                                                (g) => normalizeExpertGroupName(g.name) === key
                                            )
                                        ) {
                                            setNewGroupName('');
                                            return;
                                        }
                                        const existing = availableGroups.find(
                                            (ag) => normalizeExpertGroupName(ag.name) === key
                                        );
                                        setExpertGroups([
                                            ...expertGroups,
                                            existing
                                                ? {
                                                      id: String(existing.chatId || existing.id),
                                                      name: existing.name,
                                                      time: existing.time || '',
                                                      chatId: String(existing.chatId || existing.id),
                                                  }
                                                : {
                                                      id: Date.now().toString(),
                                                      name,
                                                      time: '',
                                                  },
                                        ]);
                                        setNewGroupName('');
                                    }}
                                    className="bg-[#00A884]/20 text-[#00E6C3] hover:bg-[#00A884] hover:text-white px-3 rounded-lg border border-[#00A884]/30 transition-all shrink-0"
                                    aria-label={t('add')}
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-1">
                                {expertGroups.map((g) => (
                                    <div
                                        key={g.id}
                                        className="flex items-center justify-between px-2.5 py-1.5 bg-white/5 border border-white/5 rounded-lg"
                                    >
                                        <span className="text-sm font-medium text-white truncate">{g.name}</span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpertGroups(expertGroups.filter((x) => x.id !== g.id))
                                            }
                                            className="text-red-400/50 hover:text-red-400 p-1"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {expertGroups.length === 0 && (
                                    <div className="text-center py-2.5 text-[11px] text-white/25 italic border border-dashed border-white/10 rounded-lg">
                                        {t('at_least_one_group')}
                                    </div>
                                )}
                            </div>

                            {availableGroups.length > 0 && (
                                <div className="space-y-1 pt-1 border-t border-white/5">
                                    <p className="text-[10px] text-white/40">{t('add_from_existing')}</p>
                                    {availableGroups
                                        .filter(
                                            (ag) =>
                                                !expertGroups.some(
                                                    (g) => g.chatId === ag.chatId || g.id === ag.id
                                                )
                                        )
                                        .map((ag) => (
                                            <button
                                                key={ag.id}
                                                type="button"
                                                onClick={() => {
                                                    setExpertGroups([
                                                        ...expertGroups,
                                                        {
                                                            id: ag.id,
                                                            name: ag.name,
                                                            time: '',
                                                            chatId: ag.chatId || ag.id,
                                                        },
                                                    ]);
                                                }}
                                                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00A884]/15 hover:border-[#00A884]/40 transition-all"
                                            >
                                                <span className="text-sm text-white truncate">{ag.name}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-semibold">
                                                    {t('add')}
                                                </span>
                                            </button>
                                        ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* 5. Listing + bio */}
                    <section className="space-y-2">
                        <h4 className="text-[#00A884] font-bold text-[10px] uppercase tracking-wider">
                            {t('detailed_info')}
                        </h4>
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <label className={labelCls}>{t('specialty_offer_label')}</label>
                                <textarea
                                    value={specialtyDesc}
                                    onChange={(e) => setSpecialtyDesc(e.target.value)}
                                    placeholder={expertFormPh.listing}
                                    rows={3}
                                    className={`${fieldCls()} min-h-[64px] resize-y`}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className={labelCls}>{t('bio')}</label>
                                <textarea
                                    value={bioExpert}
                                    onChange={(e) => setBioExpert(e.target.value)}
                                    placeholder={t('bio_expert_placeholder')}
                                    rows={2}
                                    className={`${fieldCls()} min-h-[48px] resize-y`}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 border-t border-white/10 bg-white/[0.06] px-4 py-2.5 flex flex-col gap-2">
                    <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.08] px-2.5 py-1.5 flex items-start gap-2">
                        <Bell className="h-3.5 w-3.5 text-amber-300 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-white/75 leading-snug">
                            <span className="font-semibold text-amber-300">{t('important_info')}: </span>
                            {t('expert_free_hint')}
                        </p>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => onClose()}
                            className="py-2 px-1 text-[13px] text-white/55 hover:text-white transition-colors"
                        >
                            {t('cancel')}
                        </button>
                        <GlassButton
                            type="button"
                            onClick={onSave}
                            className="!min-w-[120px] !bg-[#00A884] hover:!bg-[#009975] !text-white !rounded-xl py-2.5 text-sm font-bold shadow-lg shadow-black/20 border border-white/10"
                        >
                            {t('send')}
                        </GlassButton>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProfileExpertModal;
