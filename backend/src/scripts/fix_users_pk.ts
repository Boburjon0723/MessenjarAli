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
    // Add PK on users if missing
    const pk = await pool.query(
        `SELECT 1 FROM information_schema.table_constraints
         WHERE table_name = 'users' AND constraint_type = 'PRIMARY KEY'`,
    );
    if (pk.rowCount === 0) {
        await pool.query(`ALTER TABLE users ADD PRIMARY KEY (id)`);
        console.log('Added PRIMARY KEY on users(id)');
    } else {
        console.log('users PK already exists');
    }

    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users (phone)`);
    console.log('users phone unique index ok');

    await pool
        .query(
            `CREATE UNIQUE INDEX IF NOT EXISTS uq_student_mentor_subscriptions
             ON student_mentor_subscriptions (student_id, mentor_id)`,
        )
        .then(() => console.log('subscription unique index ok'))
        .catch((e) => console.log('subscription unique index:', e.message));

    // Check orphan deal chat
    const chat = await pool.query(
        `SELECT id, type FROM chats WHERE id = ANY($1::uuid[])`,
        [['2df3902e-06d0-4d1a-a295-06fe99441e21', 'd537b643-e7b8-4d29-afe7-274d01b480cd']],
    );
    console.log('orphan-related chats still exist?', chat.rows);

    const deal = await pool.query(
        `SELECT id, status, chat_id, amount FROM listing_service_deals
         WHERE chat_id = '2df3902e-06d0-4d1a-a295-06fe99441e21'`,
    );
    console.log('deals for deleted chat:', deal.rows);

    const crypto = await pool.query(`SELECT to_regclass('public.user_crypto_keys') AS t`);
    console.log('crypto:', crypto.rows[0]);

    const idx = await pool.query(
        `SELECT tablename, indexname FROM pg_indexes
         WHERE tablename IN ('users','student_mentor_subscriptions','user_crypto_keys')
         ORDER BY tablename, indexname`,
    );
    console.log('indexes:', idx.rows);
}

main()
    .catch(console.error)
    .finally(() => pool.end());
