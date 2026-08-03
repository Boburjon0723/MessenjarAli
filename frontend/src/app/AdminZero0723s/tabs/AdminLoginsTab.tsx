'use client';

import React from 'react';
import type { AdminLoginAudit } from '../adminTypes';

export type AdminLoginsTabProps = {
    adminLogins: AdminLoginAudit[];
    onRefresh: () => void;
};

export function AdminLoginsTab({ adminLogins, onRefresh }: AdminLoginsTabProps) {
    return (
        <div className="bg-slate-900 rounded-4xl overflow-hidden border border-white/5 shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Admin kirishlari</h2>
                    <p className="text-slate-500 text-xs mt-1">
                        So&apos;nggi {adminLogins.length} ta admin login urinishlari (muvaffaqiyatli va muvaffaqiyatsiz).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 border border-white/10 hover:bg-white/15 transition-all"
                >
                    Yangilash
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-black/20 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
                        <tr>
                            <th className="p-4">Vaqt</th>
                            <th className="p-4">Admin</th>
                            <th className="p-4">Telefon</th>
                            <th className="p-4">IP manzil</th>
                            <th className="p-4">Device</th>
                            <th className="p-4">Natija</th>
                            <th className="p-4">Sabab</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {adminLogins.map((log) => (
                            <tr key={log.id} className="hover:bg-white/5 transition-all">
                                <td className="p-4 text-slate-400 font-mono">
                                    {new Date(log.created_at).toLocaleString('uz-UZ')}
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold">
                                            {log.name || log.surname
                                                ? `${log.name || ''} ${log.surname || ''}`.trim()
                                                : 'Noma&apos;lum'}
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                            {log.role || 'role yo&apos;q'}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span>{log.phone || log.phone_or_email}</span>
                                        {log.email && (
                                            <span className="text-[10px] text-slate-500">{log.email}</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-slate-300">
                                    {log.ip_address || '-'}
                                </td>
                                <td className="p-4 max-w-xs text-[10px] text-slate-500 truncate" title={log.user_agent || ''}>
                                    {log.user_agent || '-'}
                                </td>
                                <td className="p-4">
                                    <span
                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            log.success
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                        }`}
                                    >
                                        {log.success ? 'Muvaffaqiyatli' : 'Xato'}
                                    </span>
                                </td>
                                <td className="p-4 text-[11px] text-slate-400">
                                    {log.reason || '-'}
                                </td>
                            </tr>
                        ))}
                        {adminLogins.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-500">
                                    Hozircha admin login audit yozuvlari topilmadi.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminLoginsTab;
