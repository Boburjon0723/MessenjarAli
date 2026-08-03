'use client';

import React from 'react';

export type AdminSettingsTabProps = {
    desktopDownloadUrl: string | null;
    desktopVersion: string | null;
    desktopFile: File | null;
    desktopUploading: boolean;
    desktopUploadProgress: number | null;
    desktopUrlInput: string;
    desktopSavingUrl: boolean;
    platformSettings: {
        expert_subscription_fee: number;
        commission_rate: number;
        admin_card_number: string;
    };
    systemStats: {
        system_treasury_balance: number;
        total_user_balance: number;
        total_fees_collected: number;
        total_locked_balance: number;
        mentor_escrow_pending: number;
        mentor_payout_completed: number;
    };
    onDesktopFileChange: (file: File | null) => void;
    onUploadDesktop: () => void;
    onDesktopUrlInputChange: (v: string) => void;
    onSaveDesktopUrl: () => void;
    onDesktopVersionChange: (v: string) => void;
    onPlatformSettingsChange: (next: AdminSettingsTabProps['platformSettings']) => void;
    onUpdateSettings: () => void;
    onRefreshStats: () => void;
};

export function AdminSettingsTab(props: AdminSettingsTabProps) {
    const {
        desktopDownloadUrl,
        desktopVersion,
        desktopUploading,
        desktopUploadProgress,
        desktopUrlInput,
        desktopSavingUrl,
        platformSettings,
        systemStats,
        onDesktopFileChange,
        onUploadDesktop,
        onDesktopUrlInputChange,
        onSaveDesktopUrl,
        onDesktopVersionChange,
        onPlatformSettingsChange,
        onUpdateSettings,
        onRefreshStats,
    } = props;

    return (
                    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                        <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 shadow-2xl">
                            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                                <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                </div>
                                Platforma Sozlamalari
                            </h2>

                            <div className="space-y-6">
                                {/* Desktop app settings */}
                                <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] space-y-4">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div> Desktop ilova (Windows)
                                    </h3>

                                    {desktopDownloadUrl ? (
                                        <div className="text-xs text-slate-300 space-y-2">
                                            <p>Hozirgi yuklab olish havolasi:</p>
                                            <a
                                                href={desktopDownloadUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="break-all text-sky-300 hover:text-sky-200 underline underline-offset-2"
                                            >
                                                {desktopDownloadUrl}
                                            </a>
                                            <p className="mt-1">
                                                Joriy desktop versiya:{' '}
                                                <span className="font-mono font-semibold">
                                                    {desktopVersion || '—'}
                                                </span>
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-500">
                                            Hozircha desktop ilova sozlanmagan. Yangi .exe fayl yuklab, havolani faollashtiring.
                                        </p>
                                    )}

                                    <div className="space-y-3">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block">
                                            Yangi .exe faylni yuklash
                                        </label>
                                        <input
                                            type="file"
                                            accept=".exe"
                                            onChange={(e) => onDesktopFileChange(e.target.files?.[0] || null)}
                                            className="block w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-sky-500/80 file:text-white hover:file:bg-sky-500 cursor-pointer"
                                        />
                                        <button
                                            type="button"
                                            onClick={onUploadDesktop}
                                            disabled={desktopUploading}
                                            className="mt-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm shadow-lg shadow-sky-600/20 transition-all"
                                        >
                                            {desktopUploading
                                                ? `Yuklanmoqda${desktopUploadProgress !== null ? ` – ${desktopUploadProgress}%` : '...'}`
                                                : 'Desktop ilovani yangilash'}
                                        </button>
                                        <p className="text-[10px] text-slate-500 mt-2">
                                            Agar Railway katta faylni qabul qilmasa, quyida Google Drive yoki boshqa hosting
                                            havolasini qo&apos;lda kiritishingiz mumkin.
                                        </p>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block">
                                            Google Drive (yoki boshqa) yuklab olish havolasi
                                        </label>
                                        <input
                                            type="text"
                                            value={desktopUrlInput}
                                            onChange={(e) => onDesktopUrlInputChange(e.target.value)}
                                            placeholder="https://drive.google.com/..."
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={onSaveDesktopUrl}
                                            disabled={desktopSavingUrl || !desktopUrlInput.trim()}
                                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-xs shadow-lg shadow-emerald-600/20 transition-all"
                                        >
                                            {desktopSavingUrl ? 'Saqlanmoqda...' : 'Havolani saqlash'}
                                        </button>
                                    </div>

                                    <div className="mt-4 space-y-2">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase block">
                                            Desktop versiya raqami (masalan, 1.0.0)
                                        </label>
                                        <input
                                            type="text"
                                            value={desktopVersion || ''}
                                            onChange={(e) => onDesktopVersionChange(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-sky-400 outline-none"
                                            placeholder="1.0.0"
                                        />
                                        <p className="text-[10px] text-slate-500">
                                            Har yangi desktop .exe yuklaganingizda shu versiyani 1.0.1, 1.0.2 va hokazo qilib oshirib boring.
                                            Auto-update tizimi ushbu versiya raqami asosida ishlaydi.
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 bg-white/5 border border-white/5 rounded-[32px] space-y-4">
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Ekspertlar Nazorati
                                    </h3>

                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white/80">Eksperni tasdiqlash to&apos;lovi (MALI)</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                value={platformSettings.expert_subscription_fee}
                                                onChange={(e) => onPlatformSettingsChange({ ...platformSettings, expert_subscription_fee: parseInt(e.target.value) || 0 })}
                                                min={0}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-mono text-emerald-400 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="20"
                                            />
                                            <div className="bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center px-6 text-slate-500 font-bold">MALI</div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic mt-2 ml-2">Hozircha bu to&apos;lov o&apos;chirilgan (0 MALI). Keyinchalik kerak bo&apos;lsa qayta yoqiladi.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white/80">Platform komissiyasi (%)</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                step={0.5}
                                                value={platformSettings.commission_rate}
                                                onChange={(e) => onPlatformSettingsChange({ ...platformSettings, commission_rate: parseFloat(e.target.value) || 0 })}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xl font-mono text-emerald-400 focus:border-indigo-500 outline-none transition-all"
                                                placeholder="10"
                                            />
                                            <div className="bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center px-6 text-slate-500 font-bold">%</div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic mt-2 ml-2">Dars to&apos;lovi tasdiqlanganda ustozdan olinadigan foiz (masalan 10 = 10%).</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-white/80">Topup/Withdraw uchun admin karta raqami</label>
                                        <input
                                            type="text"
                                            value={platformSettings.admin_card_number}
                                            onChange={(e) => onPlatformSettingsChange({ ...platformSettings, admin_card_number: e.target.value.replace(/[^\d\s]/g, '').slice(0, 19) })}
                                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg font-mono text-emerald-400 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="8600 1234 5678 9012"
                                        />
                                        <p className="text-[10px] text-slate-500 italic mt-2 ml-2">Wallet bo&apos;limidagi to&apos;ldirish karta maydoni shu qiymatni oladi.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Tizim rezervi</p>
                                            <p className="text-xl font-bold text-emerald-400 mt-2">{systemStats.system_treasury_balance.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Foydalanuvchi balanslari yig&apos;indisi</p>
                                            <p className="text-xl font-bold text-blue-400 mt-2">{systemStats.total_user_balance.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Yig&apos;ilgan fee</p>
                                            <p className="text-xl font-bold text-amber-400 mt-2">{systemStats.total_fees_collected.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Muzlatilgan MALI (jami)</p>
                                            <p className="text-xl font-bold text-cyan-400 mt-2">{systemStats.total_locked_balance.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Mentor oylik (pending escrow)</p>
                                            <p className="text-xl font-bold text-fuchsia-400 mt-2">{systemStats.mentor_escrow_pending.toLocaleString()} MALI</p>
                                        </div>
                                        <div className="bg-black/30 border border-white/10 rounded-2xl p-4">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold">Mentorga o&apos;tgan ish haqi</p>
                                            <p className="text-xl font-bold text-lime-400 mt-2">{systemStats.mentor_payout_completed.toLocaleString()} MALI</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={onUpdateSettings}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] py-5 rounded-[28px] font-bold text-lg shadow-2xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3"
                                >
                                    O'zgarishlarni saqlash
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onRefreshStats();
                                    }}
                                    className="w-full bg-white/10 hover:bg-white/15 py-3 rounded-2xl font-semibold text-sm transition-all"
                                >
                                    Ko'rsatkichlarni yangilash
                                </button>
                            </div>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-4xl flex items-start gap-4">
                            <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-amber-500 font-bold uppercase tracking-widest text-xs">Diqqat</h4>
                                <p className="text-white/60 text-xs leading-relaxed">To&apos;lov miqdorini o&apos;zgartirish faqat yangi arizalarga (yoki hali tasdiqlanmaganlarga) ta&apos;sir qiladi. Avval tasdiqlangan ekspertlardan qayta to&apos;lov undirilmaydi.</p>
                            </div>
                        </div>
                    </div>

    );
}

export default AdminSettingsTab;
