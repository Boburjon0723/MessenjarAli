'use client';

import React from 'react';
import type { TopUp, Transaction, User, Expert } from '../adminTypes';

export type AdminDashboardTabProps = {
    users: User[];
    topUps: TopUp[];
    transactions: Transaction[];
    pendingExperts: Expert[];
    systemStats: {
        system_treasury_balance: number;
        total_locked_balance: number;
        mentor_escrow_pending: number;
        mentor_payout_completed: number;
    };
};

export function AdminDashboardTab({
    users,
    topUps,
    transactions,
    pendingExperts,
    systemStats,
}: AdminDashboardTabProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Umumiy foydalanuvchilar</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold">{users.length}</span>
                    <span className="text-emerald-500 text-sm font-bold mb-1">+12%</span>
                </div>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Kutilayotgan to&apos;lovlar</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-amber-500">{topUps.filter(t => t.status === 'pending').length}</span>
                    <span className="text-slate-500 text-sm mb-1">ta ariza</span>
                </div>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Tranzaksiyalar</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-emerald-500">{transactions.length}</span>
                    <span className="text-emerald-500 text-sm font-bold mb-1">jami</span>
                </div>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Ekspert arizalari</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-indigo-500">{pendingExperts.length}</span>
                    <span className="text-indigo-500 text-sm font-bold mb-1">yangi</span>
                </div>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Tizimdagi mavjud MALI</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-emerald-500">{systemStats.system_treasury_balance.toLocaleString()}</span>
                    <span className="text-slate-500 text-sm mb-1">MALI</span>
                </div>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Muzlatilgan MALI</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-cyan-400">{systemStats.total_locked_balance.toLocaleString()}</span>
                    <span className="text-slate-500 text-sm mb-1">MALI</span>
                </div>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Mentor oylik (pending)</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-fuchsia-400">{systemStats.mentor_escrow_pending.toLocaleString()}</span>
                    <span className="text-slate-500 text-sm mb-1">MALI</span>
                </div>
            </div>
            <div className="bg-slate-900 border border-white/5 p-6 rounded-3xl shadow-xl">
                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">Mentorga to&apos;langan ish haqi</h3>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-lime-400">{systemStats.mentor_payout_completed.toLocaleString()}</span>
                    <span className="text-slate-500 text-sm mb-1">MALI</span>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboardTab;
