'use client';

import React from 'react';
import type { DisputedDeal } from '../adminTypes';

export type AdminDisputesTabProps = {
    disputedDeals: DisputedDeal[];
    onResolve: (id: string, resolution: 'release' | 'refund') => void;
};

export function AdminDisputesTab({ disputedDeals, onResolve }: AdminDisputesTabProps) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl">
                <div className="p-6 border-b border-white/5 bg-white/5">
                    <h2 className="text-xl font-bold font-sans">E&apos;lonlar bo&apos;yicha nizolar</h2>
                    <p className="text-slate-500 text-xs mt-1">Mijoz &quot;Xizmat foydali bo&apos;lmadi&quot; deb belgilagan kelishuvlar.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th className="p-6">Kelishuv</th>
                                <th className="p-6">Mijoz / Mutaxassis</th>
                                <th className="p-6">Summa</th>
                                <th className="p-6">Vaqt</th>
                                <th className="p-6 text-right">Hal qilish</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {disputedDeals.map((d) => (
                                <tr key={d.id} className="hover:bg-white/5 transition-all">
                                    <td className="p-6">
                                        <div className="text-xs text-indigo-400 font-mono mb-1">ID: ...{d.id.slice(-8)}</div>
                                        <button onClick={() => window.open(`/messages/${d.chat_id}`, '_blank')} className="text-[10px] px-2 py-1 bg-white/5 rounded-md hover:bg-white/10 text-slate-400">Chatni ko&apos;rish</button>
                                    </td>
                                    <td className="p-6 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-white"><small className="text-slate-500">Mijoz:</small> {d.client_name}</span>
                                            <span className="text-indigo-300 font-semibold"><small className="text-slate-500">Expert:</small> {d.expert_name}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 font-mono text-emerald-400 font-bold">{parseFloat(d.amount).toLocaleString()} MALI</td>
                                    <td className="p-6 text-[10px] text-slate-500">{new Date(d.updated_at).toLocaleString('uz-UZ')}</td>
                                    <td className="p-6 text-right">
                                        <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                            <button
                                                onClick={() => onResolve(d.id, 'release')}
                                                className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold hover:bg-emerald-600/30 transition-all uppercase"
                                            >
                                                Expertga o&apos;tkazish
                                            </button>
                                            <button
                                                onClick={() => onResolve(d.id, 'refund')}
                                                className="px-3 py-1.5 bg-rose-600/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-bold hover:bg-rose-600/30 transition-all uppercase"
                                            >
                                                Mijozga qaytarish
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {disputedDeals.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-slate-600 italic">Hozircha hech qanday nizo mavjud emas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminDisputesTab;
