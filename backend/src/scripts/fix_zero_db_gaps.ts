process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const sid = 'a1661dcd-f3c9-4fd2-88b0-d3fb9c6bd431';

async function main() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_crypto_keys (
            user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            alg VARCHAR(16) NOT NULL DEFAULT 'x25519',
            public_key TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);
    const t = await pool.query(`SELECT to_regclass('public.user_crypto_keys') AS t`);
    console.log('crypto table:', t.rows[0]);

    const orphan = await pool.query(
        `SELECT cp.chat_id::text AS chat_id
         FROM chat_participants cp
         LEFT JOIN chats c ON c.id = cp.chat_id
         WHERE cp.user_id = $1 AND c.id IS NULL`,
        [sid],
    );
    console.log('orphan chat_ids', orphan.rows);
    if (orphan.rows.length) {
        const ids = orphan.rows.map((x) => x.chat_id);
        await pool.query(
            `DELETE FROM chat_participants WHERE user_id = $1 AND chat_id = ANY($2::uuid[])`,
            [sid, ids],
        );
        console.log('deleted orphan participants:', ids.length);
    }

    // Ensure unique(student, mentor) if missing
    await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_student_mentor_subscriptions
        ON student_mentor_subscriptions (student_id, mentor_id)
    `).catch((e) => console.log('unique index note:', e.message));
    const idx = await pool.query(
        `SELECT indexname FROM pg_indexes WHERE tablename = 'student_mentor_subscriptions'`,
    );
    console.log('sub indexes now:', idx.rows);
}

main()
    .catch(console.error)
    .finally(() => pool.end());
