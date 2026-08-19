import { pool } from '../../config/database';

export type StoredPublicKey = {
    user_id: string;
    alg: string;
    public_key: string;
    updated_at: Date;
};

export const CryptoKeyModel = {
    async upsert(userId: string, alg: string, publicKey: string): Promise<StoredPublicKey> {
        const result = await pool.query(
            `INSERT INTO user_crypto_keys (user_id, alg, public_key, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (user_id) DO UPDATE
               SET alg = EXCLUDED.alg,
                   public_key = EXCLUDED.public_key,
                   updated_at = NOW()
             RETURNING user_id, alg, public_key, updated_at`,
            [userId, alg, publicKey]
        );
        return result.rows[0];
    },

    async findByUserId(userId: string): Promise<StoredPublicKey | null> {
        const result = await pool.query(
            `SELECT user_id, alg, public_key, updated_at
             FROM user_crypto_keys WHERE user_id = $1 LIMIT 1`,
            [userId]
        );
        return result.rows[0] || null;
    },

    async findByUserIds(userIds: string[]): Promise<StoredPublicKey[]> {
        if (!userIds.length) return [];
        const result = await pool.query(
            `SELECT user_id, alg, public_key, updated_at
             FROM user_crypto_keys WHERE user_id = ANY($1::uuid[])`,
            [userIds]
        );
        return result.rows;
    },
};
