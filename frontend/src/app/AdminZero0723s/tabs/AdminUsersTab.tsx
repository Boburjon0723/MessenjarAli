'use client';

import React from 'react';
import type { User } from '../adminTypes';

export type AdminUsersTabProps = {
    users: User[];
    onVerifyPhone: (userId: string) => void;
    onToggleStatus: (userId: string, isActive: boolean) => void;
};

export function AdminUsersTab({ users, onVerifyPhone, onToggleStatus }: AdminUsersTabProps) {
    return (
        <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-white/5 bg-white/5">
                <h2 className="text-xl font-bold">Barcha foydalanuvchilar</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                            <th className="p-6">Foydalanuvchi</th>
                            <th className="p-6">Aloqa</th>
                            <th className="p-6">Balans</th>
                            <th className="p-6">Status</th>
                            <th className="p-6 text-right">Amallar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map((user: User) => (
                            <tr key={user.id} className="hover:bg-white/5 transition-all group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-400 overflow-hidden">
                                            {user.avatar_url ? <img src={user.avatar_url} alt={`${user.name} avatar`} className="w-full h-full object-cover" /> : user.name[0]}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[15px]">{user.name} {user.surname}</div>
                                            <div className="text-slate-500 text-xs">@{user.username || 'username'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <div className="text-[14px] text-slate-300">{user.phone || '+998...'}</div>
                                    <div className="text-[12px] text-slate-500">{user.email || 'Email yo\'q'}</div>
                                </td>
                                <td className="p-6">
                                    <div className="font-mono text-emerald-400 font-bold">{parseFloat(user.wallet?.balance || '0').toLocaleString()} MALI</div>
                                </td>
                                <td className="p-6">
                                    {!user.phone_verified ? (
                                        <div className="flex flex-col gap-2">
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 w-fit">
                                                Tasdiqlanmagan
                                            </span>
                                            <button
                                                onClick={() => onVerifyPhone(user.id)}
                                                className="text-[10px] px-2 py-1 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg border border-indigo-600/30 transition-all font-bold w-fit"
                                            >
                                                Tasdiqlash
                                            </button>
                                        </div>
                                    ) : user.is_active ? (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            Faol
                                        </span>
                                    ) : (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20">
                                            Bloklangan
                                        </span>
                                    )}
                                </td>
                                <td className="p-6 text-right">
                                    {user.role !== 'admin' && (
                                        <button
                                            onClick={() => onToggleStatus(user.id, user.is_active)}
                                            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${user.is_active ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                                        >
                                            {user.is_active ? 'Bloklash' : 'Ochish'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminUsersTab;
