import { describe, expect, it } from 'vitest';
import { isE2eEnvelope, parseMetadata } from './e2eEnvelope';

describe('e2eEnvelope', () => {
    it('detects e2e metadata objects', () => {
        expect(isE2eEnvelope({ e2e: true, nonce: 'abc' })).toBe(true);
        expect(isE2eEnvelope({ e2e_v: 1 })).toBe(true);
        expect(isE2eEnvelope({ caption: 'hi' })).toBe(false);
        expect(isE2eEnvelope(null)).toBe(false);
    });

    it('parses JSON metadata strings', () => {
        expect(parseMetadata('{"e2e":true}')).toEqual({ e2e: true });
        expect(isE2eEnvelope('{"e2e":true,"e2e_v":1}')).toBe(true);
    });
});
