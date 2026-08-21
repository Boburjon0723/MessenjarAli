process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const phone = process.argv[2] || '+998943464428';
const mentorPhone = process.argv[3] || '+998950203601';

async function main() {
    const users = await pool.query(
        `SELECT id, phone, name, surname, role, is_active, created_at
         FROM users WHERE phone = ANY($1)`,
        [[phone, mentorPhone]],
    );
    const student = users.rows.find((r) => r.phone === phone);
    const mentor = users.rows.find((r) => r.phone === mentorPhone);
    console.log('\n=== USERS ===');
    console.log(JSON.stringify({ student, mentor }, null, 2));
    if (!student) return;

    const sid = student.id;
    const mid = mentor?.id;

    const profile = await pool.query(`SELECT * FROM user_profiles WHERE user_id = $1`, [sid]);
    console.log('\n=== PROFILE ===');
    console.log(JSON.stringify(profile.rows[0] || null, null, 2));

    const balance = await pool.query(
        `SELECT user_id, balance, locked_balance, lifetime_earned FROM token_balances WHERE user_id = $1`,
        [sid],
    );
    console.log('\n=== TOKEN BALANCE ===');
    console.log(JSON.stringify(balance.rows[0] || null, null, 2));

    const blocks = await pool.query(
        `SELECT * FROM user_blocks WHERE blocker_id = $1 OR blocked_id = $1`,
        [sid],
    );
    console.log('\n=== BLOCKS ===');
    console.log(JSON.stringify(blocks.rows, null, 2));

    const subs = await pool.query(
        `SELECT id, student_id, mentor_id, started_at, expires_at, amount_paid, transaction_id,
                expires_at > NOW() AS active,
                (SELECT COUNT(*) FROM student_mentor_subscriptions s2
                 WHERE s2.student_id = s.student_id AND s2.mentor_id = s.mentor_id) AS dup_count
         FROM student_mentor_subscriptions s
         WHERE student_id = $1
         ORDER BY expires_at DESC`,
        [sid],
    );
    console.log('\n=== SUBSCRIPTIONS (all mentors) ===');
    console.log(JSON.stringify(subs.rows, null, 2));

    if (mid) {
        const dupSubs = await pool.query(
            `SELECT id, started_at, expires_at, amount_paid, transaction_id, expires_at > NOW() AS active
             FROM student_mentor_subscriptions
             WHERE student_id = $1 AND mentor_id = $2
             ORDER BY expires_at DESC`,
            [sid, mid],
        );
        console.log('\n=== SUBS WITH THIS MENTOR (dup check) ===');
        console.log(JSON.stringify(dupSubs.rows, null, 2));
    }

    const pendingTx = await pool.query(
        `SELECT id, sender_id, receiver_id, amount, type, status, note, metadata, created_at
         FROM transactions
         WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'pending'
         ORDER BY created_at DESC LIMIT 20`,
        [sid],
    );
    console.log('\n=== PENDING TRANSACTIONS ===');
    console.log(JSON.stringify(pendingTx.rows, null, 2));

    const recentTx = await pool.query(
        `SELECT id, sender_id, receiver_id, amount, type, status, note, created_at
         FROM transactions
         WHERE sender_id = $1 OR receiver_id = $1
         ORDER BY created_at DESC LIMIT 15`,
        [sid],
    );
    console.log('\n=== RECENT TRANSACTIONS ===');
    console.log(JSON.stringify(recentTx.rows, null, 2));

    const deals = await pool.query(
        `SELECT id, chat_id, expert_id, client_id, amount, status, transaction_id, created_at, updated_at
         FROM listing_service_deals
         WHERE client_id = $1 OR expert_id = $1
         ORDER BY created_at DESC LIMIT 10`,
        [sid],
    );
    console.log('\n=== LISTING DEALS ===');
    console.log(JSON.stringify(deals.rows, null, 2));

    const parts = await pool.query(
        `SELECT c.id, c.type, c.name, c.creator_id, c.metadata
         FROM chat_participants cp
         JOIN chats c ON c.id = cp.chat_id
         WHERE cp.user_id = $1
         ORDER BY c.updated_at DESC NULLS LAST
         LIMIT 30`,
        [sid],
    );
    console.log('\n=== CHAT MEMBERSHIPS ===');
    for (const c of parts.rows) {
        const memCount = await pool.query(
            `SELECT COUNT(*)::int AS n FROM chat_participants WHERE chat_id = $1`,
            [c.id],
        );
        console.log({
            id: c.id,
            type: c.type,
            name: c.name,
            creator_id: c.creator_id,
            members: memCount.rows[0].n,
            meta_source: c.metadata?.source || null,
            is_creator: String(c.creator_id) === String(sid),
        });
    }

    if (mid) {
        const privateChat = await pool.query(
            `SELECT c.id, c.metadata FROM chats c
             JOIN chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = $1
             JOIN chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = $2
             WHERE c.type = 'private'`,
            [sid, mid],
        );
        console.log('\n=== PRIVATE CHATS WITH MENTOR ===');
        console.log(JSON.stringify(privateChat.rows, null, 2));

        for (const pc of privateChat.rows) {
            const msgs = await pool.query(
                `SELECT type, COUNT(*)::int AS n FROM messages WHERE chat_id = $1 GROUP BY type ORDER BY n DESC`,
                [pc.id],
            );
            console.log('message types in', pc.id, msgs.rows);
        }

        const groups = await pool.query(
            `SELECT c.id, c.name, c.creator_id,
                    EXISTS(SELECT 1 FROM chat_participants cp WHERE cp.chat_id = c.id AND cp.user_id = $2) AS student_member
             FROM chats c
             WHERE c.type = 'group' AND c.creator_id = $1`,
            [mid, sid],
        );
        console.log('\n=== MENTOR GROUPS + MEMBERSHIP ===');
        console.log(JSON.stringify(groups.rows, null, 2));

        for (const g of groups.rows) {
            if (!g.student_member) continue;
            const lesson = await pool.query(
                `SELECT id, type, created_at, metadata->>'invite_status' AS invite_status
                 FROM messages
                 WHERE chat_id = $1 AND type IN ('lesson_start','lesson_end')
                 ORDER BY created_at DESC LIMIT 5`,
                [g.id],
            );
            console.log(`\nlesson msgs in ${g.name}:`, lesson.rows);
        }
    }

    const crypto = await pool.query(
        `SELECT user_id, alg, length(public_key) AS key_len, updated_at FROM user_crypto_keys WHERE user_id = $1`,
        [sid],
    );
    console.log('\n=== CRYPTO KEYS ===');
    console.log(JSON.stringify(crypto.rows, null, 2));

    const sessions = await pool.query(
        `SELECT id, chat_id, expert_id, client_id, status, amount_mali, created_at
         FROM service_sessions
         WHERE client_id = $1 OR expert_id = $1
         ORDER BY id DESC LIMIT 10`,
        [sid],
    ).catch((e) => ({ rows: [], error: e.message }));
    console.log('\n=== SERVICE SESSIONS ===');
    console.log(JSON.stringify((sessions as any).rows ?? sessions, null, 2));
    if ((sessions as any).error) console.log('service_sessions error:', (sessions as any).error);

    // Orphan / inconsistency checks
    console.log('\n=== INCONSISTENCY CHECKS ===');
    const orphanSubs = await pool.query(
        `SELECT s.id FROM student_mentor_subscriptions s
         LEFT JOIN users u1 ON u1.id = s.student_id
         LEFT JOIN users u2 ON u2.id = s.mentor_id
         WHERE s.student_id = $1 AND (u1.id IS NULL OR u2.id IS NULL)`,
        [sid],
    );
    console.log('orphan subscriptions:', orphanSubs.rows);

    const orphanParts = await pool.query(
        `SELECT cp.chat_id FROM chat_participants cp
         LEFT JOIN chats c ON c.id = cp.chat_id
         WHERE cp.user_id = $1 AND c.id IS NULL`,
        [sid],
    );
    console.log('orphan chat_participants:', orphanParts.rows);

    const lockedMismatch = await pool.query(
        `SELECT
            COALESCE((SELECT locked_balance FROM token_balances WHERE user_id = $1), 0) AS locked,
            COALESCE((
              SELECT SUM(amount)::numeric FROM transactions
              WHERE sender_id = $1 AND status = 'pending' AND type = 'booking'
            ), 0) AS pending_booking_sum`,
        [sid],
    );
    console.log('locked_balance vs pending booking sum:', lockedMismatch.rows[0]);

    const uniqueConstraint = await pool.query(
        `SELECT indexname, indexdef FROM pg_indexes
         WHERE tablename = 'student_mentor_subscriptions'`,
    );
    console.log('\nsubscription indexes:', uniqueConstraint.rows);
}

main()
    .catch(console.error)
    .finally(() => pool.end());
