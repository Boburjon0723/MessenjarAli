import { Pool } from 'pg';
import * as dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ override: true });
}

// PostgreSQL Connection
const isProduction = process.env.NODE_ENV === 'production';
const dbUrl = process.env.DATABASE_URL || '';
const useSsl = Boolean(dbUrl) && !/localhost|127\.0\.0\.1/i.test(dbUrl);
const pool = new Pool({
    connectionString: dbUrl || undefined,
    ssl: useSsl ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' } : false,
    connectionTimeoutMillis: 30000, // Increase to 30s
    idleTimeoutMillis: 30000,
    max: 20, // Increase pool size
});

// Test connection immediately
(async () => {
    try {
        const client = await pool.connect();
        if (!isProduction) {
            console.log('Successfully connected to PostgreSQL database (Test Query)');
        }
        client.release();
    } catch (err) {
        console.error('FAILED to connect to PostgreSQL database:', err);
    }
})();

pool.on('connect', () => {
    // console.log('PostgreSQL client connected');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client (will handle automatically):', err);
    // Do NOT exit the process. The pool will handle creating new connections.
});

const query = (text: string, params?: any) => pool.query(text, params);

export { pool, query };
