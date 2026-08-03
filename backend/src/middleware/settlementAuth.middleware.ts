import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import { timingSafeEqualString } from '../config/security';

export const SETTLEMENT_HMAC_HEADER = 'x-settlement-signature';
export const SETTLEMENT_TS_HEADER = 'x-settlement-timestamp';
export const SETTLEMENT_KEY_HEADER = 'x-settlement-key-id';
export const SETTLEMENT_NONCE_HEADER = 'x-settlement-nonce';

const MAX_SKEW_MS = 5 * 60 * 1000;

export type SettlementAuth = {
    companyWalletId: string;
    axisCompanyId: string;
    keyId: string;
};

export interface SettlementRequest extends Request {
    settlement?: SettlementAuth;
    rawBody?: string;
}

export function settlementSigningPayload(
    method: string,
    path: string,
    timestamp: string,
    nonce: string,
    body: string
): string {
    return `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${body}`;
}

export function signSettlementRequest(
    secret: string,
    method: string,
    path: string,
    timestamp: string,
    nonce: string,
    body: string
): string {
    const payload = settlementSigningPayload(method, path, timestamp, nonce, body);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function consumeNonce(keyId: string, nonce: string): Promise<boolean> {
    try {
        await pool.query(
            `INSERT INTO settlement_nonces (key_id, nonce, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
            [keyId, nonce]
        );
        return true;
    } catch (error: any) {
        if (error?.code === '23505') return false; // unique violation
        throw error;
    }
}

/**
 * HMAC S2S auth for Settlement API.
 * Headers: X-Settlement-Key-Id, X-Settlement-Timestamp, X-Settlement-Nonce, X-Settlement-Signature
 */
export function requireSettlementHmac(req: SettlementRequest, res: Response, next: NextFunction) {
    void (async () => {
        try {
            const keyId = String(req.headers[SETTLEMENT_KEY_HEADER] || '').trim();
            const timestamp = String(req.headers[SETTLEMENT_TS_HEADER] || '').trim();
            const nonce = String(req.headers[SETTLEMENT_NONCE_HEADER] || '').trim();
            const signature = String(req.headers[SETTLEMENT_HMAC_HEADER] || '').trim();

            if (!keyId || !timestamp || !nonce || !signature) {
                return res.status(401).json({ message: 'Settlement HMAC headers required' });
            }

            const tsNum = Number(timestamp);
            if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > MAX_SKEW_MS) {
                return res.status(401).json({ message: 'Settlement timestamp skew too large' });
            }

            const linkRes = await pool.query(
                `SELECT id, axis_company_id, company_wallet_id, hmac_secret_hash, status
                 FROM settlement_wallet_links
                 WHERE key_id = $1
                 LIMIT 1`,
                [keyId]
            );
            const link = linkRes.rows[0];
            if (!link || link.status !== 'active') {
                return res.status(403).json({ message: 'Invalid settlement key' });
            }

            if (!(await consumeNonce(keyId, nonce))) {
                return res.status(401).json({ message: 'Replay detected (nonce)' });
            }

            const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
            // Secret is stored hashed — we need plaintext for HMAC. Architecture stores scoped secret
            // encrypted on Axis; Mali stores hmac_secret for verification (server-side only).
            // Here hmac_secret_hash column holds the raw secret encrypted at rest via app env pepper.
            const secret = decryptSettlementSecret(link.hmac_secret_hash);
            const expected = signSettlementRequest(
                secret,
                req.method,
                req.originalUrl.split('?')[0],
                timestamp,
                nonce,
                body
            );

            if (!timingSafeEqualString(expected, signature)) {
                return res.status(403).json({ message: 'Invalid settlement signature' });
            }

            req.settlement = {
                companyWalletId: link.company_wallet_id,
                axisCompanyId: link.axis_company_id,
                keyId,
            };
            next();
        } catch (error) {
            console.error('Settlement HMAC error:', error);
            return res.status(500).json({ message: 'Settlement auth error' });
        }
    })();
}

function pepper(): string {
    return process.env.SETTLEMENT_SECRET_PEPPER || process.env.JWT_SECRET || 'dev-settlement-pepper';
}

export function encryptSettlementSecret(plain: string): string {
    const key = crypto.createHash('sha256').update(pepper()).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptSettlementSecret(blob: string): string {
    const buf = Buffer.from(blob, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const key = crypto.createHash('sha256').update(pepper()).digest();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

export function newSettlementSecret(): { keyId: string; secret: string } {
    return {
        keyId: `sk_${crypto.randomBytes(8).toString('hex')}`,
        secret: crypto.randomBytes(32).toString('hex'),
    };
}
