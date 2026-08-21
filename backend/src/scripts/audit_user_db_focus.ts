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
const mid = 'a9f772c2-e0a5-43e8-98fa-d286d0423687';

async function main() {
    const u = await pool.query(
        'SELECT id, phone, name, surname, role, is_active FROM users WHERE id = $1',
        [sid],
    );
    console.log('USER', u.rows[0]);

    const bal = await pool.query(
        'SELECT balance, locked_balance FROM token_balances WHERE user_id = $1',
        [sid],
    );
    console.log('BALANCE', bal.rows[0]);

    const locked = await pool.query(
        `SELECT
            COALESCE((SELECT locked_balance FROM token_balances WHERE user_id = $1), 0) AS locked,
            COALESCE((
              SELECT SUM(amount)::numeric FROM transactions
              WHERE sender_id = $1 AND status = 'pending' AND type = 'booking'
            ), 0) AS pending_sum`,
        [sid],
    );
    console.log('LOCKED_VS_PENDING', locked.rows[0]);

    const pending = await pool.query(
        `SELECT id, amount, status, note, created_at,
                CASE WHEN metadata IS NULL THEN null ELSE left(metadata::text, 100) END AS meta
         FROM transactions
         WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'pending'
         ORDER BY created_at DESC LIMIT 10`,
        [sid],
    );
    console.log('PENDING_TX', pending.rows);

    const subs = await pool.query(
        `SELECT id, mentor_id, started_at, expires_at, amount_paid, transaction_id,
                expires_at > NOW() AS active
         FROM student_mentor_subscriptions WHERE student_id = $1
         ORDER BY expires_at DESC`,
        [sid],
    );
    console.log('SUBS', subs.rows);

    const idx = await pool.query(
        `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'student_mentor_subscriptions'`,
    );
    console.log('SUB_INDEXES', idx.rows);

    const deals = await pool.query(
        `SELECT id, status, amount, chat_id, transaction_id, created_at
         FROM listing_service_deals
         WHERE client_id = $1 OR expert_id = $1
         ORDER BY created_at DESC LIMIT 8`,
        [sid],
    );
    console.log('DEALS', deals.rows);

    const tables = await pool.query(
        `SELECT to_regclass('public.user_crypto_keys') AS crypto,
                to_regclass('public.student_mentor_subscriptions') AS subs,
                to_regclass('public.listing_service_deals') AS deals`,
    );
    console.log('TABLES', tables.rows[0]);

    const priv = await pool.query(
        `SELECT c.id,
                c.metadata->>'source' AS src,
                c.metadata->>'listing_chat_kind' AS kind,
                c.metadata->>'application_status' AS app,
                c.metadata->>'intent' AS intent
         FROM chats c
         JOIN chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = $1
         JOIN chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = $2
         WHERE c.type = 'private'`,
        [sid, mid],
    );
    console.log('PRIVATE_WITH_MENTOR', priv.rows);

    const badImg = await pool.query(
        `SELECT COUNT(*)::int AS n FROM messages
         WHERE chat_id = '8aec8275-9b41-4e65-982a-9afdd18b286d'
           AND type = 'image'
           AND content LIKE '%Dars doskasi%'`,
    );
    console.log('BAD_WHITEBOARD_MSGS', badImg.rows[0]);

    const listingCount = await pool.query(
        `SELECT COUNT(*)::int AS n
         FROM chats c
         JOIN chat_participants cp ON cp.chat_id = c.id AND cp.user_id = $1
         WHERE c.type = 'private' AND c.metadata->>'source' = 'expert_listing'`,
        [sid],
    );
    console.log('LISTING_PRIVATE_CHATS', listingCount.rows[0]);

    const orphanParts = await pool.query(
        `SELECT cp.chat_id FROM chat_participants cp
         LEFT JOIN chats c ON c.id = cp.chat_id
         WHERE cp.user_id = $1 AND c.id IS NULL`,
        [sid],
    );
    console.log('ORPHAN_PARTICIPANTS', orphanParts.rows.length);

    const orphanSubs = await pool.query(
        `SELECT s.id FROM student_mentor_subscriptions s
         LEFT JOIN users u1 ON u1.id = s.student_id
         LEFT JOIN users u2 ON u2.id = s.mentor_id
         WHERE s.student_id = $1 AND (u1.id IS NULL OR u2.id IS NULL)`,
        [sid],
    );
    console.log('ORPHAN_SUBS', orphanSubs.rows.length);
}

main()
    .catch(console.error)
    .finally(() => pool.end());
