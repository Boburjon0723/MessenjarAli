'use client';

import React, { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';

interface SendTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    tokenSymbol: string;
    maxBalance: number;
}

export const SendTokenModal: React.FC<SendTokenModalProps> = ({
    isOpen,
    onClose,
    tokenSymbol,
    maxBalance
}) => {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const feeRate = 0.01; // 1%
    const numericAmount = parseFloat(amount) || 0;
    const fee = numericAmount * feeRate;
    const total = numericAmount + fee;

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
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
                        <h2 className="text-2xl font-bold text-white">Send {tokenSymbol}</h2>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                        >
                            <span className="text-white text-xl">×</span>
                        </button>
                    </div>

                    <form onSubmit={handleSend} className="space-y-5">
                        {/* Recipient */}
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">
                                Recipient Address
                            </label>
                            <input
                                type="text"
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                placeholder="0x... or username"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                required
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-white/60">
                                    Amount
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setAmount(maxBalance.toString())}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                >
                                    Max: {maxBalance.toLocaleString()} {tokenSymbol}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 pr-20 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 font-medium">
                                    {tokenSymbol}
                                </span>
                            </div>
                        </div>

                        {/* Note (optional) */}
                        <div>
                            <label className="block text-sm font-medium text-white/60 mb-2">
                                Note (Optional)
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Add a message..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all resize-none"
                            />
                        </div>

                        {/* Fee Preview */}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Amount</span>
                                <span className="text-white font-medium">{numericAmount.toFixed(2)} {tokenSymbol}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-white/60">Fee (1%)</span>
                                <span className="text-white font-medium">{fee.toFixed(4)} {tokenSymbol}</span>
                            </div>
                            <div className="h-px bg-white/10 my-2"></div>
                            <div className="flex items-center justify-between">
                                <span className="text-white font-semibold">Total</span>
                                <span className="text-white font-bold text-lg">{total.toFixed(2)} {tokenSymbol}</span>
                            </div>
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
                                disabled={!recipient || !amount || total > maxBalance}
                            >
                                Send Now
                            </GlassButton>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};


