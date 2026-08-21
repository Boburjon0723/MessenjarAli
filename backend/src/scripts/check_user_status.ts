process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function checkUser(phone: string) {
    const userRes = await pool.query(
        'SELECT id, name, surname, phone, role, is_active, phone_verified, created_at FROM users WHERE phone = $1',
        [phone],
    );

    if (userRes.rows.length === 0) {
        console.log(`❌ Foydalanuvchi topilmadi: ${phone}`);
        return;
    }

    const u = userRes.rows[0];
    const blockedByRes = await pool.query(
        `SELECT ub.blocker_id, u.name, u.surname, u.phone
         FROM user_blocks ub
         JOIN users u ON u.id = ub.blocker_id
         WHERE ub.blocked_id = $1`,
        [u.id],
    );
    const blocksOthersRes = await pool.query(
        `SELECT ub.blocked_id, u.name, u.surname, u.phone
         FROM user_blocks ub
         JOIN users u ON u.id = ub.blocked_id
         WHERE ub.blocker_id = $1`,
        [u.id],
    );
    const walletRes = await pool.query(
        'SELECT balance, locked_balance, pin_hash IS NOT NULL AS has_pin FROM token_balances WHERE user_id = $1',
        [u.id],
    );

    const platformBlocked = u.is_active === false;

    console.log(`\n📱 Telefon: ${u.phone}`);
    console.log(`👤 Ism: ${u.name || ''} ${u.surname || ''}`.trim());
    console.log(`🆔 ID: ${u.id}`);
    console.log(`🔑 Rol: ${u.role}`);
    console.log(`📅 Yaratilgan: ${u.created_at}`);
    console.log(`✅ Platforma bloklanganmi: ${platformBlocked ? 'HA (is_active=false)' : "YO'Q"}`);
    console.log(`📞 Telefon tasdiqlangan: ${u.phone_verified ? 'ha' : "yo'q"}`);
    console.log(`💰 Hamyon: ${walletRes.rows[0] ? `${walletRes.rows[0].balance} MALI (locked: ${walletRes.rows[0].locked_balance}, PIN: ${walletRes.rows[0].has_pin ? 'bor' : 'yo\'q'})` : 'yo\'q'}`);

    if (blockedByRes.rows.length > 0) {
        console.log(`\n🚫 Boshqalar tomonidan bloklangan (${blockedByRes.rows.length} ta):`);
        blockedByRes.rows.forEach((r) => {
            console.log(`   - ${r.name || ''} ${r.surname || ''} (${r.phone})`);
        });
    } else {
        console.log("\n🚫 Boshqalar tomonidan bloklangan: yo'q");
    }

    if (blocksOthersRes.rows.length > 0) {
        console.log(`\n⛔ U bloklagan foydalanuvchilar (${blocksOthersRes.rows.length} ta):`);
        blocksOthersRes.rows.forEach((r) => {
            console.log(`   - ${r.name || ''} ${r.surname || ''} (${r.phone})`);
        });
    }
}

const phoneArg = process.argv[2] || '+998943464428';
checkUser(phoneArg)
    .catch(console.error)
    .finally(() => pool.end());
