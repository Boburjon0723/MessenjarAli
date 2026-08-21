process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

/**
 * O'chirilgan foydalanuvchilar qatnashgan shaxsiy chatlar va kontaktlarni tozalash.
 */
async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1) Kontaktlar: users jadvalida yo'q / nofaol
        const delContacts = await client.query(`
            DELETE FROM user_contacts uc
            WHERE NOT EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = uc.contact_user_id AND COALESCE(u.is_active, true) = true
            )
            RETURNING id
        `);
        console.log('Deleted stale contacts:', delContacts.rowCount);

        // 2) chat_participants: users yo'q
        const delParts = await client.query(`
            DELETE FROM chat_participants cp
            WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cp.user_id)
            RETURNING chat_id, user_id
        `);
        console.log('Deleted orphan participants:', delParts.rowCount);

        // 3) Bo'sh chatlar
        const emptyChats = await client.query(`
            SELECT c.id FROM chats c
            WHERE NOT EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.chat_id = c.id)
        `);
        for (const row of emptyChats.rows) {
            await client.query(`DELETE FROM messages WHERE chat_id = $1`, [row.id]).catch(() => {});
            await client.query(`DELETE FROM chats WHERE id = $1`, [row.id]);
        }
        console.log('Deleted empty chats:', emptyChats.rowCount);

        // 4) Shaxsiy chatlar: faqat 1 ta ishtirokchi qolgan (sherik o'chirilgan)
        const lonely = await client.query(`
            SELECT c.id
            FROM chats c
            WHERE c.type = 'private'
              AND (
                SELECT COUNT(*) FROM chat_participants cp WHERE cp.chat_id = c.id
              ) < 2
        `);
        for (const row of lonely.rows) {
            await client.query(`DELETE FROM chat_participants WHERE chat_id = $1`, [row.id]);
            await client.query(`DELETE FROM messages WHERE chat_id = $1`, [row.id]).catch(() => {});
            await client.query(`DELETE FROM chats WHERE id = $1`, [row.id]);
        }
        console.log('Deleted lonely private chats:', lonely.rowCount);

        // 5) Shaxsiy chat: ishtirokchilardan biri users da yo'q
        const broken = await client.query(`
            SELECT DISTINCT c.id
            FROM chats c
            JOIN chat_participants cp ON cp.chat_id = c.id
            WHERE c.type = 'private'
              AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cp.user_id AND COALESCE(u.is_active, true) = true)
        `);
        for (const row of broken.rows) {
            await client.query(`DELETE FROM chat_participants WHERE chat_id = $1`, [row.id]);
            await client.query(`DELETE FROM messages WHERE chat_id = $1`, [row.id]).catch(() => {});
            await client.query(`DELETE FROM chats WHERE id = $1`, [row.id]);
        }
        console.log('Deleted broken private chats:', broken.rowCount);

        await client.query('COMMIT');
        console.log('Cleanup done.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        process.exitCode = 1;
    } finally {
        client.release();
        try {
            const { safeClearCache } = await import('../config/redis');
            await safeClearCache('user_chats:*');
            console.log('Flushed Redis user_chats:*');
        } catch (e) {
            console.warn('Redis flush skipped:', e);
        }
        await pool.end();
    }
}

main();
