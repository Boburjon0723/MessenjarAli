import React from 'react';

export function TabItem({ active, onClick, icon, label, pulse }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, pulse?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                relative flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300
                ${active
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'}
            `}
        >
            {icon}
            {label}
            {pulse && !active && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
            )}
        </button>
    );
}

export default TabItem;
