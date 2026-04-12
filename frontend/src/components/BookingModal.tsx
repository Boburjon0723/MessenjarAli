'use client';

import React, { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    service: {
        title: string;
        provider: string;
        price: number;
        icon: string;
    };
}

export const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, service }) => {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('1');
    const [notes, setNotes] = useState('');

    const totalPrice = service.price * parseFloat(duration);
    const escrowAmount = totalPrice;

    const handleBook = (e: React.FormEvent) => {
        e.preventDefault();
        console.log({ date, time, duration, notes, totalPrice });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative w-full max-w-lg">
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl">{service.icon}</span>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{service.title}</h2>
                                <p className="text-white/60">{service.provider}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                        >
                            <span className="text-white text-xl">×</span>
                        </button>
                    </div>

                    <form onSubmit={handleBook} className="space-y-4">
                        {/* Date */}
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">
                                Date
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                required
                            />
                        </div>

                        {/* Time */}
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">
                                Time
                            </label>
                            <input
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                required
                            />
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">
                                Duration (hours)
                            </label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            >
                                <option value="0.5">30 minutes</option>
                                <option value="1">1 hour</option>
                                <option value="1.5">1.5 hours</option>
                                <option value="2">2 hours</option>
                                <option value="3">3 hours</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Describe your requirements..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                            />
                        </div>

                        {/* Escrow Info */}
                        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🔒</span>
                                <p className="text-blue-400 font-semibold">Escrow Protection</p>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Service Cost</span>
                                <span className="text-white font-medium">{totalPrice} MALI</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Escrow Amount</span>
                                <span className="text-white font-medium">{escrowAmount} MALI</span>
                            </div>
                            <div className="h-px bg-white/10 my-2"></div>
                            <p className="text-xs text-white/60">
                                Funds will be held in escrow until the service is completed and approved.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            <GlassButton
                                type="button"
                                variant="secondary"
                                className="flex-1"
                                onClick={onClose}
                            >
                                Cancel
                            </GlassButton>
                            <GlassButton
                                type="submit"
                                variant="primary"
                                className="flex-1"
                            >
                                Book & Pay {totalPrice} MALI
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};
