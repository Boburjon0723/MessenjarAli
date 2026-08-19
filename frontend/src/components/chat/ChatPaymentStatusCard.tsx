'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { useSocket } from '@/context/SocketContext';
import { formatPaymentAmount, paymentPhaseLabelKey, type ChatPaymentStatus } from '@/lib/chat-payment-status';

export type ChatPaymentStatusCardProps = {
    chatId?: string | number;
    t: any;
};

export function ChatPaymentStatusCard({ chatId, t }: ChatPaymentStatusCardProps) {
    const { socket } = useSocket();
    const [status, setStatus] = useState<ChatPaymentStatus | null>(null);

    const load = useCallback(async () => {
        if (!chatId) return;
        try {
            const res = await apiFetch(`/api/chats/${encodeURIComponent(String(chatId))}/payment-status`);
            if (!res.ok) return;
            const data = (await res.json()) as ChatPaymentStatus;
            setStatus(data);
        } catch {
            /* ignore */
        }
    }, [chatId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const onUpd = () => void load();
        window.addEventListener('socket_reconnected', onUpd);
        return () => window.removeEventListener('socket_reconnected', onUpd);
    }, [load]);

    useEffect(() => {
        if (!socket || !chatId) return;
        const cid = String(chatId);
        const onSession = (p: { chat_id?: string }) => {
            if (String(p?.chat_id ?? '') === cid) void load();
        };
        const onDeal = (p: { chatId?: string }) => {
            if (String(p?.chatId ?? '') === cid) void load();
        };
        socket.on('service_session_updated', onSession);
        socket.on('listing_deal_updated', onDeal);
        return () => {
            socket.off('service_session_updated', onSession);
            socket.off('listing_deal_updated', onDeal);
        };
    }, [socket, chatId, load]);

    if (!status || status.phase === 'none') return null;

    const amountStr = formatPaymentAmount(status.amountMali);
    const phaseLabel = t(paymentPhaseLabelKey(status.phase));

    return (
        <div className="mt-1 rounded-[20px] bg-blue-600/10 border border-blue-500/25 px-3 py-2.5 shadow-[0_1px_5px_-1px_rgba(0,0,0,0.21)]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-300/90 mb-0.5">
                {t('payment_status_title')}
            </p>
            <p className="text-[14px] font-medium text-white leading-snug">{phaseLabel}</p>
            {amountStr ? (
                <p className="text-[12px] text-blue-200/80 mt-0.5 tabular-nums">
                    {amountStr} MALI
                </p>
            ) : null}
        </div>
    );
}

export default ChatPaymentStatusCard;
