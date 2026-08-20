
import { pool } from '../config/database';
import bcrypt from 'bcryptjs';

async function ensureAdminUser() {
    const client = await pool.connect();
    try {
        console.log('Ensuring Admin User exists...');

        const email = 'bs4731451@gmail.com';
        const phone = '+998950203601';
        const passwordPlain = '03012004s';
        const hashedPassword = await bcrypt.hash(passwordPlain, 10);

        // Check if user exists by email OR phone
        const existingRes = await client.query(
            "SELECT * FROM users WHERE email = $1 OR phone = $2",
            [email, phone]
        );

        if (existingRes.rows.length > 0) {
            const user = existingRes.rows[0];
            console.log(`User found (ID: ${user.id}). Updating to Admin...`);

            await client.query(`
                UPDATE users 
                SET password_hash = $1, role = 'admin', email = $2, phone = $3, name = 'Admin', surname = 'Super',
                    is_active = true, phone_verified = true
                WHERE id = $4
            `, [hashedPassword, email, phone, user.id]);

            // Ensure wallet exists (token_balances — asosiy wallet jadvali)
            await client.query(
                'INSERT INTO token_balances (user_id, balance, locked_balance) VALUES ($1, 0, 0) ON CONFLICT DO NOTHING',
                [user.id]
            ).catch(() => {});

        } else {
            console.log('Creating new Admin User...');
            const newUser = await client.query(`
                INSERT INTO users (name, surname, email, phone, password_hash, role, is_active, phone_verified)
                VALUES ('Admin', 'Super', $1, $2, $3, 'admin', true, true)
                RETURNING id
            `, [email, phone, hashedPassword]);

            const newUserId = newUser.rows[0].id;
            await client.query(
                'INSERT INTO token_balances (user_id, balance, locked_balance) VALUES ($1, 0, 0) ON CONFLICT DO NOTHING',
                [newUserId]
            ).catch(() => {});
        }

        console.log('Admin User Secured.');
        process.exit(0);

    } catch (error) {
        console.error('Failed to ensure admin:', error);
        process.exit(1);
    } finally {
        client.release();
    }
}

ensureAdminUser();
