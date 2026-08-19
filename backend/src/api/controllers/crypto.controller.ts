import { Response } from 'express';
import { AuthRequest, userIdFromToken } from '../../middleware/auth.middleware';
import { CryptoKeyModel } from '../../models/postgres/CryptoKey';

function isValidPublicKey(alg: string, publicKey: string): boolean {
    try {
        const buf = Buffer.from(publicKey, 'base64');
        if (alg === 'x25519') return buf.length === 32;
        if (alg === 'p256') return buf.length === 65 || buf.length === 33;
        return false;
    } catch {
        return false;
    }
}

export const upsertMyPublicKey = async (req: AuthRequest, res: Response) => {
    try {
        const userId = userIdFromToken(req.user);
        if (!userId) return res.status(401).json({ message: 'Authentication required' });
        const { alg, publicKey } = req.body as { alg: string; publicKey: string };
        if (!isValidPublicKey(alg, publicKey)) {
            return res.status(400).json({ message: 'Invalid public key' });
        }
        const row = await CryptoKeyModel.upsert(userId, alg, publicKey);
        return res.json({ userId: row.user_id, alg: row.alg, publicKey: row.public_key });
    } catch (err) {
        console.error('upsertMyPublicKey:', err);
        return res.status(500).json({ message: 'Failed to store public key' });
    }
};

export const getPublicKey = async (req: AuthRequest, res: Response) => {
    try {
        const targetId = String(req.params.userId || '');
        if (!targetId) return res.status(400).json({ message: 'userId required' });
        const row = await CryptoKeyModel.findByUserId(targetId);
        if (!row) return res.status(404).json({ message: 'Public key not published' });
        return res.json({ userId: row.user_id, alg: row.alg, publicKey: row.public_key });
    } catch (err) {
        console.error('getPublicKey:', err);
        return res.status(500).json({ message: 'Failed to load public key' });
    }
};

export const getPublicKeysBatch = async (req: AuthRequest, res: Response) => {
    try {
        const raw = String(req.query.ids || '');
        const ids = raw
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 50);
        const rows = await CryptoKeyModel.findByUserIds(ids);
        return res.json(
            rows.map((row) => ({ userId: row.user_id, alg: row.alg, publicKey: row.public_key }))
        );
    } catch (err) {
        console.error('getPublicKeysBatch:', err);
        return res.status(500).json({ message: 'Failed to load public keys' });
    }
};
