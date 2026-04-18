"use client";

import React, { useState } from 'react';
import { Star, X, MessageSquare, Send } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { apiFetch } from '@/lib/api';

interface ReviewModalProps {
    expertId: string;
    expertName: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ReviewModal({ expertId, expertName, onClose, onSuccess }: ReviewModalProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (rating === 0) {
            setError("Iltimos, yulduzcha tanlang");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const res = await apiFetch('/api/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    expert_id: expertId,
                    rating,
                    comment
                })
            });

            if (res.ok) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                const data = await res.json();
                setError(data.message || "Xatolik yuz berdi");
            }
        } catch (err) {
            setError("Serverga ulanishda xato");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <GlassCard className="w-full max-w-md !bg-[#161821] !border-white/10 !rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full" />

                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
                >
                    <X size={20} />
                </button>

                <div className="text-center space-y-2 mb-8 relative">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Fikr-mulohaza qoldiring</h2>
                    <p className="text-sm text-white/50 tracking-wide font-medium">Mutaxassis: <span className="text-blue-400 font-bold">{expertName}</span></p>
                </div>

                <div className="space-y-8 relative">
                    {/* Star Rating */}
                    <div className="flex flex-col items-center gap-4">
                        <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30">Reytingni tanlang</label>
                        <div className="flex gap-3">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    className={`p-1.5 transition-all duration-300 transform ${(hover || rating) >= star ? 'scale-125 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-white/10'
                                        } hover:scale-135`}
                                >
                                    <Star size={32} fill={(hover || rating) >= star ? 'currentColor' : 'none'} strokeWidth={1.5} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Comment Area */}
                    <div className="space-y-3">
                        <label className="text-[10px] uppercase font-black tracking-[0.2em] text-white/30 ml-1">Fikringiz (ixtiyoriy)</label>
                        <div className="relative group">
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Dars qanday o'tdi? Nimalar ma'qul keldi..."
                                className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all min-h-[120px] resize-none"
                            />
                            <MessageSquare className="absolute bottom-4 right-4 text-white/10 group-focus-within:text-blue-500/50 transition-colors" size={18} />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                            <p className="text-xs text-red-400 font-bold">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={submitting || rating === 0}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
                    >
                        {submitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Send size={16} />
                                Yuborish
                            </>
                        )}
                    </button>

                    <p className="text-[10px] text-white/20 text-center uppercase tracking-widest font-medium">Sizning fikringiz mutaxassis sifatini oshirishga yordam beradi</p>
                </div>
            </GlassCard>
        </div>
    );
}

