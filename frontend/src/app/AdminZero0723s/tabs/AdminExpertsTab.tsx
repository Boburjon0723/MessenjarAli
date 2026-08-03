'use client';

import React from 'react';
import type { Expert } from '../adminTypes';

export type AdminExpertsTabProps = {
    expertTab: string;
    pendingExperts: Expert[];
    verifiedExperts: Expert[];
    onExpertTabChange: (tab: string) => void;
    onSelectImage: (url?: string) => void;
    onVerify: (id: string, status: 'approved' | 'rejected') => void;
};

export function AdminExpertsTab({
    expertTab,
    pendingExperts,
    verifiedExperts,
    onExpertTabChange,
    onSelectImage,
    onVerify,
}: AdminExpertsTabProps) {
    return (
        <div className="space-y-6">
                        <div className="flex gap-4 mb-6 bg-white/5 p-1 rounded-2xl w-fit">
                            <button onClick={() => onExpertTabChange('pending')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${expertTab === 'pending' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Yangi arizalar ({pendingExperts.length})</button>
                            <button onClick={() => onExpertTabChange('verified')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${expertTab === 'verified' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Tasdiqlanganlar ({verifiedExperts.length})</button>
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
                                                <button onClick={() => onSelectImage(exp.diploma_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
                                                    <span className="text-slate-500 group-hover:text-indigo-400 transition-colors">Diplom</span>
                                                    <div className="w-full h-1 bg-indigo-500/20 rounded-full hidden group-hover:block animate-grow-x"></div>
                                                </button>
                                            )}
                                            {exp.id_url && (
                                                <button onClick={() => onSelectImage(exp.id_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
                                                    <span className="text-slate-500 group-hover:text-amber-400 transition-colors">Passport / ID</span>
                                                    <div className="w-full h-1 bg-amber-500/20 rounded-full hidden group-hover:block animate-grow-x"></div>
                                                </button>
                                            )}
                                            {exp.selfie_url && (
                                                <button onClick={() => onSelectImage(exp.selfie_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
                                                    <span className="text-slate-500 group-hover:text-emerald-400 transition-colors">Selfie</span>
                                                </button>
                                            )}
                                            {exp.certificate_url && (
                                                <button onClick={() => onSelectImage(exp.certificate_url)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 transition-all text-xs flex flex-col items-center gap-1 group">
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
                                            <button onClick={() => onVerify(exp.id, 'approved')} className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] py-4 rounded-3xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                Ekspertni tasdiqlash
                                            </button>
                                            <button onClick={() => onVerify(exp.id, 'rejected')} className="px-8 py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-3xl font-bold border border-red-500/20 transition-all">
                                                Rad etish
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex-1 p-4 rounded-3xl bg-white/5 flex items-center justify-center gap-4">
                                            <span className={`font-bold uppercase tracking-widest text-sm ${exp.verified_status === 'approved' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                Status: {exp.verified_status === 'approved' ? 'Tasdiqlangan' : 'Rad etilgan'}
                                            </span>
                                            <button onClick={() => onVerify(exp.id, exp.verified_status === 'approved' ? 'rejected' : 'approved')} className="text-[10px] px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">Statusni o&apos;zgartirish</button>
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

    );
}

export default AdminExpertsTab;
