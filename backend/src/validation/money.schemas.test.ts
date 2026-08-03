import { describe, expect, it } from 'vitest';
import {
    bookSessionSchema,
    escrowHoldSchema,
    transferSchema,
} from '../validation/money.schemas';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('money.schemas', () => {
    it('accepts valid transfer', () => {
        const parsed = transferSchema.parse({
            receiverId: UUID,
            amount: '12.5',
            pin: '1234',
        });
        expect(parsed.amount).toBe(12.5);
    });

    it('rejects non-positive transfer amount', () => {
        expect(() =>
            transferSchema.parse({
                receiverId: UUID,
                amount: 0,
                pin: '1234',
            })
        ).toThrow();
    });

    it('escrowHold requires serviceId or positive amount', () => {
        expect(() => escrowHoldSchema.parse({})).toThrow();
        expect(escrowHoldSchema.parse({ serviceId: UUID }).serviceId).toBe(UUID);
        expect(escrowHoldSchema.parse({ amount: 10 }).amount).toBe(10);
    });

    it('validates bookSession expertId uuid', () => {
        expect(() => bookSessionSchema.parse({ expertId: 'nope' })).toThrow();
        expect(
            bookSessionSchema.parse({
                expertId: UUID,
                amount: 5,
            }).amount
        ).toBe(5);
    });
});
