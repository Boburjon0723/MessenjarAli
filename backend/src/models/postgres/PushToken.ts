import { pool } from '../../config/database';

export interface PushToken {
    id: string;
    user_id: string;
    token: string;
    platform: string;
    created_at: Date;
    updated_at: Date;
}

export const PushTokenModel = {
    async upsert(userId: string, token: string, platform: string = 'unknown'): Promise<void> {
        await pool.query(
            `INSERT INTO push_tokens (user_id, token, platform)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, token) DO UPDATE SET platform = $3, updated_at = NOW()`,
            [userId, token, platform]
        );
    },

    async getByUserId(userId: string): Promise<PushToken[]> {
        const { rows } = await pool.query(
            'SELECT * FROM push_tokens WHERE user_id = $1',
            [userId]
        );
        return rows;
    },

    async getByUserIds(userIds: string[]): Promise<PushToken[]> {
        if (!userIds.length) return [];
        const { rows } = await pool.query(
            'SELECT * FROM push_tokens WHERE user_id = ANY($1)',
            [userIds]
        );
        return rows;
    },

    async remove(userId: string, token: string): Promise<void> {
        await pool.query(
            'DELETE FROM push_tokens WHERE user_id = $1 AND token = $2',
            [userId, token]
        );
    },

    async removeAllForUser(userId: string): Promise<void> {
        await pool.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
    },
};
