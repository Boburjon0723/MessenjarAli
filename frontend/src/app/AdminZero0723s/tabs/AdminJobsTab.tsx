'use client';

import React from 'react';
import type { JobCategory } from '../adminTypes';

export type AdminJobsTabProps = {
    jobCategories: JobCategory[];
    newCategory: { name_uz: string; name_ru: string; icon: string; price: string };
    onNewCategoryChange: (next: { name_uz: string; name_ru: string; icon: string; price: string }) => void;
    onCreate: () => void;
};

export function AdminJobsTab({ jobCategories, newCategory, onNewCategoryChange, onCreate }: AdminJobsTabProps) {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-900 p-8 rounded-[40px] border border-white/5 shadow-2xl">
                <h2 className="text-xl font-bold mb-6">Yangi kategoriya qo&apos;shish</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Nomi (UZ)</label>
                        <input type="text" value={newCategory.name_uz} onChange={e => onNewCategoryChange({ ...newCategory, name_uz: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Huquqshunos" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Nomi (RU)</label>
                        <input type="text" value={newCategory.name_ru} onChange={e => onNewCategoryChange({ ...newCategory, name_ru: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Юрист" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Ikonka (Lucide Name)</label>
                        <input type="text" value={newCategory.icon} onChange={e => onNewCategoryChange({ ...newCategory, icon: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="Gavel" />
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase mb-2 block">Narxi (MALI)</label>
                        <input type="number" value={newCategory.price} onChange={e => onNewCategoryChange({ ...newCategory, price: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none" placeholder="100" />
                    </div>
                </div>
                <button onClick={onCreate} className="mt-6 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all">Qo&apos;shish</button>
            </div>

            <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-black/20 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        <tr>
                            <th className="p-6">Ikonka</th>
                            <th className="p-6">UZ Nomi</th>
                            <th className="p-6">RU Nomi</th>
                            <th className="p-6">E&apos;lon narxi</th>
                            <th className="p-6">Holat</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {jobCategories.map((cat: JobCategory) => (
                            <tr key={cat.id} className="hover:bg-white/5 transition-all">
                                <td className="p-6 text-indigo-400 font-bold">{cat.icon}</td>
                                <td className="p-6 font-bold">{cat.name_uz}</td>
                                <td className="p-6 text-slate-400">{cat.name_ru}</td>
                                <td className="p-6 font-mono text-emerald-400 font-bold">{parseFloat(cat.publication_price_mali).toLocaleString()} MALI</td>
                                <td className="p-6">
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold border border-emerald-500/20">FAOL</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminJobsTab;
