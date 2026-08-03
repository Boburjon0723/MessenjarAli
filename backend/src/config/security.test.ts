import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { JWT_VERIFY_OPTS, validateSecretsAtBoot, timingSafeEqualString } from '../config/security';
import { safeUploadPath } from '../middleware/upload.middleware';

describe('security boot + JWT', () => {
    const env = { ...process.env };

    afterEach(() => {
        process.env = { ...env };
        vi.restoreAllMocks();
    });

    it('exits when JWT secrets missing', () => {
        delete process.env.JWT_SECRET;
        delete process.env.JWT_REFRESH_SECRET;
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
            throw new Error(`exit:${code}`);
        }) as never);
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        expect(() => validateSecretsAtBoot()).toThrow('exit:1');
        expect(exitSpy).toHaveBeenCalledWith(1);
        errSpy.mockRestore();
    });

    it('rejects JWT alg=none', () => {
        process.env.JWT_SECRET = 'a'.repeat(32);
        process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
        const secret = process.env.JWT_SECRET;
        const forged = jwt.sign({ sub: 'attacker', alg: 'none' } as object, secret, { algorithm: 'none' as jwt.Algorithm });
        expect(() => jwt.verify(forged, secret, JWT_VERIFY_OPTS)).toThrow();
    });

    it('timingSafeEqualString is constant-time safe for equal length', () => {
        expect(timingSafeEqualString('secret-token-abc', 'secret-token-abc')).toBe(true);
        expect(timingSafeEqualString('secret-token-abc', 'secret-token-xyz')).toBe(false);
        expect(timingSafeEqualString('a', 'ab')).toBe(false);
        expect(timingSafeEqualString(undefined, 'x')).toBe(false);
    });
});

describe('safeUploadPath', () => {
    it('rejects path traversal', () => {
        expect(safeUploadPath('../etc/passwd')).toBeNull();
        expect(safeUploadPath('..\\windows\\system32')).toBeNull();
        expect(safeUploadPath('/etc/passwd')).toBeNull();
    });

    it('accepts basename-only files under uploads', () => {
        const p = safeUploadPath('photo-123.jpg');
        expect(p).toBeTruthy();
        expect(p!.endsWith('photo-123.jpg')).toBe(true);
    });
});
