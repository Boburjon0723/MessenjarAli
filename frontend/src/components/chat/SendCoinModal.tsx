import React, { useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';

interface SendCoinModalProps {
    onClose: () => void;
    onSend: (amount: number, pin: string) => Promise<{ success: boolean; error?: string }>;
    recipientName: string;
}

export default function SendCoinModal({ onClose, onSend, recipientName }: SendCoinModalProps) {
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isInsufficientFunds, setIsInsufficientFunds] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsInsufficientFunds(false);

        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) {
            setError('Iltimos, to\'g\'ri summa kiriting');
            return;
        }
        if (pin.length !== 4 || isNaN(Number(pin))) {
            setError('PIN kod 4 raqamdan iborat bo\'lishi kerak');
            return;
        }

        setLoading(true);
        try {
            const result = await onSend(value, pin);
            if (result.success) {
                onClose();
            } else {
                const err = result.error || 'O\'tkazma amalga oshmadi';
                if (err.toLowerCase().includes('balance') || err.toLowerCase().includes('funds') || err.toLowerCase().includes('yetarli')) {
                    setIsInsufficientFunds(true);
                } else {
                    setError(err);
                }
            }
        } catch (err) {
            setError('Tizim xatosi yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    if (isInsufficientFunds) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
                <GlassCard className="w-full max-w-sm !p-0 overflow-hidden relative shadow-2xl animate-shake">
                    <div className="bg-gradient-to-br from-red-900/40 to-orange-900/40 p-8 text-center border-b border-red-500/20">
                        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Balans yetarli emas!</h2>
                        <p className="text-white/60 text-sm">
                            Sizning hisobingizda ushbu o'tkazma uchun mablag' yetarli emas.
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6 flex justify-between items-center">
                            <span className="text-white/50 text-sm">Yetishmayotgan summa:</span>
                            <span className="text-red-400 font-bold font-mono">{(parseFloat(amount) || 0).toLocaleString()} MALI</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onClose}
                                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-medium transition-all"
                            >
                                Yopish
                            </button>
                            <button
                                onClick={() => { onClose(); /* Handle Top up navigation later */ }}
                                className="py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                            >
                                <span>To'ldirish</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
            <GlassCard className="w-full max-w-sm !p-0 overflow-hidden relative shadow-2xl animate-scale-in">
                <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 p-6 text-center border-b border-white/10">
                    <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center mb-3 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white">MALI Yuborish</h2>
                    <p className="text-white/60 text-sm mt-1 mb-0"><span className="text-emerald-300 font-medium">{recipientName}</span> ga o'tkazma</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Summa</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all"
                                autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm">MALI</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Hamyon PIN kodi</label>
                        <input
                            type="password"
                            maxLength={4}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="****"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-mono placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all tracking-widest text-center"
                        />
                    </div>

                    {error && <p className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <GlassButton
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            disabled={loading}
                            className="!rounded-xl py-3"
                        >
                            Bekor qilish
                        </GlassButton>
                        <GlassButton
                            type="submit"
                            variant="premium"
                            disabled={loading}
                            className="!rounded-xl py-3 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span>Yuborish</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </>
                            )}
                        </GlassButton>
                    </div>
                </form>
            </GlassCard>
        </div>
    );
}
