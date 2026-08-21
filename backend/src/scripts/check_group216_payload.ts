process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
    const ids = [
        '8aec8275-9b41-4e65-982a-9afdd18b286d', // known 216
        '8aec8275-9b41-4e65-982a-9afdd18b206d', // from console OCR?
    ];
    for (const id of ids) {
        const c = await pool.query(`SELECT id, name, type FROM chats WHERE id = $1`, [id]);
        console.log(id, c.rows[0] || 'NOT FOUND');
    }

    // Message size in group 216 - huge data URLs can break fetch
    const sizes = await pool.query(
        `SELECT id, type, length(content) AS content_len,
                length(COALESCE(metadata::text,'')) AS meta_len, created_at
         FROM messages
         WHERE chat_id = '8aec8275-9b41-4e65-982a-9afdd18b286d'
         ORDER BY length(content) DESC
         LIMIT 10`,
    );
    console.log('\nLargest messages in 216:');
    for (const r of sizes.rows) {
        console.log({
            id: r.id,
            type: r.type,
            content_kb: Math.round(Number(r.content_len) / 1024),
            meta_kb: Math.round(Number(r.meta_len) / 1024),
            at: r.created_at,
        });
    }

    const total = await pool.query(
        `SELECT COUNT(*)::int AS n,
                COALESCE(SUM(length(content)),0)::bigint AS content_bytes,
                COALESCE(SUM(length(COALESCE(metadata::text,''))),0)::bigint AS meta_bytes
         FROM messages WHERE chat_id = '8aec8275-9b41-4e65-982a-9afdd18b286d'`,
    );
    console.log('\nGroup 216 totals:', {
        messages: total.rows[0].n,
        content_mb: (Number(total.rows[0].content_bytes) / 1024 / 1024).toFixed(2),
        meta_mb: (Number(total.rows[0].meta_bytes) / 1024 / 1024).toFixed(2),
    });

    // Zero membership
    const mem = await pool.query(
        `SELECT u.phone, cp.chat_id FROM chat_participants cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.chat_id = '8aec8275-9b41-4e65-982a-9afdd18b286d'`,
    );
    console.log('\nmembers:', mem.rows);
}

main()
    .catch(console.error)
    .finally(() => pool.end());
