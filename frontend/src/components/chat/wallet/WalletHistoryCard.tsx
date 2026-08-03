import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '@/context/LanguageContext';
import { getUser } from '@/lib/auth-storage';

export function WalletHistoryCard({ transactions }: { transactions: any[] }) {
    const { t, language } = useLanguage();
    return (
        <GlassCard className="!p-3 lg:!p-5 !rounded-[1.25rem] lg:!rounded-[25px] border border-amber-500/15 bg-gradient-to-br from-[rgba(var(--glass-rgb),0.55)] to-[rgba(var(--glass-rgb),0.35)] backdrop-blur-xl shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-2 lg:mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-white font-bold text-sm lg:text-base tracking-tight">{t('transaction_history')}</h3>
                        <p className="text-white/40 text-[10px] lg:text-xs">{t('transaction_history_sub')}</p>
                    </div>
                </div>
                {transactions.length > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-100/90 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-400/25 shrink-0 tabular-nums">
                        {transactions.length}
                    </span>
                )}
            </div>
            {transactions.length === 0 ? (
                <div className="text-center py-7 lg:py-9 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                    <p className="text-white/35 text-xs lg:text-sm">{t('no_transactions')}</p>
                </div>
            ) : (
                <div className="max-h-[min(42vh,280px)] sm:max-h-[300px] lg:max-h-[420px] overflow-y-auto overscroll-y-contain custom-scrollbar space-y-2 pr-0.5 -mr-0.5">
                    {transactions.map((tx) => {
                        const currentUser = getUser() || {};
                        const userId = currentUser.id || currentUser.userId;
                        const isSender = tx.sender_id === userId;
                        const otherName = isSender ? (tx.receiver_name || t('system')) : (tx.sender_name || t('system'));
                        const otherAvatar = isSender ? tx.receiver_avatar : tx.sender_avatar;

                        return (
                            <div
                                key={tx.id}
                                className="p-3 lg:p-4 rounded-xl lg:rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/15 transition-all relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex justify-between items-center gap-2 relative z-10">
                                    <div className="flex items-center gap-2.5 lg:gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-white/5 p-0.5 border border-white/10 shrink-0">
                                            {otherAvatar ? (
                                                <img src={otherAvatar} alt="" className="w-full h-full object-cover rounded-[10px] lg:rounded-[12px]" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent rounded-[10px] lg:rounded-[12px]">
                                                    <span className="text-white text-xs lg:text-sm font-bold">{otherName[0]}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white font-bold text-xs lg:text-sm truncate">
                                                {isSender ? `${t('sent')}: ` : `${t('received')}: `}
                                                {otherName}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isSender ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                                    {isSender ? t('outgoing') : t('incoming')}
                                                </span>
                                                <span className="text-[9px] text-white/30 font-bold">
                                                    {new Date(tx.created_at).toLocaleString(language === 'uz' ? 'uz-UZ' : (language === 'ru' ? 'ru-RU' : 'en-US'), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-base lg:text-lg font-black tabular-nums ${isSender ? 'text-white/90' : 'text-emerald-400'}`}>
                                            {isSender ? '-' : '+'}
                                            {Number(tx.amount).toLocaleString()}
                                        </p>
                                        <p className="text-[9px] text-white/25 font-black uppercase tracking-widest">MALI</p>
                                    </div>
                                </div>
                                {tx.note && (
                                    <p className="mt-2 pt-2 border-t border-white/5 text-[10px] lg:text-[11px] text-white/40 italic truncate relative z-10">{tx.note}</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </GlassCard>
    );
}

export default WalletHistoryCard;
