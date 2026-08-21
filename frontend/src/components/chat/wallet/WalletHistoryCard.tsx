'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GlassCard } from '../../ui/GlassCard';
import { useLanguage } from '@/context/LanguageContext';
import { getUser } from '@/lib/auth-storage';

type TxKind =
    | 'mentor_escrow'
    | 'listing_escrow'
    | 'session_escrow'
    | 'transfer'
    | 'topup'
    | 'withdraw'
    | 'booking'
    | 'other';

function classifyTx(tx: any): TxKind {
    const type = String(tx?.type || '').toLowerCase();
    const note = String(tx?.note || '');
    let meta: Record<string, unknown> = {};
    if (tx?.metadata && typeof tx.metadata === 'object') meta = tx.metadata;
    else if (typeof tx?.metadata === 'string') {
        try {
            meta = JSON.parse(tx.metadata) as Record<string, unknown>;
        } catch {
            meta = {};
        }
    }
    const metaKind = String(meta.kind || meta.type || '').toLowerCase();
    if (
        metaKind === 'mentor_subscription' ||
        /mentor 30 kun/i.test(note) ||
        (type === 'booking' && /mentor|obuna/i.test(note))
    ) {
        return 'mentor_escrow';
    }
    if (/listing|e'?lon/i.test(note) || metaKind.includes('listing')) return 'listing_escrow';
    if (type === 'booking' || /escrow|session booking/i.test(note)) return 'session_escrow';
    if (type === 'transfer' || /WITHDRAW_REQUEST/i.test(note)) {
        return /WITHDRAW_REQUEST/i.test(note) ? 'withdraw' : 'transfer';
    }
    if (type === 'topup' || /top.?up|to'?ldirish/i.test(note)) return 'topup';
    if (type === 'withdraw') return 'withdraw';
    if (type === 'booking') return 'booking';
    return 'other';
}

function personName(first?: string, surname?: string, fallback?: string) {
    const n = `${first || ''} ${surname || ''}`.trim();
    return n || fallback || '—';
}

export function WalletHistoryCard({ transactions }: { transactions: any[] }) {
    const { t, language } = useLanguage();
    const [selected, setSelected] = useState<any | null>(null);
    const locale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';

    useEffect(() => {
        if (!selected) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelected(null);
        };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [selected]);

    const detail = useMemo(() => {
        if (!selected) return null;
        const currentUser = getUser() || {};
        const userId = currentUser.id || currentUser.userId;
        const isSender = selected.sender_id === userId;
        const kind = classifyTx(selected);
        const status = String(selected.status || '').toLowerCase();
        const isPendingEscrow =
            status === 'pending' &&
            (kind === 'mentor_escrow' ||
                kind === 'listing_escrow' ||
                kind === 'session_escrow' ||
                kind === 'booking');
        const pendingIncoming = !isSender && isPendingEscrow;
        const otherName = isSender
            ? personName(selected.receiver_name, selected.receiver_surname, t('system'))
            : personName(selected.sender_name, selected.sender_surname, t('system'));

        const kindTitle =
            kind === 'mentor_escrow'
                ? t('tx_kind_mentor_escrow')
                : kind === 'listing_escrow'
                  ? t('tx_kind_listing_escrow')
                  : kind === 'session_escrow'
                    ? t('tx_kind_session_escrow')
                    : kind === 'transfer'
                      ? t('tx_kind_transfer')
                      : kind === 'topup'
                        ? t('tx_kind_topup')
                        : kind === 'withdraw'
                          ? t('tx_kind_withdraw')
                          : kind === 'booking'
                            ? t('tx_kind_booking')
                            : t('tx_kind_other');

        const kindDesc =
            kind === 'mentor_escrow'
                ? t('tx_kind_mentor_escrow_desc')
                : kind === 'listing_escrow'
                  ? t('tx_kind_listing_escrow_desc')
                  : kind === 'session_escrow'
                    ? t('tx_kind_session_escrow_desc')
                    : kind === 'transfer'
                      ? t('tx_kind_transfer_desc')
                      : kind === 'topup'
                        ? t('tx_kind_topup_desc')
                        : kind === 'withdraw'
                          ? t('tx_kind_withdraw_desc')
                          : kind === 'booking'
                            ? t('tx_kind_booking_desc')
                            : t('tx_kind_other_desc');

        return {
            isSender,
            kind,
            kindTitle,
            kindDesc,
            status,
            isPendingEscrow,
            pendingIncoming,
            otherName,
            amount: Number(selected.amount) || 0,
            fee: Number(selected.fee) || 0,
            net: Number(selected.net_amount ?? selected.amount) || 0,
            note: String(selected.note || '').trim(),
            createdAt: selected.created_at
                ? new Date(selected.created_at).toLocaleString(locale, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                  })
                : '—',
            statusLabel:
                status === 'pending'
                    ? t('tx_status_pending')
                    : status === 'completed'
                      ? t('tx_status_completed')
                      : status === 'cancelled' || status === 'canceled'
                        ? t('tx_status_cancelled')
                        : status || '—',
        };
    }, [selected, t, locale]);

    const rows = transactions.map((tx) => {
        const currentUser = getUser() || {};
        const userId = currentUser.id || currentUser.userId;
        const isSender = tx.sender_id === userId;
        const otherName = isSender
            ? personName(tx.receiver_name, tx.receiver_surname, t('system'))
            : personName(tx.sender_name, tx.sender_surname, t('system'));
        const otherAvatar = isSender ? tx.receiver_avatar : tx.sender_avatar;
        const kind = classifyTx(tx);
        const status = String(tx.status || '').toLowerCase();
        const isPendingEscrow =
            status === 'pending' &&
            (kind === 'mentor_escrow' ||
                kind === 'listing_escrow' ||
                kind === 'session_escrow' ||
                kind === 'booking');
        const pendingIncoming = !isSender && isPendingEscrow;
        const kindShort =
            kind === 'mentor_escrow'
                ? t('tx_kind_mentor_short')
                : kind === 'listing_escrow'
                  ? t('tx_kind_listing_short')
                  : kind === 'session_escrow' || kind === 'booking'
                    ? t('tx_kind_escrow_short')
                    : kind === 'transfer'
                      ? t('tx_kind_transfer_short')
                      : kind === 'topup'
                        ? t('tx_kind_topup_short')
                        : kind === 'withdraw'
                          ? t('tx_kind_withdraw_short')
                          : isSender
                            ? t('outgoing')
                            : t('incoming');

        return {
            tx,
            isSender,
            otherName,
            otherAvatar,
            pendingIncoming,
            kindShort,
        };
    });

    const modal =
        selected && detail && typeof document !== 'undefined'
            ? createPortal(
                  <div
                      className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
                      onClick={() => setSelected(null)}
                      role="dialog"
                      aria-modal="true"
                      aria-label={t('tx_detail_title')}
                  >
                      <div
                          className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#1a1a1a] border border-white/10 shadow-2xl"
                          onClick={(e) => e.stopPropagation()}
                      >
                          <div className="sticky top-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#1a1a1a]/95 backdrop-blur-md">
                              <div className="min-w-0">
                                  <p className="text-[11px] text-[#aaaaaa] uppercase tracking-wider">
                                      {t('tx_detail_title')}
                                  </p>
                                  <h3 className="text-white font-semibold text-[16px] truncate">
                                      {detail.kindTitle}
                                  </h3>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => setSelected(null)}
                                  className="p-2 rounded-full bg-white/10 hover:bg-white/15 text-white shrink-0"
                                  aria-label={t('cancel')}
                              >
                                  <X className="h-5 w-5" />
                              </button>
                          </div>

                          <div className="p-4 space-y-4">
                              <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-4 text-center">
                                  <p
                                      className={`text-3xl font-black tabular-nums ${
                                          detail.pendingIncoming
                                              ? 'text-amber-300'
                                              : detail.isSender
                                                ? 'text-white'
                                                : 'text-emerald-400'
                                      }`}
                                  >
                                      {detail.isSender ? '−' : '+'}
                                      {detail.amount.toLocaleString()}{' '}
                                      <span className="text-base font-bold text-white/50">MALI</span>
                                  </p>
                                  <p className="text-[12px] text-[#aaaaaa] mt-1">{detail.statusLabel}</p>
                              </div>

                              <p className="text-[13px] text-white/70 leading-relaxed">{detail.kindDesc}</p>

                              {detail.pendingIncoming && (
                                  <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2.5 text-[12px] text-amber-200/95 leading-snug">
                                      {t('tx_escrow_pending_hint')}
                                  </div>
                              )}

                              <div className="space-y-2.5 text-[13px]">
                                  <DetailRow label={t('tx_field_type')} value={detail.kindTitle} />
                                  <DetailRow
                                      label={detail.isSender ? t('tx_field_to') : t('tx_field_from')}
                                      value={detail.otherName}
                                  />
                                  <DetailRow label={t('tx_field_status')} value={detail.statusLabel} />
                                  <DetailRow label={t('tx_field_date')} value={detail.createdAt} />
                                  {detail.fee > 0 && (
                                      <DetailRow
                                          label={t('tx_field_fee')}
                                          value={`${detail.fee.toLocaleString()} MALI`}
                                      />
                                  )}
                                  {detail.net !== detail.amount && (
                                      <DetailRow
                                          label={t('tx_field_net')}
                                          value={`${detail.net.toLocaleString()} MALI`}
                                      />
                                  )}
                                  {detail.note && (
                                      <div className="pt-2 border-t border-white/[0.06]">
                                          <p className="text-[11px] text-[#aaaaaa] mb-1">{t('tx_field_note')}</p>
                                          <p className="text-white/85 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                                              {detail.note}
                                          </p>
                                      </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>,
                  document.body
              )
            : null;

    return (
        <>
            <GlassCard className="!p-3 lg:!p-5 !rounded-[1.25rem] lg:!rounded-[25px] border border-amber-500/15 bg-gradient-to-br from-[rgba(var(--glass-rgb),0.55)] to-[rgba(var(--glass-rgb),0.35)] backdrop-blur-xl shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-2 lg:mb-3 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shrink-0">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 lg:h-5 lg:w-5 text-amber-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-white font-bold text-sm lg:text-base tracking-tight">
                                {t('transaction_history')}
                            </h3>
                            <p className="text-white/40 text-[10px] lg:text-xs">
                                {t('transaction_history_sub')}
                            </p>
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
                        {rows.map(
                            ({ tx, isSender, otherName, otherAvatar, pendingIncoming, kindShort }) => (
                                <button
                                    type="button"
                                    key={tx.id}
                                    onClick={() => setSelected(tx)}
                                    className="w-full text-left p-3 lg:p-4 rounded-xl lg:rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/15 transition-all relative overflow-hidden group cursor-pointer"
                                >
                                    <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex justify-between items-center gap-2 relative z-10">
                                        <div className="flex items-center gap-2.5 lg:gap-3 min-w-0 flex-1">
                                            <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-white/5 p-0.5 border border-white/10 shrink-0">
                                                {otherAvatar ? (
                                                    <img
                                                        src={otherAvatar}
                                                        alt=""
                                                        className="w-full h-full object-cover rounded-[10px] lg:rounded-[12px]"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent rounded-[10px] lg:rounded-[12px]">
                                                        <span className="text-white text-xs lg:text-sm font-bold">
                                                            {otherName[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-bold text-xs lg:text-sm truncate">
                                                    {isSender ? `${t('sent')}: ` : `${t('received')}: `}
                                                    {otherName}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                    <span
                                                        className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                                                            pendingIncoming
                                                                ? 'bg-amber-500/15 text-amber-400'
                                                                : isSender
                                                                  ? 'bg-amber-500/15 text-amber-400'
                                                                  : 'bg-emerald-500/15 text-emerald-400'
                                                        }`}
                                                    >
                                                        {pendingIncoming ? t('tx_escrow_pending') : kindShort}
                                                    </span>
                                                    <span className="text-[9px] text-white/30 font-bold">
                                                        {new Date(tx.created_at).toLocaleString(locale, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p
                                                className={`text-base lg:text-lg font-black tabular-nums ${
                                                    pendingIncoming
                                                        ? 'text-amber-300/90'
                                                        : isSender
                                                          ? 'text-white/90'
                                                          : 'text-emerald-400'
                                                }`}
                                            >
                                                {isSender ? '-' : '+'}
                                                {Number(tx.amount).toLocaleString()}
                                            </p>
                                            <p className="text-[9px] text-white/25 font-black uppercase tracking-widest">
                                                MALI
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            )
                        )}
                    </div>
                )}
            </GlassCard>
            {modal}
        </>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-3 items-start">
            <span className="text-[#aaaaaa] shrink-0">{label}</span>
            <span className="text-white text-right font-medium break-words">{value}</span>
        </div>
    );
}

export default WalletHistoryCard;

