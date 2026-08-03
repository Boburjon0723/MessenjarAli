'use client';

import React from 'react';
import type { Transaction } from '../adminTypes';

export type AdminTransactionsTabProps = {
    transactions: Transaction[];
};

export function AdminTransactionsTab({ transactions }: AdminTransactionsTabProps) {
    return (
        <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl animate-fade-in">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                            <th className="p-6">Vaqt</th>
                            <th className="p-6">Tur</th>
                            <th className="p-6">Kimdan</th>
                            <th className="p-6">Kimga</th>
                            <th className="p-6">Miqdor</th>
                            <th className="p-6">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {transactions.map((t: Transaction) => (
                            <tr key={t.id} className="hover:bg-white/5 transition-all group">
                                <td className="p-6 text-xs text-slate-500 font-mono">{new Date(t.created_at).toLocaleString('uz-UZ')}</td>
                                <td className="p-6"><span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase rounded-md border border-indigo-500/20">{t.type}</span></td>
                                <td className="p-6 text-sm group-hover:text-white transition-colors">{t.sender_name || 'Tizim'}</td>
                                <td className="p-6 text-sm text-slate-300">{t.receiver_name}</td>
                                <td className="p-6 font-mono text-emerald-400 font-bold">{parseFloat(t.amount).toLocaleString()}</td>
                                <td className="p-6 text-[10px] uppercase font-bold text-emerald-500/60 ">{t.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminTransactionsTab;
