import { describe, it, expect } from 'vitest';
import {
    signSettlementRequest,
    encryptSettlementSecret,
    decryptSettlementSecret,
    settlementSigningPayload,
} from '../middleware/settlementAuth.middleware';

describe('settlement HMAC helpers', () => {
    it('signs deterministically', () => {
        const a = signSettlementRequest('secret', 'POST', '/api/settlement/v1/hold', '100', 'n1', '{"a":1}');
        const b = signSettlementRequest('secret', 'POST', '/api/settlement/v1/hold', '100', 'n1', '{"a":1}');
        expect(a).toBe(b);
        expect(a).toMatch(/^[a-f0-9]{64}$/);
    });

    it('changes when body changes', () => {
        const a = signSettlementRequest('secret', 'POST', '/path', '1', 'n', '{}');
        const b = signSettlementRequest('secret', 'POST', '/path', '1', 'n', '{"x":1}');
        expect(a).not.toBe(b);
    });

    it('encrypts and decrypts scoped secrets', () => {
        process.env.SETTLEMENT_SECRET_PEPPER = 'test-pepper-settlement-32chars!!';
        const plain = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
        const enc = encryptSettlementSecret(plain);
        expect(enc).not.toBe(plain);
        expect(decryptSettlementSecret(enc)).toBe(plain);
    });

    it('builds canonical payload', () => {
        expect(settlementSigningPayload('post', '/x', '1', 'n', '{}')).toBe('POST\n/x\n1\nn\n{}');
    });
});
