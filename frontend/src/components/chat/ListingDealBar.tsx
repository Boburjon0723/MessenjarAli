import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { TranslationKeys } from '@/lib/translations';
import { useSocket } from '@/context/SocketContext';
import { isExpertListingChat } from '@/lib/listing-chat';
import { useNotification } from '@/context/NotificationContext';
import { useConfirm } from '@/context/ConfirmContext';

type Deal = {
  id: string;
  chat_id: string;
  expert_id: string;
  client_id: string;
  amount: string | number;
  status: string;
  transaction_id?: string | null;
};

export default function ListingDealBar({
  chat,
  currentUserId,
}: {
  chat: any;
  currentUserId?: string | null;
}) {
  const { t } = useLanguage();
  const { socket } = useSocket();
  const { showSuccess, showError } = useNotification();
  const { confirm } = useConfirm();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [role, setRole] = useState<'expert' | 'client' | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string>('');

  const meta = (() => {
    const raw = chat?.metadata;
    if (!raw) return {};
    if (typeof raw === 'object') return raw as Record<string, any>;
    try {
      return JSON.parse(String(raw)) as Record<string, any>;
    } catch {
      return {};
    }
  })();

  const load = useCallback(async () => {
    if (!chat?.id || !currentUserId || !isExpertListingChat(chat)) return;
    try {
      const res = await apiFetch(`/api/listing-deals/chat/${encodeURIComponent(String(chat.id))}`);
      if (!res.ok) return;
      const d = await res.json();
      setDeal(d.deal || null);
      setRole(d.role || null);
    } catch {
      /* ignore */
    }
  }, [chat?.id, currentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    // Yangi deal ochilganda yoki chat almashganda tavsiya summa.
    if (deal) return;
    const suggested =
      Number(meta?.snapshot?.hourly_rate ?? meta?.snapshot?.service_price ?? 0) || 100;
    setAmountInput(String(suggested));
  }, [chat?.id, deal, meta?.snapshot?.hourly_rate, meta?.snapshot?.service_price]);

  useEffect(() => {
    if (!socket || !chat?.id) return;
    const onUpd = (p: any) => {
      if (String(p?.chatId) === String(chat.id)) load();
    };
    socket.on('listing_deal_updated', onUpd);
    return () => {
      socket.off('listing_deal_updated', onUpd);
    };
  }, [socket, chat?.id, load]);

  if (!chat?.id || !currentUserId || !isExpertListingChat(chat)) return null;
  if (!deal && !role) return null;

  const requestPay = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const parsed = Number(String(amountInput).replace(',', '.'));
      if (!parsed || Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(t('fill_required'));
      }
      const res = await apiFetch('/api/listing-deals/request', {
        method: 'POST',
        body: JSON.stringify({ chatId: chat.id, amount: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('server_error'));
      setDeal(data.deal);
      setMsg(`${t('waiting_client_payment').replace('{amount}', String(parsed))}`);
    } catch (e: any) {
      setMsg(e?.message || t('server_error'));
    } finally {
      setLoading(false);
    }
  };

  const pay = async () => {
    if (!deal?.id) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/listing-deals/pay', {
        method: 'POST',
        body: JSON.stringify({ dealId: deal.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('server_error'));
      await load();
      setMsg(t('deal_completed_client_msg').replace('{amount}', String(deal.amount)));
    } catch (e: any) {
      setMsg(e?.message || t('server_error'));
    } finally {
      setLoading(false);
    }
  };


  const markDone = async () => {
    if (!deal?.id) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/listing-deals/mark-done', {
        method: 'POST',
        body: JSON.stringify({ dealId: deal.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('server_error'));
      await load();
      setMsg(t('waiting_client_confirm'));
    } catch (e: any) {
      setMsg(e?.message || t('server_error'));
    } finally {
      setLoading(false);
    }
  };

  const complete = async () => {
    if (!deal?.id) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/listing-deals/complete', {
        method: 'POST',
        body: JSON.stringify({ dealId: deal.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('server_error'));
      await load();
      setMsg(t('deal_completed_expert_msg').replace('{amount}', String(deal.amount)));
    } catch (e: any) {
      setMsg(e?.message || t('server_error'));
    } finally {
      setLoading(false);
    }
  };

  const dispute = async () => {
    if (!deal?.id) return;
    const ok = await confirm({
      title: t('no_dispute') as TranslationKeys,
      description: t('dispute_desc_msg') as TranslationKeys,
      variant: 'danger',
      confirmLabel: t('no_dispute') as TranslationKeys,
      cancelLabel: t('back') as TranslationKeys
    });
    if (!ok) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/listing-deals/dispute', {
        method: 'POST',
        body: JSON.stringify({ dealId: deal.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('server_error'));
      await load();
      setMsg(t('dispute_status_msg'));
    } catch (e: any) {
      setMsg(e?.message || t('server_error'));
    } finally {
      setLoading(false);
    }
  };

  const cancel = async () => {
    if (!deal?.id) return;
    const ok = await confirm({
      title: t('cancel') as TranslationKeys,
      description: t('confirm_delete_chat') as TranslationKeys, // repurposed logic
      variant: 'danger'
    });
    if (!ok) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await apiFetch('/api/listing-deals/cancel', {
        method: 'POST',
        body: JSON.stringify({ dealId: deal.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('server_error'));
      setDeal(null);
      setMsg(t('deal_cancelled_title'));
    } catch (e: any) {
      setMsg(e?.message || t('server_error'));
    } finally {
      setLoading(false);
    }
  };

  const amt = deal ? Number(deal.amount) : 0;

  return (
    <div className="shrink-0 border-t border-emerald-500/25 bg-emerald-950/40 px-3 py-2.5 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/90">
        {t('escrow_title')}
      </p>
      {msg && <p className="text-[11px] text-white/80 leading-snug">{msg}</p>}

      {role === 'expert' && (
        <div className="flex flex-wrap gap-2">
          {(!deal || deal.status === 'pending_payment') && (
            <>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={t('mali_amount') as string}
                  className="w-full sm:w-[160px] px-3 py-2 rounded-xl bg-black/25 border border-white/20 text-white text-xs outline-none focus:border-emerald-400"
                  disabled={loading}
                />
                <span className="text-[11px] text-white/70">MALI</span>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={requestPay}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {t('request_payment')}
              </button>
            </>
          )}
          {deal &&
            deal.status === 'pending_payment' && (
            <button
              type="button"
              disabled={loading}
              onClick={cancel}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-white/10 text-white/70 text-xs hover:bg-white/15 disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          )}
        </div>
      )}

      {role === 'client' && deal?.status === 'pending_payment' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/80">
            {t('waiting_client_payment').replace('{amount}', String(amt))}
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={pay}
            className="w-full sm:w-auto px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold disabled:opacity-50"
          >
            {t('pay_now')}
          </button>
        </div>
      )}

      {/* NEW: Escrow Held Logic */}
      {deal?.status === 'escrow_held' && (
        <div className="flex flex-wrap items-center gap-2">
          {role === 'expert' ? (
            <>
              <span className="text-xs text-emerald-300 font-medium">{t('escrow_held_expert')}</span>
              <button
                type="button"
                disabled={loading}
                onClick={markDone}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
              >
                {t('mark_as_done')}
              </button>
            </>
          ) : (
            <span className="text-xs text-white/70 italic">
              {t('escrow_held_client')}
            </span>
          )}
        </div>
      )}

      {/* NEW: Confirmation Logic */}
      {deal?.status === 'pending_client_confirm' && (
        <div className="flex flex-col gap-2">
          {role === 'client' ? (
            <>
              <p className="text-xs text-amber-300 font-bold">{t('expert_finished_msg')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={complete}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  {t('yes_pay')}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={dispute}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                >
                  {t('no_dispute')}
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-white/70 animate-pulse">
              {t('waiting_client_confirm')}
            </span>
          )}
        </div>
      )}

      {/* NEW: Dispute Status */}
      {deal?.status === 'disputed' && (
        <div className="p-2 rounded-lg bg-rose-900/30 border border-rose-500/30">
           <p className="text-[11px] text-rose-300 font-bold flex items-center gap-2">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
             </span>
             {t('dispute_status_msg')}
           </p>
           <p className="text-[10px] text-white/50 mt-1">{t('dispute_desc_msg')}</p>
        </div>
      )}

      {deal?.status === 'completed' && (
        <div className="p-3 rounded-[20px] bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5 animate-fade-in">
          <p className="text-sm font-bold text-emerald-400 mb-1">
            {t('deal_completed_title')}
          </p>
          <p className="text-[11px] text-white/70 leading-relaxed">
            {role === 'expert' 
              ? t('deal_completed_expert_msg').replace('{amount}', String(amt))
              : t('deal_completed_client_msg').replace('{amount}', String(amt))
            }
          </p>
        </div>
      )}

      {deal?.status === 'cancelled' && (
        <div className="p-3 rounded-[20px] bg-rose-500/10 border border-rose-500/20 shadow-lg shadow-rose-500/5 animate-fade-in">
          <p className="text-sm font-bold text-rose-400 mb-1">
            {t('deal_cancelled_title')}
          </p>
          <p className="text-[11px] text-white/70 leading-relaxed">
            {role === 'client' 
              ? t('deal_cancelled_client_msg').replace('{amount}', String(amt)) 
              : t('deal_cancelled_expert_msg').replace('{amount}', String(amt))
            }
          </p>
        </div>
      )}
    </div>
  );
}

