export interface SessionMaterial {
    id: string;
    session_id: string;
    uploader_id: string;
    title: string;
    file_url: string;
    file_type: string;
    file_size_bytes?: number;
    created_at: Date;
}

import { pool } from '../../config/database';

export const SessionMaterialModel = {
    async create(data: Partial<SessionMaterial>): Promise<SessionMaterial> {
        const query = `
            INSERT INTO session_materials (session_id, uploader_id, title, file_url, file_type, file_size_bytes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const values = [
            data.session_id,
            data.uploader_id,
            data.title,
            data.file_url,
            data.file_type,
            data.file_size_bytes || 0
        ];
        const result = await pool.query(query, values);
        return result.rows[0];
    },

    async findBySession(sessionId: string, opts?: { currentLessonOnly?: boolean }): Promise<SessionMaterial[]> {
        if (!opts?.currentLessonOnly) {
            const result = await pool.query(
                'SELECT * FROM session_materials WHERE session_id = $1 ORDER BY created_at DESC',
                [sessionId]
            );
            return result.rows;
        }
        const result = await pool.query(
            `
            WITH bounds AS (
                SELECT
                    (SELECT created_at FROM messages
                     WHERE chat_id::text = $1 AND type = 'lesson_start'
                     ORDER BY created_at DESC LIMIT 1) AS last_start,
                    (SELECT created_at FROM messages
                     WHERE chat_id::text = $1 AND type = 'lesson_end'
                     ORDER BY created_at DESC LIMIT 1) AS last_end
            )
            SELECT m.*
            FROM session_materials m, bounds b
            WHERE m.session_id = $1
              AND b.last_start IS NOT NULL
              AND (b.last_end IS NULL OR b.last_end < b.last_start)
              AND m.created_at >= b.last_start
            ORDER BY m.created_at DESC
            `,
            [sessionId]
        );
        return result.rows;
    },

    async delete(id: string, uploaderId: string): Promise<boolean> {
        const query = 'DELETE FROM session_materials WHERE id = $1 AND uploader_id = $2 RETURNING id';
        const result = await pool.query(query, [id, uploaderId]);
        return (result.rowCount ?? 0) > 0;
    }
};
