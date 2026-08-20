import React, { useState, useEffect } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { useSocket } from '@/context/SocketContext';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';
import { useLanguage } from '@/context/LanguageContext';
import { apiFetch } from '@/lib/api';
import { getUser } from '@/lib/auth-storage';
import { WalletHistoryCard } from './wallet/WalletHistoryCard';
import { WalletTopUpModal } from './wallet/WalletTopUpModal';
import { WalletWithdrawModal } from './wallet/WalletWithdrawModal';
import { WalletSendModal } from './wallet/WalletSendModal';
import { WalletPinSetupCard } from './wallet/WalletPinSetupCard';
import { walletResolveRecipientFromPhone } from './wallet/walletHelpers';

export default function WalletPanel({ onChatSelect }: { onChatSelect?: (chat: any) => void }) {
    const { t, language } = useLanguage();
    const { socket } = useSocket();
    const { showSuccess, showError } = useNotification();
    const { confirm } = useConfirm();
    const [balance, setBalance] = useState({ available: 0, locked: 0, hasPin: false });
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [showPinChange, setShowPinChange] = useState(false);
    const [oldPin, setOldPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');

    // Top Up State
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [topUpStatus, setTopUpStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [topUpError, setTopUpError] = useState('');
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawCard, setWithdrawCard] = useState('');
    const [withdrawPin, setWithdrawPin] = useState('');
    const [withdrawStatus, setWithdrawStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [withdrawError, setWithdrawError] = useState('');

    // Buy/Sell States
    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [marketTab, setMarketTab] = useState<'none' | 'buy' | 'sell' | 'my-buy' | 'my-sell'>('none');
    const [p2pAds, setP2pAds] = useState<any[]>([]);
    const [showCreateAd, setShowCreateAd] = useState(false);
    const [createAdData, setCreateAdData] = useState({ amount: '', price: '' });
    const [myTrades, setMyTrades] = useState<any[]>([]);
    const [myAds, setMyAds] = useState<any[]>([]);
    const [editingAd, setEditingAd] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [walletConfig, setWalletConfig] = useState<{ adminCard: string | null; systemAvailableMali: number }>({
        adminCard: null,
        systemAvailableMali: 0
    });
    const [contacts, setContacts] = useState<any[]>([]);
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendRecipientId, setSendRecipientId] = useState('');
    const [sendPhone, setSendPhone] = useState('');
    const [sendAmount, setSendAmount] = useState('');
    const [sendPin, setSendPin] = useState('');
    const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [sendError, setSendError] = useState('');

    const MIN_TOPUP = 10;
    const MAX_TOPUP = 1000000;
    const MIN_WITHDRAW = 10;

    // Fetch Ads
    const fetchAds = async () => {
        try {
            const typeToFetch = marketTab === 'buy' ? 'sell' : 'buy';
            const res = await apiFetch(`/api/p2p?type=${typeToFetch}`);
            if (res.ok) {
                const data = await res.json();
                setP2pAds(data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchMyAds = async () => {
        try {
            const res = await apiFetch(`/api/p2p/my-ads`);
            if (res.ok) {
                const data = await res.json();
                setMyAds(data);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (marketTab !== 'none') {
            fetchAds();
            const interval = setInterval(fetchAds, 10000);
            return () => clearInterval(interval);
        }
    }, [marketTab]);

    const handleCreateAd = async () => {
        if (!createAdData.amount || !createAdData.price) {
            showError(t('fill_required')); 
            return;
        }
        try {
            const res = await apiFetch(`/api/p2p`, { method: 'POST', body: JSON.stringify({
                    type: marketTab,
                    amount: parseFloat(createAdData.amount),
                    price: parseFloat(createAdData.price)
                })
            });

            if (res.ok) {
                showSuccess(t('p2p_ad_created'));
                setShowCreateAd(false);
                setCreateAdData({ amount: '', price: '' });
                fetchMyAds();
            } else {
                const err = await res.json();
                showError(err.message || t('server_error'));
            }
        } catch (e) { showError(t('server_error')); }
    };

    const handleUpdateAd = async () => {
        if (!editingAd) return;
        try {
            const res = await apiFetch(`/api/p2p`, { method: 'PUT', body: JSON.stringify({
                    adId: editingAd.id,
                    price: parseFloat(editingAd.price_uzs),
                    amount: parseFloat(editingAd.amount_mali),
                    min_limit: parseFloat(editingAd.min_limit_uzs),
                    max_limit: parseFloat(editingAd.max_limit_uzs)
                })
            });

            if (res.ok) {
                showSuccess(t('success_update'));
                setEditingAd(null);
                fetchMyAds();
                if (marketTab !== 'none') fetchAds();
            } else {
                const err = await res.json();
                showError(err.message || t('server_error'));
            }
        } catch (e) { showError(t('server_error')); }
    };

    const handleDeleteAd = async (adId: any) => {
        const ok = await confirm({
            title: t('delete_ad'),
            description: t('confirm_delete_history'), // placeholder
            variant: 'danger',
            confirmLabel: t('delete_chat') // placeholder
        });
        if (!ok) return;

        try {
            const res = await apiFetch(`/api/p2p/${adId}`, { method: 'DELETE' });
            if (res.ok) {
                showSuccess(t('p2p_ad_deleted'));
                fetchMyAds();
                if (marketTab !== 'none') fetchAds();
            } else {
                const err = await res.json();
                showError(err.message || t('server_error'));
            }
        } catch (e) { showError(t('server_error')); }
    };

    const fetchTransactions = async () => {
        try {
            const res = await apiFetch(`/api/token/transactions`);
            if (res.ok) {
                const data = await res.json();
                setTransactions(data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchBalance = async () => {
        // ... (existing code kept same)
        try {
            const res = await apiFetch(`/api/token/balance`);
            if (res.ok) {
                const data = await res.json();
                setBalance({
                    available: parseFloat(data.balance),
                    locked: parseFloat(data.locked_balance),
                    hasPin: data.hasPin
                });
            }
        } catch (e) {
            console.error("Failed to fetch balance", e);
        }
    };

    const fetchWalletConfig = async () => {
        try {
            const res = await apiFetch(`/api/token/config`);
            if (!res.ok) return;
            const data = await res.json();
            setWalletConfig({
                adminCard: data.admin_card_number || null,
                systemAvailableMali: Number(data.system_available_mali || 0)
            });
        } catch (e) {
            console.error('Failed to fetch wallet config', e);
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await apiFetch(`/api/token/topup`);
            if (res.ok) {
                const data = await res.json();
                setPendingRequests(data.filter((r: any) => r.status === 'pending'));
            }
        } catch (e) { console.error(e); }
    };

    const fetchMyTrades = async () => {
        try {
            const res = await apiFetch(`/api/p2p/trades`);
            if (res.ok) {
                const data = await res.json();
                setMyTrades(data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchContacts = async () => {
        try {
            const res = await apiFetch(`/api/users/contacts`);
            if (res.ok) {
                const data = await res.json();
                setContacts(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Failed to fetch contacts', e);
        }
    };

    const handleTrade = async (ad: any) => {
        const amount = prompt(`${ad.user_name} ${t('how_much_buy')}`, ad.amount_mali);
        if (!amount || isNaN(Number(amount))) return;

        try {
            const res = await apiFetch(`/api/p2p/trade`, { method: 'POST', body: JSON.stringify({ adId: ad.id, amount: parseFloat(amount) })
            });

            if (res.ok) {
                showSuccess(t('p2p_trade_started'));
                fetchBalance();
                fetchMyTrades();
            } else {
                const err = await res.json();
                showError(err.message || t('server_error'));
            }
        } catch (e) { showError(t('server_error')); }
    };

    const handleTradeChat = async (tradeId: string) => {
        try {
            const res = await apiFetch(`/api/p2p/trade-chat/${tradeId}`);
            if (res.ok) {
                const chat = await res.json();
                if (onChatSelect) onChatSelect(chat);
            } else {
                showError(t('p2p_chat_error'));
            }
        } catch (e) { console.error(e); }
    };

    const handleConfirmTrade = async (tradeId: any) => {
        const ok = await confirm({
            title: t('confirm_trade_title'),
            description: t('confirm_trade_desc_expert'),
            confirmLabel: t('accept')
        });
        if (!ok) return;

        try {
            const res = await apiFetch(`/api/p2p/trade/confirm`, { method: 'POST', body: JSON.stringify({ tradeId })
            });
            if (res.ok) {
                showSuccess(t('p2p_payment_confirmed'));
                fetchMyTrades();
                fetchBalance();
            } else {
                const err = await res.json();
                showError(err.message || "Xatolik");
            }
        } catch (e) { showError("Amal bajarilmadi"); }
    };

    const handleCancelTrade = async (tradeId: any) => {
        const ok = await confirm({
            title: t('cancel_trade_title'),
            description: t('cancel_trade_desc'),
            variant: 'danger',
            confirmLabel: t('cancel')
        });
        if (!ok) return;

        try {
            const res = await apiFetch(`/api/p2p/trade/cancel`, { method: 'POST', body: JSON.stringify({ tradeId })
            });
            if (res.ok) {
                showSuccess(t('p2p_trade_cancelled'));
                fetchMyTrades();
                fetchBalance();
            } else {
                const err = await res.json();
                showError(err.message || "Xatolik");
            }
        } catch (e) { showError("Amal bajarilmadi"); }
    };

    // Initial data fetch — runs once on mount
    useEffect(() => {
        fetchBalance();
        fetchTransactions();
        fetchPendingRequests();
        fetchMyTrades();
        fetchMyAds();
        fetchWalletConfig();
    }, []);

    // Socket listeners — mounted once per socket instance (no marketTab dependency)
    useEffect(() => {
        if (!socket) return;

        const handleBalanceUpdated = () => {
            fetchBalance();
            fetchTransactions();
        };
        const handleP2pAdsUpdated = () => {
            fetchAds();
            fetchMyAds();
        };
        const handleP2pTradeInitiated = () => {
            fetchMyTrades();
        };
        const handleP2pTradeUpdated = () => {
            fetchMyTrades();
            fetchBalance();
        };

        socket.on('balance_updated', handleBalanceUpdated);
        socket.on('p2p_ads_updated', handleP2pAdsUpdated);
        socket.on('p2p_trade_initiated', handleP2pTradeInitiated);
        socket.on('p2p_trade_updated', handleP2pTradeUpdated);
        
        const handleReconnect = () => {
            fetchBalance();
            fetchTransactions();
        };
        window.addEventListener('socket_reconnected', handleReconnect);

        return () => {
            socket.off('balance_updated', handleBalanceUpdated);
            socket.off('p2p_ads_updated', handleP2pAdsUpdated);
            socket.off('p2p_trade_initiated', handleP2pTradeInitiated);
            socket.off('p2p_trade_updated', handleP2pTradeUpdated);
            window.removeEventListener('socket_reconnected', handleReconnect);
        };
    }, [socket]);

    const handleSetPin = async () => {
        if (newPin.length !== 4 || isNaN(Number(newPin))) { setPinError(t('pin_error_digits')); return; }
        if (newPin !== confirmPin) { setPinError(t('pin_error_match')); return; }
        try {
            const res = await apiFetch(`/api/token/setup`, { method: 'POST', body: JSON.stringify({ pin: newPin })
            });
            if (res.ok) {
                showSuccess(t('success_update'));
                setShowPinSetup(false);
                setNewPin('');
                setConfirmPin('');
                setPinError('');
                fetchBalance();
            } else { setPinError(t('server_error')); }
        } catch (e) { setPinError(t('server_error')); }
    };

    const handleChangePin = async () => {
        if (oldPin.length !== 4) { setPinError(t('pin_error_digits')); return; }
        if (newPin.length !== 4 || isNaN(Number(newPin))) { setPinError(t('pin_error_digits')); return; }
        if (newPin !== confirmPin) { setPinError(t('pin_error_match')); return; }
        try {
            const res = await apiFetch(`/api/token/change-pin`, {
                method: 'POST',
                body: JSON.stringify({ oldPin, newPin }),
            });
            if (res.ok) {
                showSuccess(t('success_update'));
                setShowPinChange(false);
                setOldPin('');
                setNewPin('');
                setConfirmPin('');
                setPinError('');
            } else {
                const err = await res.json().catch(() => ({}));
                setPinError(err.message || t('server_error'));
            }
        } catch (e) { setPinError(t('server_error')); }
    };

    const handleRecovery = async () => {
        const ok = await confirm({
            title: t('recovery_title'),
            description: t('recovery_desc_30d'),
            variant: 'danger',
            confirmLabel: t('start')
        });
        if (!ok) return;

        try {
            await apiFetch(`/api/token/recovery`, { method: 'POST' });
            showSuccess("Tiklash so'rovi yuborildi.");
        } catch (e) { showError("Xatolik"); }
    };

    const transformTopUp = async () => {
        const numericAmount = Number(topUpAmount);
        if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
            setTopUpError("Iltimos to'g'ri summa kiriting.");
            return;
        }
        if (numericAmount < MIN_TOPUP) {
            setTopUpError(`Minimal summa ${MIN_TOPUP} MALI.`);
            return;
        }
        if (numericAmount > MAX_TOPUP) {
            setTopUpError(`Maksimal summa ${MAX_TOPUP.toLocaleString()} MALI.`);
            return;
        }
        setTopUpError('');
        setTopUpStatus('loading');
        try {
            const res = await apiFetch(`/api/token/topup`, { method: 'POST', body: JSON.stringify({ amount: parseFloat(topUpAmount) })
            });

            if (res.ok) {
                setTopUpStatus('success');
                setTopUpAmount('');
                setTopUpError('');
                fetchPendingRequests();
                setTimeout(() => {
                    setShowTopUpModal(false);
                    setTopUpStatus('idle');
                }, 2000);
            } else {
                setTopUpStatus('error');
                const err = await res.json();
                setTopUpError(err.message || t('server_error'));
            }
        } catch (e) {
            setTopUpStatus('error');
            setTopUpError(t('server_error'));
        }
    };

    const handleSend = () => {
        setSendStatus('idle');
        setSendError('');
        setSendAmount('');
        setSendPin('');
        setSendRecipientId('');
        setSendPhone('');
        setShowSendModal(true);
        fetchContacts();
    };

    const submitSend = async () => {
        const numericAmount = Number(sendAmount);
        let receiverId = sendRecipientId;
        if (!receiverId && sendPhone.trim()) {
            receiverId = walletResolveRecipientFromPhone(sendPhone, contacts);
        }
        if (!receiverId) {
            const msg =
                language === 'uz'
                    ? "Kontaktlardan tanlang yoki telefon raqamini kiriting (faqat sizdagi kontaktlar bo‘yicha)."
                    : language === 'ru'
                      ? "Выберите контакт или введите телефон (только из ваших контактов)."
                      : "Pick a contact or enter a phone number (must match your contacts).";
            setSendError(msg);
            return;
        }
        if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
            setSendError("To'g'ri summa kiriting.");
            return;
        }
        if (numericAmount > balance.available) {
            setSendError("Balans yetarli emas.");
            return;
        }
        if (!sendPin || sendPin.length !== 4 || Number.isNaN(Number(sendPin))) {
            setSendError("4 xonali PIN kiriting.");
            return;
        }

        setSendStatus('loading');
        setSendError('');
        try {
            const res = await apiFetch(`/api/token/transfer`, { method: 'POST', body: JSON.stringify({
                    receiverId,
                    amount: numericAmount,
                    pin: sendPin,
                })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setSendStatus('error');
                setSendError(err.message || "Yuborishda xatolik yuz berdi.");
                return;
            }
            setSendStatus('success');
            fetchBalance();
            fetchTransactions();
            setTimeout(() => {
                setShowSendModal(false);
                setSendStatus('idle');
            }, 1200);
        } catch {
            setSendStatus('error');
            setSendError("Serverga ulanib bo'lmadi. Qayta urinib ko'ring.");
        }
    };

    const handleWithdraw = async () => {
        const numericAmount = Number(withdrawAmount);
        const cleanCard = withdrawCard.replace(/\D/g, '');
        if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
            setWithdrawError("Iltimos to'g'ri summa kiriting.");
            return;
        }
        if (numericAmount < MIN_WITHDRAW) {
            setWithdrawError(`Minimal yechish summasi ${MIN_WITHDRAW} MALI.`);
            return;
        }
        if (numericAmount > balance.available) {
            setWithdrawError("Balans yetarli emas.");
            return;
        }
        if (numericAmount > walletConfig.systemAvailableMali) {
            setWithdrawError("Tizim rezervida yetarli MALI yo'q. Kichikroq summa kiriting.");
            return;
        }
        if (cleanCard.length < 16) {
            setWithdrawError("Karta raqamini to'liq kiriting.");
            return;
        }
        if (!withdrawPin || withdrawPin.length !== 4 || Number.isNaN(Number(withdrawPin))) {
            setWithdrawError("4 xonali PIN kiriting.");
            return;
        }

        setWithdrawStatus('loading');
        setWithdrawError('');
        try {
            const usersRes = await apiFetch(`/api/users`);
            if (!usersRes.ok) {
                setWithdrawStatus('error');
                setWithdrawError("Admin foydalanuvchisi topilmadi. Keyinroq urinib ko'ring.");
                return;
            }
            const users = await usersRes.json();
            const admin = users.find((u: any) => u.role === 'admin');
            if (!admin?.id) {
                setWithdrawStatus('error');
                setWithdrawError("Yechish vaqtincha mavjud emas. Support bilan bog'laning.");
                return;
            }

            const transferRes = await apiFetch(`/api/token/transfer`, { method: 'POST', body: JSON.stringify({
                    receiverId: admin.id,
                    amount: numericAmount,
                    pin: withdrawPin,
                    note: `WITHDRAW_REQUEST:${cleanCard}`
                })
            });
            if (!transferRes.ok) {
                const err = await transferRes.json().catch(() => ({}));
                setWithdrawStatus('error');
                setWithdrawError(err.message || "Yechish so'rovini yuborib bo'lmadi.");
                return;
            }

            setWithdrawStatus('success');
            setWithdrawAmount('');
            setWithdrawCard('');
            setWithdrawPin('');
            fetchBalance();
            fetchTransactions();
            fetchWalletConfig();
            setTimeout(() => {
                setShowWithdrawModal(false);
                setWithdrawStatus('idle');
            }, 1600);
        } catch {
            setWithdrawStatus('error');
            setWithdrawError("Serverga ulanib bo'lmadi. Qayta urinib ko'ring.");
        }
    };

    return (
        <div className="flex-1 min-h-0 h-auto w-full flex flex-col gap-3 lg:gap-6 px-1 py-1 lg:p-6 lg:pt-12 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-6 lg:h-full overflow-visible lg:overflow-y-auto lg:overscroll-y-contain lg:custom-scrollbar relative">
            <div className="hidden lg:block absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 space-y-3 lg:space-y-6 lg:max-w-2xl lg:mx-auto w-full">
                <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                    <div className="hidden lg:block">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">{t('my_wallet')}</h2>
                        <p className="text-white/50 text-sm sm:text-base">{t('manage_assets')}</p>
                    </div>
                </div>

                <div className="space-y-3 lg:space-y-6 animate-fade-in">
                        {!balance.hasPin && !showPinSetup && (
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-center justify-between animate-pulse-slow">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <div>
                                        <p className="text-amber-400 font-bold">{t('pin_not_set')}</p>
                                        <p className="text-amber-200/70 text-xs">{t('pin_required_desc')}</p>
                                    </div>
                                </div>
                                <GlassButton onClick={() => { setShowPinSetup(true); setPinError(''); }} variant="premium" className="!py-2 !px-4 !rounded-lg !text-xs shadow-none">{t('add')}</GlassButton>
                            </div>
                        )}

                        {balance.hasPin && !showPinChange && !showPinSetup && (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => { setShowPinChange(true); setPinError(''); setOldPin(''); setNewPin(''); setConfirmPin(''); }}
                                    className="text-xs text-white/45 hover:text-white/80 transition-colors"
                                >
                                    {t('change_pin')}
                                </button>
                            </div>
                        )}

                        {showPinSetup && (
                            <WalletPinSetupCard
                                newPin={newPin}
                                confirmPin={confirmPin}
                                pinError={pinError}
                                onNewPinChange={setNewPin}
                                onConfirmPinChange={setConfirmPin}
                                onSave={handleSetPin}
                                onCancel={() => { setShowPinSetup(false); setPinError(''); setNewPin(''); setConfirmPin(''); }}
                            />
                        )}

                        {showPinChange && (
                            <WalletPinSetupCard
                                mode="change"
                                oldPin={oldPin}
                                onOldPinChange={setOldPin}
                                newPin={newPin}
                                confirmPin={confirmPin}
                                pinError={pinError}
                                onNewPinChange={setNewPin}
                                onConfirmPinChange={setConfirmPin}
                                onSave={handleChangePin}
                                onCancel={() => { setShowPinChange(false); setPinError(''); setOldPin(''); setNewPin(''); setConfirmPin(''); }}
                            />
                        )}

                        <GlassCard className="p-4 lg:p-8 relative overflow-hidden border-white/10 bg-gradient-to-br from-[rgba(var(--glass-rgb),0.8)] to-[rgba(var(--glass-rgb),0.6)] backdrop-blur-xl !rounded-[1.25rem] lg:!rounded-[25px]">
                            <div className="absolute top-0 right-0 p-2 lg:p-4 opacity-10 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 lg:h-48 lg:w-48 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>

                            <div className="relative z-10">
                                <p className="text-emerald-400 font-medium tracking-wider text-[10px] lg:text-sm uppercase mb-1 lg:mb-2">{t('total_balance')}</p>
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <span className="text-2xl sm:text-3xl lg:text-5xl font-bold text-white tracking-tight">{balance.available.toLocaleString()}</span>
                                    <span className="text-sm lg:text-xl font-medium text-white/60">MALI</span>
                                </div>
                                <p className="text-white/40 text-xs lg:text-sm mt-1 lg:mt-2">≈ {(balance.available * 4899).toLocaleString()} UZS</p>
                            </div>
                        </GlassCard>

                        {pendingRequests.length > 0 && (
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center animate-spin">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-blue-400 font-bold">{t('pending_requests_count').replace('{count}', String(pendingRequests.length))}</p>
                                        <p className="text-blue-200/70 text-xs">{t('admin_approval_wait')}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Desktop: eski layout */}
                        <div className="hidden lg:block">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-2">
                                <button
                                    onClick={() => setShowTopUpModal(true)}
                                    className="group flex flex-col items-center gap-2 transition-all active:scale-90"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-xl group-hover:bg-emerald-500 transition-all duration-500">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 group-hover:bg-white flex items-center justify-center shadow-lg transition-all duration-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                        </div>
                                    </div>
                                    <span className="text-white/70 font-bold text-[9px] uppercase tracking-wider group-hover:text-white transition-colors">{t('top_up')}</span>
                                </button>

                                <button
                                    onClick={handleSend}
                                    className="group flex flex-col items-center gap-2 transition-all active:scale-90"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-xl group-hover:bg-blue-500 transition-all duration-500">
                                        <div className="w-8 h-8 rounded-full bg-blue-500 group-hover:bg-white flex items-center justify-center shadow-lg transition-all duration-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                        </div>
                                    </div>
                                    <span className="text-white/70 font-bold text-[9px] uppercase tracking-wider group-hover:text-white transition-colors">{t('send_mali')}</span>
                                </button>

                                <button
                                    onClick={() => { setMarketTab(marketTab === 'buy' ? 'none' : 'buy'); fetchAds(); }}
                                    className="group flex flex-col items-center gap-2 transition-all active:scale-90"
                                >
                                    <div className={`w-14 h-14 rounded-2xl backdrop-blur-2xl border flex items-center justify-center shadow-xl transition-all duration-500 ${marketTab === 'buy' ? 'bg-indigo-500 border-indigo-400' : 'bg-white/10 border-white/20 group-hover:bg-indigo-500'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${marketTab === 'buy' ? 'bg-white text-indigo-500' : 'bg-indigo-500 text-white group-hover:bg-white group-hover:text-indigo-500'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                        </div>
                                    </div>
                                    <span className="text-white/70 font-bold text-[9px] uppercase tracking-wider group-hover:text-white transition-colors">{t('buy')}</span>
                                </button>

                                <button
                                    onClick={() => { setMarketTab(marketTab === 'sell' ? 'none' : 'sell'); fetchAds(); }}
                                    className="group flex flex-col items-center gap-2 transition-all active:scale-90"
                                >
                                    <div className={`w-14 h-14 rounded-2xl backdrop-blur-2xl border flex items-center justify-center shadow-xl transition-all duration-500 ${marketTab === 'sell' ? 'bg-amber-500 border-amber-400' : 'bg-white/10 border-white/20 group-hover:bg-amber-500'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-all duration-500 ${marketTab === 'sell' ? 'bg-white text-amber-500' : 'bg-amber-500 text-white group-hover:bg-white group-hover:text-amber-500'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                    </div>
                                    <span className="text-white/70 font-bold text-[9px] uppercase tracking-wider group-hover:text-white transition-colors">{t('sell')}</span>
                                </button>
                            </div>
                            <button
                                onClick={() => {
                                    setWithdrawError('');
                                    setWithdrawStatus('idle');
                                    setShowWithdrawModal(true);
                                }}
                                className="w-full mt-1 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-sm transition-all"
                            >
                                {t('withdraw')}
                            </button>
                        </div>

                        {/* Mobile: 1 ta card (To'ldirish + Yuborish) va Naqdga yechish ham shu cardda */}
                        <div className="lg:hidden">
                            <GlassCard className="!p-3 !rounded-[1.25rem] bg-white/10 border-white/20 shadow-xl">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setShowTopUpModal(true)}
                                        className="group flex flex-col items-center gap-1.5 transition-all active:scale-95"
                                    >
                                        <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-emerald-500 transition-all duration-500">
                                            <div className="w-7 h-7 rounded-full bg-emerald-500 group-hover:bg-white flex items-center justify-center shadow-md transition-all duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                            </div>
                                        </div>
                                        <span className="text-white/70 font-bold text-[8px] uppercase tracking-wider group-hover:text-white transition-colors">{t('top_up')}</span>
                                    </button>

                                    <button
                                        onClick={handleSend}
                                        className="group flex flex-col items-center gap-1.5 transition-all active:scale-95"
                                    >
                                        <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-lg group-hover:bg-blue-500 transition-all duration-500">
                                            <div className="w-7 h-7 rounded-full bg-blue-500 group-hover:bg-white flex items-center justify-center shadow-md transition-all duration-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            </div>
                                        </div>
                                        <span className="text-white/70 font-bold text-[8px] uppercase tracking-wider group-hover:text-white transition-colors">{t('send_mali')}</span>
                                    </button>
                                </div>

                                <button
                                    onClick={() => {
                                        setWithdrawError('');
                                        setWithdrawStatus('idle');
                                        setShowWithdrawModal(true);
                                    }}
                                    className="w-full mt-3 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-all"
                                >
                                    {t('withdraw')}
                                </button>
                            </GlassCard>
                        </div>

                        {/* Mobile: 1 ta card (Sotib olish + Sotish) */}
                        <div className="lg:hidden">
                            <GlassCard className="!p-3 !rounded-[1.25rem] bg-white/10 border-white/20 shadow-xl">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => { setMarketTab(marketTab === 'buy' ? 'none' : 'buy'); fetchAds(); }}
                                        className="group flex flex-col items-center gap-1.5 transition-all active:scale-95"
                                    >
                                        <div className={`w-11 h-11 rounded-xl backdrop-blur-2xl border flex items-center justify-center shadow-lg transition-all duration-500 ${marketTab === 'buy' ? 'bg-indigo-500 border-indigo-400' : 'bg-white/10 border-white/20 group-hover:bg-indigo-500'}`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-500 ${marketTab === 'buy' ? 'bg-white text-indigo-500' : 'bg-indigo-500 text-white group-hover:bg-white group-hover:text-indigo-500'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                            </div>
                                        </div>
                                        <span className="text-white/70 font-bold text-[8px] uppercase tracking-wider group-hover:text-white transition-colors">{t('buy')}</span>
                                    </button>

                                    <button
                                        onClick={() => { setMarketTab(marketTab === 'sell' ? 'none' : 'sell'); fetchAds(); }}
                                        className="group flex flex-col items-center gap-1.5 transition-all active:scale-95"
                                    >
                                        <div className={`w-11 h-11 rounded-xl backdrop-blur-2xl border flex items-center justify-center shadow-lg transition-all duration-500 ${marketTab === 'sell' ? 'bg-amber-500 border-amber-400' : 'bg-white/10 border-white/20 group-hover:bg-amber-500'}`}>
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all duration-500 ${marketTab === 'sell' ? 'bg-white text-amber-500' : 'bg-amber-500 text-white group-hover:bg-white group-hover:text-amber-500'}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                        </div>
                                        <span className="text-white/70 font-bold text-[8px] uppercase tracking-wider group-hover:text-white transition-colors">{t('sell')}</span>
                                    </button>
                                </div>
                            </GlassCard>
                        </div>

                        <WalletHistoryCard transactions={transactions} />


                        {/* TRADE MONITORING & HISTORY */}
                        {myTrades.length > 0 && (
                            <div className="animate-fade-in space-y-3 lg:space-y-6 rounded-[1.25rem] lg:rounded-[24px] bg-white/5 border border-white/10 p-3 lg:p-0 lg:bg-transparent lg:border-0">
                                {/* Active Trades */}
                                {myTrades.some(t => t.status === 'pending') && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                                {t('active_trades')}
                                                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                                            </h3>
                                            <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-amber-500/20">
                                                {t('pending_requests_count').replace('{count}', String(myTrades.filter(t_item => t_item.status === 'pending').length))}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {myTrades.filter(t => t.status === 'pending').map((trade: any) => {
                                                const currentUser = getUser() || {};
                                                const isSeller = trade.seller_id === (currentUser.id || currentUser.userId);
                                                return (
                                                    <GlassCard key={trade.id} className="p-5 border-amber-500/10 bg-gradient-to-br from-amber-500/5 to-transparent hover:border-amber-500/30 transition-all duration-300">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-inner ${isSeller ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                                                                    {isSeller ? 'S' : 'B'}
                                                                </div>
                                                                <div>
                                                                    <p className="text-white font-bold text-sm leading-tight">
                                                                        {isSeller ? `${t('buyer')}: ${trade.buyer_name}` : `${t('seller')}: ${trade.seller_name}`}
                                                                    </p>
                                                                    <p className="text-white/30 text-[10px] mt-0.5">{new Date(trade.created_at).toLocaleString(language === 'uz' ? 'uz-UZ' : (language === 'ru' ? 'ru-RU' : 'en-US'))}</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-white/40 text-[10px] uppercase font-bold tracking-tighter mb-1">{t('amount_mali_label')}</p>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-xl font-bold text-white tabular-nums">{parseFloat(trade.amount_mali).toLocaleString()}</span>
                                                                    <span className="text-[10px] text-emerald-400 font-black">MALI</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-between items-center bg-white/10 rounded-2xl p-3 border border-white/5">
                                                            <div className="flex gap-2 items-center">
                                                                <button
                                                                    onClick={() => handleTradeChat(trade.id)}
                                                                    className="p-2.5 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl transition-all border border-blue-500/20 active:scale-95"
                                                                    title="Chatga o'tish"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                                </button>
                                                                <div className="text-[10px] text-white/50">
                                                                    {t('amount_uzs')}: <span className="text-white font-bold">{parseFloat(trade.amount_uzs).toLocaleString()} UZS</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {isSeller ? (
                                                                    <button
                                                                        onClick={() => handleConfirmTrade(trade.id)}
                                                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                                                                    >
                                                                        {t('p2p_payment_confirmed')}
                                                                    </button>
                                                                ) : (
                                                                    <div className="text-[10px] text-amber-400 bg-amber-400/10 px-3 py-2 rounded-xl border border-amber-400/20 font-medium">
                                                                        {t('waiting')}
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={() => handleCancelTrade(trade.id)}
                                                                    className="p-2 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-xl transition-all border border-white/5"
                                                                    title="Bekor qilish"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </GlassCard>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Trade History */}
                                <div className="space-y-3">
                                    <h3 className="text-white/70 font-bold text-sm px-1">{t('trade_history')}</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {myTrades.filter(t => t.status !== 'pending').slice(0, 5).map((trade: any) => {
                                            const currentUser = getUser() || {};
                                            const isSeller = trade.seller_id === (currentUser.id || currentUser.userId);
                                            const isCompleted = trade.status === 'completed';

                                            return (
                                                <div key={trade.id} className="group flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                            {isCompleted ? (isSeller ? '↑' : '↓') : '✕'}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-sm">
                                                                {isSeller ? `${t('sold_to')}: ${trade.buyer_name}` : `${t('bought_from')}: ${trade.seller_name}`}
                                                            </p>
                                                            <p className="text-[10px] text-white/20 uppercase tracking-widest">{new Date(trade.created_at).toLocaleDateString(language === 'uz' ? 'uz-UZ' : (language === 'ru' ? 'ru-RU' : 'en-US'))}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold tabular-nums ${isCompleted ? (isSeller ? 'text-white' : 'text-emerald-400') : 'text-white/20 line-through'}`}>
                                                            {isSeller ? '-' : '+'}{parseFloat(trade.amount_mali).toLocaleString()} MALI
                                                        </p>
                                                        <p className="text-[10px] text-white/30">{parseFloat(trade.amount_uzs).toLocaleString()} UZS</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {marketTab !== 'none' && (
                            <div className="animate-fade-in mt-4 border-t border-white/10 pt-6 space-y-6">
                                <div className="flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 w-fit mx-auto">
                                    <button
                                        onClick={() => setMarketTab((marketTab.startsWith('my-') ? marketTab.replace('my-', '') : marketTab) as 'none' | 'buy' | 'sell' | 'my-buy' | 'my-sell')}
                                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${!marketTab.startsWith('my-') ? 'bg-blue-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        {t('market')}
                                    </button>
                                    <button
                                        onClick={() => setMarketTab(`my-${marketTab.replace('my-', '')}` as 'my-buy' | 'my-sell')}
                                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${marketTab.startsWith('my-') ? 'bg-amber-600 text-white shadow-lg' : 'text-white/40 hover:text-white/60'}`}
                                    >
                                        {t('my_ads')}
                                    </button>
                                </div>

                                <div className="flex justify-between items-center px-1">
                                    <div>
                                        <h3 className="text-white font-bold text-lg">
                                            {marketTab.startsWith('my-') ? t('my_ads') : (marketTab === 'buy' ? t('how_much_buy').replace('?', '').trim() : t('how_much_sell').replace('?', '').trim())}
                                        </h3>
                                        <p className="text-white/40 text-xs">
                                            {marketTab.startsWith('my-') ? t('p2p_desc') : (marketTab === 'buy' ? t('seller') : t('buyer'))}
                                        </p>
                                    </div>
                                    {!marketTab.startsWith('my-') && (
                                        <GlassButton
                                            onClick={() => setShowCreateAd(!showCreateAd)}
                                            variant="premium"
                                            className="!py-2 !px-4 !rounded-lg !text-xs flex items-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            {marketTab === 'buy' ? t('create_ad') : t('create_ad')}
                                        </GlassButton>
                                    )}
                                </div>

                                {showCreateAd && !marketTab.startsWith('my-') && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 animate-scale-in">
                                        <h4 className="text-white font-bold text-sm mb-3">{t('create_ad')}</h4>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="text-white/40 text-xs block mb-1">{t('amount_mali_label')}</label>
                                                <input type="number" placeholder="0.00" value={createAdData.amount} onChange={e => setCreateAdData({ ...createAdData, amount: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-xs block mb-1">{t('price_per_mali')}</label>
                                                <input type="number" placeholder="4899" value={createAdData.price} onChange={e => setCreateAdData({ ...createAdData, price: e.target.value })} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white text-sm" />
                                            </div>
                                        </div>
                                        <button onClick={handleCreateAd} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs">{t('create_chat')}</button>
                                    </div>
                                )}

                                {editingAd && (
                                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4 animate-scale-in">
                                        <h4 className="text-amber-400 font-bold text-sm mb-3">{t('edit_ad')}</h4>
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div>
                                                <label className="text-white/40 text-[10px] block mb-1">{t('amount_mali_label')}</label>
                                                <input type="number" value={editingAd.amount_mali} onChange={e => setEditingAd({ ...editingAd, amount_mali: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-[10px] block mb-1">{t('price_per_mali')}</label>
                                                <input type="number" value={editingAd.price_uzs} onChange={e => setEditingAd({ ...editingAd, price_uzs: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-[10px] block mb-1">{t('min_limit')}</label>
                                                <input type="number" value={editingAd.min_limit_uzs} onChange={e => setEditingAd({ ...editingAd, min_limit_uzs: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" />
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-[10px] block mb-1">{t('max_limit')}</label>
                                                <input type="number" value={editingAd.max_limit_uzs} onChange={e => setEditingAd({ ...editingAd, max_limit_uzs: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm" />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleUpdateAd} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg">{t('save')}</button>
                                            <button onClick={() => setEditingAd(null)} className="px-4 py-2 bg-white/10 text-white rounded-lg text-xs">{t('cancel')}</button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar px-1">
                                    {marketTab.startsWith('my-') ? (
                                        myAds.length === 0 ? (
                                            <div className="text-center py-12 text-white/20 text-sm border-2 border-dashed border-white/5 rounded-2xl">
                                                {t('no_messages')}
                                            </div>
                                        ) : (
                                            myAds.map((ad) => (
                                                <div key={ad.id} className="group bg-[rgba(var(--glass-rgb),0.3)] border border-white/10 rounded-2xl p-4 flex flex-col gap-3 hover:bg-[rgba(var(--glass-rgb),0.4)] transition-all">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${ad.type === 'buy' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                                                {ad.type === 'buy' ? 'B' : 'S'}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold text-sm capitalize">{ad.type === 'buy' ? 'Sotib olish' : 'Sotish'}</p>
                                                                <p className="text-[10px] text-white/30 uppercase tracking-widest">{new Date(ad.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-white font-black tabular-nums">{parseFloat(ad.amount_mali).toLocaleString()} MALI</p>
                                                            <p className="text-[10px] text-emerald-400 font-bold">@ {parseFloat(ad.price_uzs).toLocaleString()} UZS</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center bg-black/20 rounded-xl p-2 px-3 border border-white/5">
                                                        <div className="flex gap-2">
                                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${ad.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                                {ad.status.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {ad.status === 'active' && (
                                                                <button
                                                                    onClick={() => setEditingAd(ad)}
                                                                    className="p-2 bg-white/5 hover:bg-blue-500/20 text-white/30 hover:text-blue-400 rounded-lg transition-all border border-white/5"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteAd(ad.id)}
                                                                className="p-2 bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded-lg transition-all border border-white/5"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    ) : (
                                        p2pAds.length === 0 ? (
                                            <div className="text-center py-12 text-white/20 text-sm border-2 border-dashed border-white/5 rounded-2xl">
                                                {t('no_messages')}
                                            </div>
                                        ) : (
                                            p2pAds.map((ad) => (
                                                <div key={ad.id} className="group bg-[rgba(var(--glass-rgb),0.3)] border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-[rgba(var(--glass-rgb),0.4)] transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white/5">
                                                            {ad.user_name?.[0] || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold text-sm">{ad.user_name || 'User'}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-white/40 text-[10px]">{new Date(ad.created_at).toLocaleTimeString(language === 'uz' ? 'uz-UZ' : (language === 'ru' ? 'ru-RU' : 'en-US'))}</p>
                                                                <span className="w-1 h-1 bg-white/10 rounded-full"></span>
                                                                <p className="text-[10px] text-emerald-400/60 font-medium">98% {t('success_rate')}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className={`font-black tabular-nums text-lg ${marketTab === 'buy' ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                                {parseFloat(ad.amount_mali).toLocaleString()} <span className="text-[10px] opacity-60">MALI</span>
                                                            </p>
                                                            <p className="text-white/30 text-[10px] font-bold">{t('price_per_mali')}: {parseFloat(ad.price_uzs).toLocaleString()} UZS</p>
                                                        </div>
                                                        <GlassButton
                                                            onClick={() => handleTrade(ad)}
                                                            variant="premium"
                                                            className="!py-2.5 !px-6 !rounded-xl !text-xs flex items-center justify-center"
                                                        >
                                                            {marketTab === 'buy' ? t('buy') : t('sell')}
                                                        </GlassButton>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}
                                </div>
                            </div>
                        )}

        
                        <div className="text-center pt-4">
                            <button onClick={handleRecovery} className="text-white/30 text-xs hover:text-white hover:underline transition-colors">
                                {t('forgot_pin_recovery')}
                            </button>
                        </div>
                    </div>
            </div>

            <WalletTopUpModal
                open={showTopUpModal}
                onClose={() => setShowTopUpModal(false)}
                adminCard={walletConfig.adminCard}
                amount={topUpAmount}
                onAmountChange={setTopUpAmount}
                status={topUpStatus}
                error={topUpError}
                onSubmit={transformTopUp}
            />
            <WalletWithdrawModal
                open={showWithdrawModal}
                onClose={() => setShowWithdrawModal(false)}
                amount={withdrawAmount}
                onAmountChange={setWithdrawAmount}
                card={withdrawCard}
                onCardChange={setWithdrawCard}
                pin={withdrawPin}
                onPinChange={setWithdrawPin}
                status={withdrawStatus}
                error={withdrawError}
                availableBalance={balance.available}
                minWithdraw={MIN_WITHDRAW}
                onSubmit={handleWithdraw}
            />
            <WalletSendModal
                open={showSendModal}
                onClose={() => setShowSendModal(false)}
                contacts={contacts}
                phone={sendPhone}
                onPhoneChange={setSendPhone}
                recipientId={sendRecipientId}
                onRecipientIdChange={setSendRecipientId}
                amount={sendAmount}
                onAmountChange={setSendAmount}
                pin={sendPin}
                onPinChange={setSendPin}
                status={sendStatus}
                error={sendError}
                availableBalance={balance.available}
                onSubmit={submitSend}
            />
        </div>
    );
}



