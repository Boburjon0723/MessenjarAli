'use client';

import React from 'react';
import { GlassButton } from '../../ui/GlassButton';
import { Award, X, Clock, CheckCircle, Bell, FileText, Plus } from 'lucide-react';
import { isMentorProfession } from '@/lib/expert-roles';

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
    return (
                <div
                    className="absolute inset-0 z-[110] flex items-center justify-center bg-[#0f1419]/88 backdrop-blur-lg px-0 sm:px-4 py-0 sm:py-6 animate-fade-in"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="expert-profile-title"
                        className="w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] max-w-[500px] rounded-none sm:rounded-[24px] shadow-2xl border-0 sm:border border-white/30 flex flex-col overflow-hidden text-white"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.18)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 sm:px-8 pt-5 sm:pt-7 pb-4 flex-shrink-0 border-b border-white/10">
                            <div className="flex items-center justify-between gap-4">
                                <h3 id="expert-profile-title" className="text-white font-bold text-xl sm:text-2xl flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 border border-white/10">
                                        <Award className="h-6 w-6 text-[#00A884]" />
                                    </span>
                                    {t('specialist_profile')}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => onClose()}
                                    className="text-white/70 hover:text-white bg-white/10 hover:bg-white/15 p-2.5 rounded-full border border-white/10 transition-all"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        {(verifiedStatus === 'pending' || verifiedStatus === 'approved') && (
                            <div className={`mx-4 sm:mx-8 mt-4 sm:mt-5 mb-2 p-4 rounded-[18px] flex flex-col gap-3 ${verifiedStatus === 'pending' ? 'bg-amber-500/[0.12] border border-amber-400/25' : 'bg-[#00A884]/10 border border-[#00A884]/30'}`}>
                                <div className="flex items-center gap-3">
                                    {verifiedStatus === 'pending' ? <Clock className="h-6 w-6 text-yellow-500" /> : <CheckCircle className="h-6 w-6 text-emerald-500" />}
                                    <div className="flex flex-col">
                                        <span className={`font-bold text-sm uppercase tracking-wider ${verifiedStatus === 'pending' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                                            {verifiedStatus === 'pending' ? t('wait_admin_generic') : t('verified')}
                                        </span>
                                        <span className="text-white/60 text-xs mt-0.5">
                                            {verifiedStatus === 'pending' ? t('expert_pending_desc') : t('expert_confirmed_desc')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-1 text-[9px] text-white/60">
                                    {[
                                        { id: 'sent', label: t('step_sent') },
                                        { id: 'review', label: t('step_review') },
                                        { id: 'done', label: t('step_confirmed') }
                                    ].map((step, index) => {
                                        const isActive =
                                            verifiedStatus === 'pending'
                                                ? index <= 1
                                                : verifiedStatus === 'approved'
                                                    ? index <= 2
                                                    : index === 0;
                                        return (
                                            <div key={step.id} className="flex-1 flex items-center">
                                                <div className={`w-2.5 h-2.5 rounded-full mr-2 ${isActive ? 'bg-emerald-400' : 'bg-white/20'}`} />
                                                <span className={`${isActive ? 'text-emerald-100' : 'text-white/30'}`}>{step.label}</span>
                                                {index < 2 && (
                                                    <div className={`flex-1 h-px ml-2 ${isActive ? 'bg-emerald-400/60' : 'bg-white/10'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto px-4 sm:px-8 custom-scrollbar space-y-8 py-5 sm:py-6 min-h-0">
                            {/* SECTION 1: BASIC INFO */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('basic_info')}</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('profession_type')}</label>
                                        <select
                                            ref={professionRef}
                                            value={profession}
                                            onChange={(e) => setProfession(e.target.value)}
                                            className={`w-full bg-white/5 rounded-xl py-3.5 px-4 text-white focus:outline-none appearance-none border ${
                                                expertErrors.profession ? 'border-red-500/70' : 'border-white/10 focus:border-accent-primary'
                                            }`}
                                        >
                                            <option value="" className="bg-[#121B22]">{t('select')}...</option>
                                            <optgroup label="Ta'lim va Mentorlik" className="bg-[#121B22] text-emerald-400 font-bold">
                                                <option value="O'qituvchi">O'qituvchi (Mentor)</option>
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
                                                <option value="Stress / depressiya mutaxassisi">Stress / depressiya mutaxassisi</option>
                                                <option value="Career coach">Career coach</option>
                                            </optgroup>
                                            <optgroup label="Biznes va moliya" className="bg-[#121B22] text-[#00A884] font-bold">
                                                <option value="Biznes konsultant">Biznes konsultant</option>
                                                <option value="Startap mentori">Startap mentori</option>
                                                <option value="Marketing strateg">Marketing strateg</option>
                                                <option value="SMM mutaxassis">SMM mutaxassis</option>
                                                <option value="Moliyaviy maslahatchi">Moliyaviy maslahatchi</option>
                                                <option value="Investitsiya eksperti">Investitsiya eksperti</option>
                                            </optgroup>
                                            <option value="Other" className="bg-[#121B22]">Boshqa</option>
                                        </select>
                                        {expertErrors.profession && (
                                            <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.profession}</p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">
                                            {t('specialization_req')}
                                        </label>
                                        <input
                                            ref={specializationRef}
                                            value={specializationDetails}
                                            onChange={(e) => setSpecializationDetails(e.target.value)}
                                            placeholder={expertFormPh.direction}
                                            className={`w-full bg-white/5 border rounded-xl py-3.5 px-4 text-white placeholder:text-white/35 focus:outline-none transition-all ${
                                                expertErrors.specialization ? 'border-red-500/70' : 'border-white/10 focus:border-[#00A884]'
                                            }`}
                                        />
                                        {expertErrors.specialization && (
                                            <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.specialization}</p>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('experience_years_label')}</label>
                                            <input
                                                ref={experienceRef}
                                                type="number"
                                                value={experience || 0}
                                                onChange={(e) => setExperience(parseInt(e.target.value) || 0)}
                                                placeholder={expertFormPh.experienceExample}
                                                className={`w-full bg-white/5 rounded-xl py-3.5 px-4 text-white placeholder:text-white/35 focus:outline-none border ${
                                                    expertErrors.experience ? 'border-red-500/70' : 'border-white/10 focus:border-accent-primary'
                                                }`}
                                            />
                                            {expertErrors.experience && (
                                                <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.experience}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('has_diploma_label')}</label>
                                            <div className="flex gap-2">
                                                <button onClick={() => setHasDiploma(true)} className={`flex-1 py-3.5 rounded-xl border transition-all font-bold text-xs ${hasDiploma ? 'bg-accent-primary border-accent-primary text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>{t('yes_label')}</button>
                                                <button onClick={() => setHasDiploma(false)} className={`flex-1 py-3.5 rounded-xl border transition-all font-bold text-xs ${!hasDiploma ? 'bg-red-500/20 border-red-500/40 text-red-500' : 'bg-white/5 border-white/10 text-white/40'}`}>{t('no_label')}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: DOCUMENTS */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('documents_req')}</h4>
                                <div className="grid grid-cols-2 gap-3">
                                            {[
                                        { label: t('resume_pdf_req'), key: 'resume', icon: <FileText className="h-5 w-5 text-indigo-400" />, ref: resumeRef, url: resumeUrl, accept: '.pdf', error: expertErrors.resume }
                                    ].map((doc) => (
                                        <div key={doc.key} className="relative group">
                                            <button
                                                onClick={() => doc.ref.current?.click()}
                                                className={`w-full flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed transition-all ${
                                                    doc.error
                                                        ? 'bg-red-500/5 border-red-500/60'
                                                        : doc.url
                                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                                            : 'bg-white/5 border-white/10 hover:border-accent-primary/50 hover:bg-white/10'
                                                }`}
                                            >
                                                <div className={`p-3 rounded-full mb-2 transition-colors ${
                                                    doc.error
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : doc.url
                                                            ? 'bg-emerald-500/20 text-emerald-400'
                                                            : 'bg-white/5 text-white/30 group-hover:text-[#00A884]'
                                                }`}>{doc.icon}</div>
                                                <span className={`text-[10px] uppercase font-bold ${
                                                    doc.error
                                                        ? 'text-red-400'
                                                        : doc.url
                                                            ? 'text-emerald-400'
                                                            : 'text-white/40'
                                                }`}>
                                                    {doc.url ? t('uploaded_status') : doc.label}
                                                </span>
                                            </button>
                                            <input
                                                type="file"
                                                ref={doc.ref as any}
                                                className="hidden"
                                                accept={doc.accept}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDocumentUpload(doc.key, file);
                                                }}
                                            />
                                            {doc.error && (
                                                <p className="text-[9px] text-red-400 mt-1 text-center">{doc.error}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SECTION 4: PRICING & FORMAT */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('finance')}</h4>
                                <div className="space-y-4">
                                    <div className="rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-3 space-y-2">
                                        <p className="text-[10px] font-bold text-[#00A884] uppercase tracking-wider">
                                            {expertFormPricingHint.title}
                                        </p>
                                        <p className="text-[11px] text-white/65 leading-snug">{expertFormPricingHint.body}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Narx turi' : (language === 'ru' ? 'Тип цены' : 'Price type')}</label>
                                        <div className="flex gap-2">
                                            {[
                                                ...(isLegalMode ? [] : [{ key: 'hourly' as const, label: t('hourly') }]),
                                                { key: 'session' as const, label: isLegalMode ? (language === 'uz' ? 'Bir martalik maslahat / xizmat' : (language === 'ru' ? 'Единоразовая консультация' : 'One-time service')) : t('session') }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.key}
                                                    type="button"
                                                    onClick={() => setPricingModel(opt.key)}
                                                    className={`flex-1 py-2.5 rounded-xl border text-[11px] font-bold transition-all ${
                                                        pricingModel === opt.key
                                                            ? 'bg-[#00A884] border-[#00A884] text-white'
                                                            : 'bg-white/5 border-white/15 text-white/55 hover:bg-white/10'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">
                                                {pricingModel === 'session'
                                                    ? (isLegalMode ? (language === 'uz' ? 'Bir martalik maslahat / xizmat narxi' : (language === 'ru' ? 'Цена единоразовой услуги' : 'One-time service price')) : `${t('session')} ${t('price').toLowerCase()}`)
                                                    : `1 ${t('hourly').toLowerCase()} ${t('price').toLowerCase()}`}
                                            </label>
                                            <input
                                                ref={priceRef}
                                                type="number"
                                                value={price || 0}
                                                onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                                                className={`w-full bg-white/5 rounded-xl py-3.5 px-4 text-white focus:outline-none border ${
                                                    expertErrors.price ? 'border-red-500/70' : 'border-white/10 focus:border-accent-primary'
                                                }`}
                                            />
                                            {expertErrors.price && (
                                                <p className="text-[10px] text-red-400 mt-1 ml-1">{expertErrors.price}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Valyuta' : (language === 'ru' ? 'Валюта' : 'Currency')}</label>
                                            <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none appearance-none">
                                                <option value="MALI" className="bg-[#121B22]">MALI</option>
                                                <option value="UZS" className="bg-[#121B22]">UZS</option>
                                                <option value="USD" className="bg-[#121B22]">USD</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('languages')}</label>
                                        <input
                                            value={serviceLanguages}
                                            onChange={(e) => setServiceLanguages(e.target.value)}
                                            placeholder={t('languages_list')}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Xizmat turi' : (language === 'ru' ? 'Формат услуг' : 'Service format')}</label>
                                        <div className="flex gap-2">
                                            {[
                                                { key: 'online', label: t('job_type_online') },
                                                { key: 'offline', label: t('job_type_offline') }
                                            ].map((fmt) => (
                                                <button
                                                    key={fmt.key}
                                                    onClick={() => setServiceFormat(fmt.key)}
                                                    className={`flex-1 py-3 rounded-xl border transition-all text-[11px] font-bold ${
                                                        serviceFormat === fmt.key
                                                            ? 'bg-[#00A884] border-[#00A884] text-white shadow-md'
                                                            : 'bg-white/5 border-white/15 text-white/60 hover:bg-white/10 hover:text-white/90'
                                                    }`}
                                                >
                                                    {fmt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 4.5: GROUPS (FOR MENTORS) */}
                            {isMentorProfession(profession) && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between border-b border-white/15 pb-2">
                                        <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest">{t('mentor_groups_title')}</h4>
                                        {availableGroupsLoading && (
                                            <span className="text-[10px] text-emerald-200">
                                                {t('loading')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {/* Yangi guruh yaratish */}
                                        <div className="flex gap-2">
                                            <input
                                                value={newGroupName}
                                                onChange={(e) => setNewGroupName(e.target.value)}
                                                placeholder={t('add_group_placeholder')}
                                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-accent-primary outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newGroupName.trim()) {
                                                        setExpertGroups([
                                                            ...expertGroups,
                                                            { id: Date.now().toString(), name: newGroupName.trim(), time: '' }
                                                        ]);
                                                        setNewGroupName("");
                                                    }
                                                }}
                                                className="bg-[#00A884]/20 text-[#00E6C3] hover:bg-[#00A884] hover:text-white px-4 rounded-xl border border-[#00A884]/30 transition-all shrink-0"
                                            >
                                                <Plus className="h-5 w-5" />
                                            </button>
                                        </div>

                                        {/* Tanlangan guruhlar ro'yxati */}
                                        <div className="space-y-2">
                                            {expertGroups.map((g) => (
                                                <div key={g.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-bold text-white truncate">{g.name}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setExpertGroups(expertGroups.filter(x => x.id !== g.id))}
                                                        className="text-red-400/50 hover:text-red-400 p-1"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {expertGroups.length === 0 && (
                                                <div className="text-center py-4 text-xs text-white/20 italic border border-dashed border-white/5 rounded-xl">
                                                    {t('at_least_one_group')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Mavjud guruhlardan qo'shish */}
                                        {availableGroups.length > 0 && (
                                            <div className="space-y-2 pt-3 border-t border-white/5">
                                                <p className="text-[11px] text-white/40 font-medium">
                                                    {t('add_from_existing')}
                                                </p>
                                                {availableGroups
                                                    .filter(ag => !expertGroups.some(g => g.chatId === ag.chatId || g.id === ag.id))
                                                    .map(ag => (
                                                        <button
                                                            key={ag.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setExpertGroups([
                                                                    ...expertGroups,
                                                                    { id: ag.id, name: ag.name, time: '', chatId: ag.chatId || ag.id }
                                                                ]);
                                                            }}
                                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00A884]/15 hover:border-[#00A884]/40 transition-all"
                                                        >
                                                            <div className="flex flex-col text-left min-w-0">
                                                                <span className="text-sm text-white font-medium truncate">{ag.name}</span>
                                                            </div>
                                                            <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-200 font-semibold">
                                                                {t('add')}
                                                            </span>
                                                        </button>
                                                    ))}
                                                {availableGroups.filter(ag => !expertGroups.some(g => g.chatId === ag.chatId || g.id === ag.id)).length === 0 && (
                                                    <p className="text-[11px] text-white/30 italic">
                                                        {t('all_groups_added')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* SECTION 5: LISTING + BIO */}
                            <div className="space-y-4">
                                <h4 className="text-[#00A884] font-bold text-xs uppercase tracking-widest border-b border-white/15 pb-2">{t('detailed_info')}</h4>
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">
                                            {t('specialty_offer_label')}
                                        </label>
                                        <p className="text-[10px] text-white/35 leading-snug px-1">
                                            {t('specialty_offer_hint')}
                                        </p>
                                        <textarea
                                            value={specialtyDesc}
                                            onChange={(e) => setSpecialtyDesc(e.target.value)}
                                            placeholder={expertFormPh.listing}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-white/35 focus:border-accent-primary focus:outline-none min-h-[140px] resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('bio')}</label>
                                        <textarea
                                            value={bioExpert}
                                            onChange={(e) => setBioExpert(e.target.value)}
                                            placeholder={t('bio_expert_placeholder')}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-4 text-white placeholder:text-white/35 focus:border-accent-primary focus:outline-none min-h-[100px] resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-shrink-0 border-t border-white/10 bg-white/[0.06] px-4 sm:px-8 py-4 sm:py-5 flex flex-col gap-4">
                            <div className="rounded-[14px] border border-amber-400/25 bg-amber-500/[0.1] px-3 py-3 flex items-start gap-3">
                                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-300 flex-shrink-0 border border-amber-400/20">
                                    <Bell className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                                        {t('important_info')}
                                    </p>
                                    <p className="text-[11px] text-white/80 leading-snug">
                                        {t('expert_free_hint')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => onClose()}
                                    className="py-2.5 text-[13px] text-white/55 hover:text-white transition-colors text-center sm:text-left"
                                >
                                    {t('cancel')}
                                </button>
                                <GlassButton
                                    type="button"
                                    onClick={onSave}
                                    className="w-full sm:w-auto !min-w-[140px] !bg-[#00A884] hover:!bg-[#009975] !text-white !rounded-xl py-3 text-sm font-bold shadow-lg shadow-black/20 border border-white/10"
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
