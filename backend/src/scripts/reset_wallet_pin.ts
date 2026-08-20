process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function resetWalletPin(phone: string, newPin: string) {
    if (!newPin || newPin.length !== 4 || Number.isNaN(Number(newPin))) {
        console.error('PIN must be a 4-digit number');
        process.exit(1);
    }

    try {
        console.log(`Looking up user: ${phone}`);
        const userRes = await pool.query(
            'SELECT id, name, surname, phone FROM users WHERE phone = $1',
            [phone],
        );

        if (userRes.rows.length === 0) {
            console.error('User not found');
            process.exit(1);
        }

        const user = userRes.rows[0];
        console.log(`User: ${user.name || ''} ${user.surname || ''} (${user.id})`);

        const salt = await bcrypt.genSalt(10);
        const pinHash = await bcrypt.hash(newPin, salt);

        const walletRes = await pool.query(
            'SELECT balance, pin_hash IS NOT NULL AS had_pin FROM token_balances WHERE user_id = $1',
            [user.id],
        );

        if (walletRes.rows.length === 0) {
            await pool.query(
                'INSERT INTO token_balances (user_id, balance, locked_balance, pin_hash) VALUES ($1, 0, 0, $2)',
                [user.id, pinHash],
            );
            console.log('Created wallet row with new PIN');
        } else {
            await pool.query(
                'UPDATE token_balances SET pin_hash = $1, updated_at = NOW() WHERE user_id = $2',
                [pinHash, user.id],
            );
            console.log(`Wallet PIN reset (had_pin=${walletRes.rows[0].had_pin}, balance=${walletRes.rows[0].balance})`);
        }

        const settingsRes = await pool.query(
            'SELECT admin_card_number FROM platform_settings ORDER BY updated_at DESC LIMIT 1',
        );
        const adminCard = settingsRes.rows[0]?.admin_card_number;
        console.log(`Admin card configured: ${adminCard ? 'yes' : 'NO — set in admin panel'}`);

        console.log(`✅ Wallet PIN for ${phone} is now: ${newPin}`);
    } catch (e) {
        console.error(e);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

const phoneArg = process.argv[2] || '+998950203601';
const pinArg = process.argv[3] || '3601';
resetWalletPin(phoneArg, pinArg);
