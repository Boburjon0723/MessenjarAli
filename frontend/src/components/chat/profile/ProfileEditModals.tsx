'use client';

import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { GlassButton } from '../../ui/GlassButton';
import { GlassDatePicker } from '../../ui/GlassDatePicker';
import { X, CheckCircle, Bell } from 'lucide-react';

export type ProfileEditModalsProps = {
    t: (...args: any[]) => string;
    language: string;
    bgSettings?: { rgb?: { r: number; g: number; b: number } };
    showLanguageModal: boolean;
    setShowLanguageModal: (v: boolean) => void;
    handleSaveLanguage: (id: "uz" | "ru" | "en") => void;
    showNameModal: boolean;
    setShowNameModal: (v: boolean) => void;
    editFirstName: string;
    setEditFirstName: (v: string) => void;
    editLastName: string;
    setEditLastName: (v: string) => void;
    handleSaveName: () => void;
    showUsernameModal: boolean;
    setShowUsernameModal: (v: boolean) => void;
    editUsername: string;
    setEditUsername: (v: string) => void;
    handleSaveUsername: () => void;
    showBioModal?: boolean;
    setShowBioModal?: (v: boolean) => void;
    editBio?: string;
    setEditBio?: (v: string) => void;
    handleSaveBio?: () => void;
    showDatePicker: boolean;
    setShowDatePicker: (v: boolean) => void;
    birthday: string;
    handleSaveBirthday: (val: string) => void;
    avatarPreviewUrl: string | null;
    setAvatarPreviewUrl: (v: string | null) => void;
    toast: { type: 'success' | 'error' | 'warning'; message: string } | null;
    setToast: (v: { type: 'success' | 'error' | 'warning'; message: string } | null) => void;
};

export function ProfileEditModals({
    t, language, bgSettings,
    showLanguageModal, setShowLanguageModal, handleSaveLanguage,
    showNameModal, setShowNameModal, editFirstName, setEditFirstName, editLastName, setEditLastName, handleSaveName,
    showUsernameModal, setShowUsernameModal, editUsername, setEditUsername, handleSaveUsername,
    showBioModal, setShowBioModal, editBio, setEditBio, handleSaveBio,
    showDatePicker, setShowDatePicker, birthday, handleSaveBirthday,
    avatarPreviewUrl, setAvatarPreviewUrl,
    toast, setToast,
}: ProfileEditModalsProps) {
    return (
        <>
            {/* SHARED MODALS */}
            {showLanguageModal && (
                <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={(e) => { e.stopPropagation(); setShowLanguageModal(false); }}>
                    <GlassCard
                        className="w-full max-w-[300px] !bg-transparent p-4 rounded-[28px] border border-white/10 overflow-hidden shadow-2xl"
                        style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-white font-bold p-3 text-lg mb-2">{t('language_modal_title')}</h3>
                        <div className="space-y-1">
                            {[{ id: 'uz', n: 'O\'zbekcha' }, { id: 'ru', n: 'Русский' }, { id: 'en', n: 'English' }].map(l => (
                                <button key={l.id}
                                    onClick={() => handleSaveLanguage(l.id as any)}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${language === l.id ? 'bg-accent-primary text-white font-bold' : 'text-white/60 hover:bg-white/5'} `}>
                                    <span>{l.n}</span>
                                    {language === l.id && <div className="w-2 h-2 bg-white rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </GlassCard>
                </div>
            )}
            {showNameModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={(e) => { e.stopPropagation(); setShowNameModal(false); }}>
                    <GlassCard
                        className="w-full max-w-[340px] !bg-transparent p-7 shadow-2xl animate-scale-in rounded-[28px] border border-white/10"
                        style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-white font-bold text-xl mb-6">{t('edit_profile')}</h3>
                        <div className="space-y-5">
                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{t('name')}</label>
                                <input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5 focus-within:translate-x-1 transition-transform">
                                <label className="text-white/40 text-[11px] ml-1 uppercase font-bold tracking-wider">{language === 'uz' ? 'Familiya' : (language === 'ru' ? 'Фамилия' : 'Surname')}</label>
                                <input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white focus:border-accent-primary focus:outline-none transition-all" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 mt-10">
                            <GlassButton onClick={handleSaveName} className="w-full !bg-accent-primary !text-white !rounded-xl py-3.5 font-bold shadow-lg shadow-accent-primary/20">{t('save')}</GlassButton>
                            <button onClick={() => setShowNameModal(false)} className="w-full py-3 text-white/30 hover:text-white transition-colors text-[14px]">{t('cancel')}</button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {showUsernameModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4" onClick={(e) => { e.stopPropagation(); setShowUsernameModal(false); }}>
                    <GlassCard
                        className="w-full max-w-[340px] !bg-transparent p-7 shadow-2xl animate-scale-in rounded-[28px] border border-white/10"
                        style={{ backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)` }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-white font-bold text-xl mb-4">Username</h3>
                        <div className="relative group">
                            <span className="absolute left-4 top-[15px] text-accent-primary font-bold text-lg group-focus-within:scale-110 transition-transform">@</span>
                            <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-9 pr-4 text-white focus:border-accent-primary focus:outline-none transition-all text-lg" placeholder="username" />
                        </div>
                        <p className="text-white/20 text-[12px] mt-4 leading-relaxed">{t('username_desc')}</p>
                        <div className="flex flex-col gap-3 mt-10">
                            <GlassButton onClick={handleSaveUsername} className="w-full !bg-accent-primary !text-white !rounded-xl py-3.5 font-bold">{t('save')}</GlassButton>
                            <button onClick={() => setShowUsernameModal(false)} className="w-full py-3 text-white/30 hover:text-white transition-colors">{t('cancel')}</button>
                        </div>
                    </GlassCard>
                </div>
            )}

            {showBioModal && setShowBioModal && setEditBio && handleSaveBio && (
                <div
                    className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowBioModal(false);
                    }}
                >
                    <GlassCard
                        className="w-full max-w-[340px] !bg-transparent p-7 shadow-2xl animate-scale-in rounded-[28px] border border-white/10"
                        style={{
                            backgroundColor: `rgba(${bgSettings?.rgb?.r || 28}, ${bgSettings?.rgb?.g || 36}, ${bgSettings?.rgb?.b || 47}, 0.8)`,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-white font-bold text-xl mb-4">{t('bio')}</h3>
                        <textarea
                            value={editBio ?? ''}
                            onChange={(e) => setEditBio(e.target.value)}
                            rows={4}
                            maxLength={200}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-accent-primary focus:outline-none transition-all resize-none text-[15px] leading-relaxed"
                            placeholder={t('bio')}
                        />
                        <div className="flex flex-col gap-3 mt-8">
                            <GlassButton
                                onClick={handleSaveBio}
                                className="w-full !bg-accent-primary !text-white !rounded-xl py-3.5 font-bold"
                            >
                                {t('save')}
                            </GlassButton>
                            <button
                                type="button"
                                onClick={() => setShowBioModal(false)}
                                className="w-full py-3 text-white/30 hover:text-white transition-colors"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </GlassCard>
                </div>
            )}

            <GlassDatePicker
                open={showDatePicker}
                value={birthday}
                language={language === 'ru' ? 'ru' : 'uz'}
                onChange={(val) => {
                    handleSaveBirthday(val);
                    setShowDatePicker(false);
                }}
                onClose={() => setShowDatePicker(false)}
            />

            {avatarPreviewUrl && (
                <div
                    className="fixed inset-0 z-[140] flex flex-col bg-black animate-fade-in"
                    role="dialog"
                    aria-modal="true"
                    aria-label={
                        language === 'ru' ? 'Фото профиля' : language === 'en' ? 'Profile photo' : 'Profil rasmi'
                    }
                    onClick={() => setAvatarPreviewUrl(null)}
                >
                    <div className="flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))]">
                        <button
                            type="button"
                            className="rounded-full bg-white/15 p-2.5 text-white hover:bg-white/25 transition-colors touch-manipulation"
                            onClick={(e) => {
                                e.stopPropagation();
                                setAvatarPreviewUrl(null);
                            }}
                            aria-label={t('cancel')}
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                    <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={avatarPreviewUrl}
                            alt=""
                            className="max-h-[min(88dvh,100%)] max-w-full object-contain select-none"
                            style={{ touchAction: 'pinch-zoom' }}
                            onClick={(e) => e.stopPropagation()}
                            draggable={false}
                        />
                    </div>
                </div>
            )}

            {toast && (
                <div
                    className={`
                        fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm
                        ${toast.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100' :
                            toast.type === 'warning' ? 'bg-amber-500/15 border-amber-500/40 text-amber-100' :
                                'bg-red-500/15 border-red-500/40 text-red-100'}
                    `}
                >
                    <div className="flex items-center gap-2">
                        {toast.type === 'success' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                        {toast.type === 'warning' && <Bell className="w-4 h-4 flex-shrink-0" />}
                        {toast.type === 'error' && <X className="w-4 h-4 flex-shrink-0" />}
                        <span className="leading-snug">{toast.message}</span>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 text-white/60 hover:text-white flex-shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}

        </>
    );
}

export default ProfileEditModals;
