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
    const studentPhone = process.argv[2] || '+998943464428';
    const mentorPhone = process.argv[3] || '+998950203601';

    const users = await pool.query(
        'SELECT id, name, surname, phone, role, is_active FROM users WHERE phone = ANY($1)',
        [[studentPhone, mentorPhone]],
    );
    const student = users.rows.find((r) => r.phone === studentPhone);
    const mentor = users.rows.find((r) => r.phone === mentorPhone);

    console.log('STUDENT:', student);
    console.log('MENTOR:', mentor);
    if (!student || !mentor) return;

    const subs = await pool.query(
        `SELECT id, started_at, expires_at, amount_paid, expires_at > NOW() AS active
         FROM student_mentor_subscriptions
         WHERE student_id = $1 AND mentor_id = $2
         ORDER BY expires_at DESC`,
        [student.id, mentor.id],
    );
    console.log('\nSUBSCRIPTIONS:', subs.rows);

    const groups = await pool.query(
        `SELECT c.id, c.name FROM chats c
         WHERE c.type = 'group' AND c.creator_id = $1`,
        [mentor.id],
    );
    console.log('\nMENTOR GROUPS:', groups.rows);

    for (const g of groups.rows) {
        const mem = await pool.query(
            `SELECT u.id, u.phone, u.name, u.surname
             FROM chat_participants cp
             JOIN users u ON u.id = cp.user_id
             WHERE cp.chat_id = $1`,
            [g.id],
        );
        const isMember = mem.rows.some((m) => m.id === student.id);
        console.log(`\nGROUP "${g.name}" (${g.id}):`);
        console.log('  members:', mem.rows.map((m) => `${m.name} ${m.phone}`));
        console.log('  student in group:', isMember);

        const lessonStarts = await pool.query(
            `SELECT id, type, metadata, created_at FROM messages
             WHERE chat_id = $1 AND type = 'lesson_start'
             ORDER BY created_at DESC LIMIT 3`,
            [g.id],
        );
        console.log('  recent lesson_start:', lessonStarts.rows.length);
    }

    const privateChat = await pool.query(
        `SELECT c.id FROM chats c
         JOIN chat_participants p1 ON p1.chat_id = c.id AND p1.user_id = $1
         JOIN chat_participants p2 ON p2.chat_id = c.id AND p2.user_id = $2
         WHERE c.type = 'private' LIMIT 1`,
        [student.id, mentor.id],
    );
    console.log('\nPRIVATE CHAT:', privateChat.rows[0]?.id || 'none');

    if (privateChat.rows[0]) {
        const invites = await pool.query(
            `SELECT id, type, content, metadata, created_at FROM messages
             WHERE chat_id = $1 AND type = 'group_join_invite'
             ORDER BY created_at DESC LIMIT 5`,
            [privateChat.rows[0].id],
        );
        console.log('GROUP JOIN INVITES in private chat:', invites.rows);
    }
}

main()
    .catch(console.error)
    .finally(() => pool.end());
