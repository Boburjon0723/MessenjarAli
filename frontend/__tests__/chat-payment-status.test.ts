import { describe, expect, it } from 'vitest';
import { formatPaymentAmount, mapSessionStatusToPhase, paymentPhaseLabelKey } from '@/lib/chat-payment-status';

describe('chat-payment-status', () => {
    it('maps phases to i18n keys', () => {
        expect(paymentPhaseLabelKey('escrow')).toBe('payment_phase_escrow');
        expect(paymentPhaseLabelKey('ongoing')).toBe('payment_phase_ongoing');
    });

    it('formats amount', () => {
        expect(formatPaymentAmount(100)).toContain('100');
        expect(formatPaymentAmount(null)).toBe('');
    });

    it('maps session and deal statuses to phases', () => {
        expect(mapSessionStatusToPhase('initiated')).toBe('escrow');
        expect(mapSessionStatusToPhase('ongoing')).toBe('ongoing');
    });
});
