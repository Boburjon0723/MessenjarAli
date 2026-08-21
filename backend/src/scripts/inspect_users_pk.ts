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
    const cols = await pool.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_name = 'users' ORDER BY ordinal_position`,
    );
    console.log('users columns:', cols.rows);

    const pk = await pool.query(
        `SELECT tc.constraint_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.table_name = 'users' AND tc.constraint_type = 'PRIMARY KEY'`,
    );
    console.log('users PK:', pk.rows);

    const indexes = await pool.query(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users'`,
    );
    console.log('users indexes:', indexes.rows);

    const dupIds = await pool.query(
        `SELECT id::text, COUNT(*)::int n FROM users GROUP BY id HAVING COUNT(*) > 1 LIMIT 5`,
    );
    console.log('duplicate user ids:', dupIds.rows);

    const phoneDups = await pool.query(
        `SELECT phone, COUNT(*)::int n FROM users GROUP BY phone HAVING COUNT(*) > 1 LIMIT 10`,
    );
    console.log('duplicate phones:', phoneDups.rows);

    // Create crypto table WITHOUT FK if users PK broken
    await pool.query(`
        CREATE TABLE IF NOT EXISTS user_crypto_keys (
            user_id UUID PRIMARY KEY,
            alg VARCHAR(16) NOT NULL DEFAULT 'x25519',
            public_key TEXT NOT NULL,
            updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('crypto created without FK');

    const sid = 'a1661dcd-f3c9-4fd2-88b0-d3fb9c6bd431';
    const orphan = await pool.query(
        `SELECT cp.chat_id::text AS chat_id
         FROM chat_participants cp
         LEFT JOIN chats c ON c.id = cp.chat_id
         WHERE cp.user_id = $1 AND c.id IS NULL`,
        [sid],
    );
    console.log('orphans', orphan.rows);
    if (orphan.rows.length) {
        await pool.query(
            `DELETE FROM chat_participants WHERE user_id = $1 AND chat_id = ANY($2::uuid[])`,
            [sid, orphan.rows.map((x) => x.chat_id)],
        );
        console.log('cleaned orphans');
    }

    await pool
        .query(
            `CREATE UNIQUE INDEX IF NOT EXISTS uq_student_mentor_subscriptions
             ON student_mentor_subscriptions (student_id, mentor_id)`,
        )
        .catch((e) => console.log('unique index:', e.message));
}

main()
    .catch(console.error)
    .finally(() => pool.end());
