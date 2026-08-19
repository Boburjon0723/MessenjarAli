export type PaymentPhase =
    | 'none'
    | 'pending'
    | 'escrow'
    | 'ongoing'
    | 'awaiting_confirm'
    | 'completed'
    | 'disputed'
    | 'cancelled';

export type ChatPaymentStatus = {
    phase: PaymentPhase;
    source: 'session' | 'deal' | null;
    rawStatus: string | null;
    amountMali: number | null;
};

const PHASE_LABEL_KEYS: Record<PaymentPhase, string> = {
    none: 'payment_phase_none',
    pending: 'payment_phase_pending',
    escrow: 'payment_phase_escrow',
    ongoing: 'payment_phase_ongoing',
    awaiting_confirm: 'payment_phase_awaiting_confirm',
    completed: 'payment_phase_completed',
    disputed: 'payment_phase_disputed',
    cancelled: 'payment_phase_cancelled',
};

export function paymentPhaseLabelKey(phase: PaymentPhase): string {
    return PHASE_LABEL_KEYS[phase] ?? PHASE_LABEL_KEYS.none;
}

/** service_sessions.status → ChatPaymentStatus.phase (backend bilan bir xil) */
export function mapSessionStatusToPhase(status: string): PaymentPhase {
    if (status === 'initiated') return 'escrow';
    if (status === 'ongoing') return 'ongoing';
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

/** listing_service_deals.status → ChatPaymentStatus.phase */
export function mapDealStatusToPhase(status: string): PaymentPhase {
    if (status === 'pending_payment') return 'pending';
    if (status === 'escrow_held') return 'escrow';
    if (status === 'pending_client_confirm') return 'awaiting_confirm';
    if (status === 'completed') return 'completed';
    if (status === 'disputed') return 'disputed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
}

export function formatPaymentAmount(amountMali: number | null | undefined): string {
    if (amountMali == null || !Number.isFinite(amountMali)) return '';
    return amountMali.toLocaleString('uz-UZ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}
