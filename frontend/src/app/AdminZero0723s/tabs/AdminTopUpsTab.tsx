'use client';

import React from 'react';
import type { TopUp } from '../adminTypes';

export type AdminTopUpsTabProps = {
    topUps: TopUp[];
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
};

export function AdminTopUpsTab({ topUps, onApprove, onReject }: AdminTopUpsTabProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {topUps.map((req: TopUp) => (
                <div key={req.id} className={`bg-slate-900 p-6 rounded-4xl border transition-all ${req.status === 'pending' ? 'border-amber-500/30 shadow-lg shadow-amber-500/5' : 'border-white/5'}`}>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-3xl font-mono font-bold text-white mb-1">{parseFloat(req.amount).toLocaleString()} <span className="text-slate-500 text-lg">MALI</span></p>
                            <p className="text-slate-400 text-sm">{req.name} ({req.phone || req.email})</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                            req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {req.status}
                        </span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-slate-500 text-xs italic">{new Date(req.created_at).toLocaleString('uz-UZ')}</span>
                        {req.status === 'pending' && (
                            <div className="flex gap-2">
                                <button onClick={() => onApprove(req.id)} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all">Tasdiqlash</button>
                                <button onClick={() => onReject(req.id)} className="px-6 py-2.5 bg-red-600/10 hover:bg-red-600 text-white rounded-2xl font-bold text-sm transition-all">Rad etish</button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default AdminTopUpsTab;
