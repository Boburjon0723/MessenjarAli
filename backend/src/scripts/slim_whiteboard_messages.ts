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
    // Remove huge data URLs from chat messages — keep short text + snapshot_id only
    const res = await pool.query(
        `UPDATE messages
         SET
           type = 'text',
           content = '🎨 Dars doskasi (Whiteboard) saqlandi.',
           metadata = jsonb_build_object(
             'is_whiteboard', true,
             'snapshot_id', metadata->>'snapshot_id',
             'caption', '🎨 Dars doskasi (Whiteboard) saqlandi.'
           )
         WHERE chat_id = '8aec8275-9b41-4e65-982a-9afdd18b286d'
           AND (
             content LIKE 'data:image%'
             OR COALESCE(metadata->>'url','') LIKE 'data:image%'
             OR COALESCE(metadata->>'is_whiteboard','') = 'true'
           )
         RETURNING id, type, length(content) AS len`,
    );
    console.log('slimmed whiteboard msgs:', res.rows);

    const total = await pool.query(
        `SELECT COUNT(*)::int AS n,
                COALESCE(SUM(length(content)),0)::bigint AS content_bytes,
                COALESCE(SUM(length(COALESCE(metadata::text,''))),0)::bigint AS meta_bytes
         FROM messages WHERE chat_id = '8aec8275-9b41-4e65-982a-9afdd18b286d'`,
    );
    console.log('group 216 size now:', {
        messages: total.rows[0].n,
        content_kb: Math.round(Number(total.rows[0].content_bytes) / 1024),
        meta_kb: Math.round(Number(total.rows[0].meta_bytes) / 1024),
    });
}

main()
    .catch(console.error)
    .finally(() => pool.end());
