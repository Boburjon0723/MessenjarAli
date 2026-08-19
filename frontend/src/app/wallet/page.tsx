'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';
import { WalletHistoryCard } from '@/components/chat/wallet/WalletHistoryCard';
import { WalletTopUpModal } from '@/components/chat/wallet/WalletTopUpModal';
import { WalletWithdrawModal } from '@/components/chat/wallet/WalletWithdrawModal';
import { WalletSendModal } from '@/components/chat/wallet/WalletSendModal';
import { WalletPinSetupCard } from '@/components/chat/wallet/WalletPinSetupCard';
import { walletResolveRecipientFromPhone } from '@/components/chat/wallet/walletHelpers';
import {
    ArrowLeft,
    ArrowDownLeft,
    ArrowUpRight,
    Settings,
    Lock,
    TrendingUp,
    Plus,
    Send,
    Banknote,
    ShoppingCart,
    DollarSign,
} from 'lucide-react';

const MALI_RATE_UZS = 4899;
const MIN_TOPUP = 10;
const MAX_TOPUP = 1_000_000;
const MIN_WITHDRAW = 10;

export default function WalletPage() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();

    const [user, setUser] = useState<any>(null);
    const [balance, setBalance] = useState({ available: 0, locked: 0, hasPin: false });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [walletConfig, setWalletConfig] = useState<{ adminCard: string | null; systemAvailableMali: number }>({ adminCard: null, systemAvailableMali: 0 });
    const [contacts, setContacts] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [timeRange, setTimeRange] = useState<'1d' | '1w' | '1m' | '1y'>('1w');

    // PIN
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');

    // Top Up
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [topUpStatus, setTopUpStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [topUpError, setTopUpError] = useState('');

    // Withdraw
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawCard, setWithdrawCard] = useState('');
    const [withdrawPin, setWithdrawPin] = useState('');
    const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [withdrawError, setWithdrawError] = useState('');

    // Send
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendRecipientId, setSendRecipientId] = useState('');
    const [sendPhone, setSendPhone] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendPin, setSendPin] = useState('');
    const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [sendError, setSendError] = useState('');

    // P2P
    const [marketTab, setMarketTab] = useState<'none' | 'buy' | 'sell'>('none');
    const [p2pAds, setP2pAds] = useState<any[]>([]);
    const [myTrades, setMyTrades] = useState<any[]>([]);

    const fetchBalance = useCallback(async () => {
        try {
            const res = await apiFetch('/api/token/balance');
            if (res.ok) {
                const d = await res.json();
                setBalance({ available: parseFloat(d.balance), locked: parseFloat(d.locked_balance), hasPin: d.hasPin });
            }
        } catch {}
    }, []);

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await apiFetch('/api/token/transactions');
            if (res.ok) setTransactions(await res.json());
        } catch {}
    }, []);

    const fetchWalletConfig = useCallback(async () => {
        try {
            const res = await apiFetch('/api/token/config');
            if (res.ok) {
                const d = await res.json();
                setWalletConfig({ adminCard: d.admin_card_number || null, systemAvailableMali: Number(d.system_available_mali || 0) });
            }
        } catch {}
    }, []);

    const fetchPendingRequests = useCallback(async () => {
        try {
            const res = await apiFetch('/api/token/topup');
            if (res.ok) {
                const d = await res.json();
                setPendingRequests(d.filter((r: any) => r.status === 'pending'));
            }
        } catch {}
    }, []);

    const fetchContacts = useCallback(async () => {
        try {
            const res = await apiFetch('/api/users/contacts');
            if (res.ok) setContacts(await res.json());
        } catch {}
    }, []);

    const fetchMyTrades = useCallback(async () => {
        try {
            const res = await apiFetch('/api/p2p/trades');
            if (res.ok) setMyTrades(await res.json());
        } catch {}
    }, []);

    useEffect(() => {
        const u = getUser();
        if (!u) { router.replace('/login'); return; }
        setUser(u);
        fetchBalance();
        fetchTransactions();
        fetchWalletConfig();
        fetchPendingRequests();
        fetchMyTrades();
    }, []);

    useEffect(() => {
        if (!socket) return;
        const refresh = () => { fetchBalance(); fetchTransactions(); };
        socket.on('balance_updated', refresh);
        socket.on('p2p_trade_updated', () => { fetchMyTrades(); fetchBalance(); });
        window.addEventListener('socket_reconnected', refresh);
        return () => {
            socket.off('balance_updated', refresh);
            socket.off('p2p_trade_updated');
            window.removeEventListener('socket_reconnected', refresh);
        };
    }, [socket]);

    const handleSetPin = async () => {
        if (newPin.length !== 4 || isNaN(Number(newPin))) { setPinError(t('pin_error_digits')); return; }
        if (newPin !== confirmPin) { setPinError(t('pin_error_match')); return; }
        try {
            const res = await apiFetch('/api/token/setup', { method: 'POST', body: JSON.stringify({ pin: newPin }) });
            if (res.ok) { showSuccess(t('success_update')); setShowPinSetup(false); fetchBalance(); }
            else setPinError(t('server_error'));
        } catch { setPinError(t('server_error')); }
    };

    const handleTopUp = async () => {
        const n = Number(topUpAmount);
        if (!n || n <= 0) { setTopUpError("Iltimos to'g'ri summa kiriting."); return; }
        if (n < MIN_TOPUP) { setTopUpError(`Minimal summa ${MIN_TOPUP} MALI.`); return; }
        if (n > MAX_TOPUP) { setTopUpError(`Maksimal summa ${MAX_TOPUP.toLocaleString()} MALI.`); return; }
        setTopUpError(''); setTopUpStatus('loading');
        try {
            const res = await apiFetch('/api/token/topup', { method: 'POST', body: JSON.stringify({ amount: n }) });
            if (res.ok) { setTopUpStatus('success'); setTopUpAmount(''); fetchPendingRequests(); setTimeout(() => { setShowTopUpModal(false); setTopUpStatus('idle'); }, 2000); }
            else { const e = await res.json(); setTopUpStatus('error'); setTopUpError(e.message || t('server_error')); }
        } catch { setTopUpStatus('error'); setTopUpError(t('server_error')); }
    };

    const handleSend = () => {
        setSendStatus('idle'); setSendError(''); setSendAmount(''); setSendPin(''); setSendRecipientId(''); setSendPhone('');
        setShowSendModal(true); fetchContacts();
    };

    const submitSend = async () => {
        let receiverId = sendRecipientId;
        if (!receiverId && sendPhone.trim()) receiverId = walletResolveRecipientFromPhone(sendPhone, contacts);
        if (!receiverId) { setSendError("Kontaktlardan tanlang yoki telefon raqamini kiriting."); return; }
        const n = Number(sendAmount);
        if (!n || n <= 0) { setSendError("To'g'ri summa kiriting."); return; }
        if (n > balance.available) { setSendError("Balans yetarli emas."); return; }
        if (!sendPin || sendPin.length !== 4) { setSendError("4 xonali PIN kiriting."); return; }
        setSendStatus('loading'); setSendError('');
        try {
            const res = await apiFetch('/api/token/transfer', { method: 'POST', body: JSON.stringify({ receiverId, amount: n, pin: sendPin }) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); setSendStatus('error'); setSendError(e.message || "Xatolik."); return; }
            setSendStatus('success'); fetchBalance(); fetchTransactions();
            setTimeout(() => { setShowSendModal(false); setSendStatus('idle'); }, 1200);
        } catch { setSendStatus('error'); setSendError("Serverga ulanib bo'lmadi."); }
    };

    const handleWithdraw = async () => {
        const n = Number(withdrawAmount);
        const card = withdrawCard.replace(/\D/g, '');
        if (!n || n <= 0) { setWithdrawError("To'g'ri summa kiriting."); return; }
        if (n < MIN_WITHDRAW) { setWithdrawError(`Minimal ${MIN_WITHDRAW} MALI.`); return; }
        if (n > balance.available) { setWithdrawError("Balans yetarli emas."); return; }
        if (card.length < 16) { setWithdrawError("Karta raqamini to'liq kiriting."); return; }
        if (!withdrawPin || withdrawPin.length !== 4) { setWithdrawError("4 xonali PIN kiriting."); return; }
        setWithdrawStatus('loading'); setWithdrawError('');
        try {
            const usersRes = await apiFetch('/api/users');
            if (!usersRes.ok) { setWithdrawStatus('error'); setWithdrawError("Admin topilmadi."); return; }
            const users = await usersRes.json();
            const admin = users.find((u: any) => u.role === 'admin');
            if (!admin?.id) { setWithdrawStatus('error'); setWithdrawError("Yechish vaqtincha mavjud emas."); return; }
            const res = await apiFetch('/api/token/transfer', { method: 'POST', body: JSON.stringify({ receiverId: admin.id, amount: n, pin: withdrawPin, note: `WITHDRAW_REQUEST:${card}` }) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); setWithdrawStatus('error'); setWithdrawError(e.message || "Xatolik."); return; }
            setWithdrawStatus('success'); setWithdrawAmount(''); setWithdrawCard(''); setWithdrawPin('');
            fetchBalance(); fetchTransactions(); fetchWalletConfig();
            setTimeout(() => { setShowWithdrawModal(false); setWithdrawStatus('idle'); }, 1600);
        } catch { setWithdrawStatus('error'); setWithdrawError("Serverga ulanib bo'lmadi."); }
    };

    const handleRecovery = async () => {
        const ok = await confirm({ title: t('recovery_title'), description: t('recovery_desc_30d'), variant: 'danger', confirmLabel: t('start') });
        if (!ok) return;
        try { await apiFetch('/api/token/recovery', { method: 'POST' }); showSuccess("Tiklash so'rovi yuborildi."); } catch { showError("Xatolik"); }
    };

    const uzsValue = balance.available * MALI_RATE_UZS;
    const activeTrades = myTrades.filter(tr => tr.status === 'pending');

    if (!user) return <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#8774e1] border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-[#0e0e0e] text-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#0e0e0e]/80 backdrop-blur-xl border-b border-white/[0.06]">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/messages')} className="p-2 -ml-2 rounded-xl hover:bg-white/[0.06] transition-colors">
                            <ArrowLeft className="h-5 w-5 text-[#aaaaaa]" />
                        </button>
                        <div className="w-8 h-8 rounded-lg bg-[#8774e1] flex items-center justify-center text-sm font-bold">E</div>
                        <span className="font-semibold text-[15px]">ExpertLine Wallet</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {!balance.hasPin && (
                            <button onClick={() => setShowPinSetup(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                                <Lock className="h-3.5 w-3.5" />
                                {t('pin_not_set')}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-24 lg:pb-6">
                {/* PIN setup */}
                {showPinSetup && (
                    <WalletPinSetupCard newPin={newPin} confirmPin={confirmPin} pinError={pinError} onNewPinChange={setNewPin} onConfirmPinChange={setConfirmPin} onSave={handleSetPin} onCancel={() => setShowPinSetup(false)} />
                )}

                {/* Top row: Value + Balance + Shortcuts */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Value today card */}
                    <div className="lg:col-span-4 bg-[#1a1a1a] rounded-2xl p-5 border border-white/[0.06] relative overflow-hidden">
                        <p className="text-[#aaaaaa] text-xs font-medium mb-1">Value today</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight">{uzsValue > 0 ? (uzsValue / 1000).toFixed(1) : '0.00'}</span>
                            <span className="text-[#aaaaaa] text-lg">K UZS</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-xs font-medium">MALI Token</span>
                        </div>
                        {/* Time range tabs */}
                        <div className="flex gap-1 mt-4">
                            {(['1d', '1w', '1m', '1y'] as const).map(r => (
                                <button key={r} onClick={() => setTimeRange(r)} className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${timeRange === r ? 'bg-[#8774e1] text-white' : 'bg-white/[0.06] text-[#aaaaaa] hover:text-white'}`}>
                                    {r}
                                </button>
                            ))}
                        </div>
                        {/* Mini chart placeholder */}
                        <div className="mt-4 h-16 flex items-end gap-[2px]">
                            {Array.from({ length: 30 }, (_, i) => {
                                const h = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
                                return <div key={i} className="flex-1 rounded-t bg-[#8774e1]/30" style={{ height: `${h}%` }} />;
                            })}
                        </div>
                    </div>

                    {/* Balance card */}
                    <div className="lg:col-span-4 bg-[#1a1a1a] rounded-2xl p-5 border border-white/[0.06] flex flex-col justify-between">
                        <div>
                            <p className="text-[#aaaaaa] text-xs font-medium uppercase tracking-wider mb-3">Available</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-bold tracking-tight">{balance.available.toLocaleString()}</span>
                                <span className="text-[#aaaaaa] text-sm font-medium">MALI</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/[0.06]">
                            <p className="text-[#aaaaaa] text-xs font-medium uppercase tracking-wider mb-1">Locked</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-white/60">{balance.locked.toLocaleString()}</span>
                                <span className="text-[#aaaaaa] text-sm">MALI</span>
                            </div>
                        </div>
                    </div>

                    {/* Shortcuts card */}
                    <div className="lg:col-span-4 bg-[#1a1a1a] rounded-2xl p-5 border border-white/[0.06]">
                        <p className="text-[#aaaaaa] text-xs font-medium uppercase tracking-wider mb-4">Shortcuts</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowTopUpModal(true)} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-emerald-500/10 border border-white/[0.06] hover:border-emerald-500/20 transition-all">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                                    <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                                </div>
                                <span className="text-sm font-medium">{t('top_up')}</span>
                            </button>
                            <button onClick={handleSend} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-blue-500/10 border border-white/[0.06] hover:border-blue-500/20 transition-all">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                    <Send className="h-4 w-4 text-blue-400" />
                                </div>
                                <span className="text-sm font-medium">{t('send_mali')}</span>
                            </button>
                            <button onClick={() => { setWithdrawError(''); setWithdrawStatus('idle'); setShowWithdrawModal(true); }} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/20 transition-all">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                                    <ArrowUpRight className="h-4 w-4 text-rose-400" />
                                </div>
                                <span className="text-sm font-medium">{t('withdraw')}</span>
                            </button>
                            <button onClick={() => setMarketTab(marketTab === 'none' ? 'buy' : 'none')} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-[#8774e1]/10 border border-white/[0.06] hover:border-[#8774e1]/20 transition-all">
                                <div className="w-9 h-9 rounded-xl bg-[#8774e1]/10 flex items-center justify-center group-hover:bg-[#8774e1]/20 transition-colors">
                                    <ShoppingCart className="h-4 w-4 text-[#8774e1]" />
                                </div>
                                <span className="text-sm font-medium">P2P</span>
                            </button>
                            <button onClick={() => setShowPinSetup(true)} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all">
                                <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <Settings className="h-4 w-4 text-[#aaaaaa]" />
                                </div>
                                <span className="text-sm font-medium">{t('settings')}</span>
                            </button>
                            <button onClick={handleRecovery} className="group flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all">
                                <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center group-hover:bg-white/10 transition-colors">
                                    <Lock className="h-4 w-4 text-[#aaaaaa]" />
                                </div>
                                <span className="text-sm font-medium">{t('forgot_pin_recovery')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pending requests */}
                {pendingRequests.length > 0 && (
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center animate-spin">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </div>
                        <div>
                            <p className="text-blue-400 font-semibold text-sm">{t('pending_requests_count').replace('{count}', String(pendingRequests.length))}</p>
                            <p className="text-blue-300/50 text-xs">{t('admin_approval_wait')}</p>
                        </div>
                    </div>
                )}

                {/* Active trades */}
                {activeTrades.length > 0 && (
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/[0.06] p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold flex items-center gap-2">
                                {t('active_trades')}
                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            </h3>
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-amber-500/20">{activeTrades.length}</span>
                        </div>
                        {activeTrades.map((trade: any) => {
                            const isSeller = trade.seller_id === (user?.id || user?.userId);
                            return (
                                <div key={trade.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.06]">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isSeller ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {isSeller ? 'S' : 'B'}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{isSeller ? trade.buyer_name : trade.seller_name}</p>
                                            <p className="text-[11px] text-[#aaaaaa]">{parseFloat(trade.amount_uzs).toLocaleString()} UZS</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold tabular-nums">{parseFloat(trade.amount_mali).toLocaleString()} <span className="text-xs text-emerald-400">MALI</span></p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Bottom: Transactions + Tokens info */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Transactions */}
                    <div className="lg:col-span-8">
                        <WalletHistoryCard transactions={transactions} />
                    </div>

                    {/* Token info */}
                    <div className="lg:col-span-4 bg-[#1a1a1a] rounded-2xl p-5 border border-white/[0.06] space-y-4">
                        <p className="text-[#aaaaaa] text-xs font-medium uppercase tracking-wider">Token Info</p>
                        <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-sm">M</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">MALI Token</p>
                                <p className="text-[11px] text-[#aaaaaa]">ExpertLine</p>
                            </div>
                            <p className="font-bold tabular-nums">{balance.available.toLocaleString()}</p>
                        </div>
                        <div className="text-xs text-[#aaaaaa] space-y-2 pt-2 border-t border-white/[0.06]">
                            <div className="flex justify-between"><span>Narxi</span><span className="text-white">{MALI_RATE_UZS.toLocaleString()} UZS</span></div>
                            <div className="flex justify-between"><span>Jami qiymati</span><span className="text-white">{uzsValue.toLocaleString()} UZS</span></div>
                            <div className="flex justify-between"><span>Muzlatilgan</span><span className="text-white">{balance.locked.toLocaleString()} MALI</span></div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modals */}
            <WalletTopUpModal open={showTopUpModal} onClose={() => setShowTopUpModal(false)} adminCard={walletConfig.adminCard} amount={topUpAmount} onAmountChange={setTopUpAmount} status={topUpStatus} error={topUpError} onSubmit={handleTopUp} />
            <WalletWithdrawModal open={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} amount={withdrawAmount} onAmountChange={setWithdrawAmount} card={withdrawCard} onCardChange={setWithdrawCard} pin={withdrawPin} onPinChange={setWithdrawPin} status={withdrawStatus} error={withdrawError} availableBalance={balance.available} minWithdraw={MIN_WITHDRAW} onSubmit={handleWithdraw} />
            <WalletSendModal open={showSendModal} onClose={() => setShowSendModal(false)} contacts={contacts} phone={sendPhone} onPhoneChange={setSendPhone} recipientId={sendRecipientId} onRecipientIdChange={setSendRecipientId} amount={sendAmount} onAmountChange={setSendAmount} pin={sendPin} onPinChange={setSendPin} status={sendStatus} error={sendError} availableBalance={balance.available} onSubmit={submitSend} />
        </div>
    );
}
