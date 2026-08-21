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
const dealId = 'd30ce5b3-e341-4cc2-b7ef-ae537f0179a0';
const txId = 'dd578bf6-7dd4-4c2d-ada2-f6abba97cc19';

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const tx = await client.query(
            `SELECT id, amount, status, sender_id FROM transactions WHERE id = $1 FOR UPDATE`,
            [txId],
        );
        const row = tx.rows[0];
        if (!row || row.status !== 'pending') {
            console.log('tx already processed', row);
            await client.query('ROLLBACK');
            return;
        }
        const amount = parseFloat(row.amount);
        await client.query(
            `UPDATE token_balances
             SET balance = balance + $1, locked_balance = locked_balance - $1
             WHERE user_id = $2`,
            [amount, sid],
        );
        await client.query(`UPDATE transactions SET status = 'cancelled' WHERE id = $1`, [txId]);
        await client.query(
            `UPDATE listing_service_deals SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [dealId],
        );
        await client.query('COMMIT');
        console.log('refunded orphan escrow', amount);

        const bal = await pool.query(
            `SELECT balance, locked_balance FROM token_balances WHERE user_id = $1`,
            [sid],
        );
        console.log('balance now', bal.rows[0]);
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
}

main()
    .catch(console.error)
    .finally(() => pool.end());
