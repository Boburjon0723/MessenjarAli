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
    // 1) Find all broken whiteboard "image" messages (caption stored as content)
    const bad = await pool.query(
        `SELECT id, chat_id, type, left(content, 80) AS content
         FROM messages
         WHERE type = 'image'
           AND (
             content LIKE '%Dars doskasi%'
             OR content LIKE '%Whiteboard%saqlandi%'
             OR (content LIKE '🎨%' AND content NOT LIKE 'data:%' AND content NOT LIKE 'http%' AND content NOT LIKE '/%')
           )`,
    );
    console.log('bad image messages:', bad.rows.length);
    console.log(bad.rows);

    if (bad.rows.length === 0) {
        console.log('nothing to fix');
        return;
    }

    // 2) Convert to text service notices OR restore from metadata.url if data URL exists
    const updated = await pool.query(
        `UPDATE messages
         SET
           type = CASE
             WHEN COALESCE(metadata->>'url', '') LIKE 'data:%'
               OR COALESCE(metadata->>'url', '') LIKE 'http%'
               OR COALESCE(metadata->>'url', '') LIKE '/%'
             THEN 'image'
             ELSE 'text'
           END,
           content = CASE
             WHEN COALESCE(metadata->>'url', '') LIKE 'data:%'
               OR COALESCE(metadata->>'url', '') LIKE 'http%'
               OR COALESCE(metadata->>'url', '') LIKE '/%'
             THEN metadata->>'url'
             ELSE COALESCE(NULLIF(metadata->>'caption', ''), '🎨 Dars doskasi (Whiteboard) saqlandi.')
           END,
           metadata = COALESCE(metadata, '{}'::jsonb)
             || jsonb_build_object(
                  'caption', COALESCE(metadata->>'caption', '🎨 Dars doskasi (Whiteboard) saqlandi.'),
                  'is_whiteboard', true
                )
         WHERE id = ANY($1::uuid[])
         RETURNING id, type, left(content, 60) AS content`,
        [bad.rows.map((r) => r.id)],
    );
    console.log('fixed:', updated.rows);

    const stillBad = await pool.query(
        `SELECT COUNT(*)::int AS n FROM messages
         WHERE type = 'image'
           AND content LIKE '%Dars doskasi%'`,
    );
    console.log('remaining bad:', stillBad.rows[0]);
}

main()
    .catch(console.error)
    .finally(() => pool.end());
