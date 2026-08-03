import crypto from 'crypto';
import { pool } from '../config/database';
import {
    encryptSettlementSecret,
    newSettlementSecret,
} from '../middleware/settlementAuth.middleware';

const COMMISSION_RATE = Number(process.env.SETTLEMENT_COMMISSION_RATE || 0.01); // 1% B2B

export class SettlementService {
    static async linkCompanyWallet(params: {
        axisCompanyId: string;
        ownerUserId: string;
        companyName?: string;
    }) {
        const axisCompanyId = String(params.axisCompanyId || '').trim();
        if (!axisCompanyId) throw new Error('axisCompanyId required');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await client.query(
                `SELECT cw.id, l.key_id
                 FROM company_wallets cw
                 LEFT JOIN settlement_wallet_links l
                   ON l.company_wallet_id = cw.id AND l.status = 'active'
                 WHERE cw.axis_company_id = $1
                 LIMIT 1`,
                [axisCompanyId]
            );
            if (existing.rows[0]) {
                throw new Error('Company wallet already linked');
            }

            const walletRes = await client.query(
                `INSERT INTO company_wallets
                    (axis_company_id, owner_user_id, company_name, balance, locked_balance, status)
                 VALUES ($1, $2, $3, 0, 0, 'active')
                 RETURNING *`,
                [axisCompanyId, params.ownerUserId, params.companyName || null]
            );
            const wallet = walletRes.rows[0];
            const { keyId, secret } = newSettlementSecret();

            await client.query(
                `INSERT INTO settlement_wallet_links
                    (company_wallet_id, axis_company_id, key_id, hmac_secret_hash, status)
                 VALUES ($1, $2, $3, $4, 'active')`,
                [wallet.id, axisCompanyId, keyId, encryptSettlementSecret(secret)]
            );

            await client.query('COMMIT');
            return {
                companyWalletId: wallet.id,
                axisCompanyId,
                keyId,
                hmacSecret: secret, // returned once
                balance: 0,
                lockedBalance: 0,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async getBalanceByAxisCompanyId(axisCompanyId: string) {
        const res = await pool.query(
            `SELECT id, axis_company_id, balance, locked_balance, status, lifetime_earned, lifetime_spent
             FROM company_wallets WHERE axis_company_id = $1 LIMIT 1`,
            [axisCompanyId]
        );
        const row = res.rows[0];
        if (!row) throw new Error('Company wallet not found');
        return {
            companyWalletId: row.id,
            axisCompanyId: row.axis_company_id,
            balance: Number(row.balance),
            lockedBalance: Number(row.locked_balance),
            status: row.status,
            lifetimeEarned: Number(row.lifetime_earned),
            lifetimeSpent: Number(row.lifetime_spent),
        };
    }

    static async hold(params: {
        axisOrderId: string;
        buyerCompanyId: string;
        sellerCompanyId: string;
        amount: number;
        idempotencyKey: string;
    }) {
        const amount = Number(params.amount);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('amount must be positive');
        if (!params.idempotencyKey) throw new Error('idempotencyKey required');

        const existing = await this.findByIdempotency(params.idempotencyKey);
        if (existing) return this.formatTx(existing);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const buyer = await client.query(
                `SELECT * FROM company_wallets WHERE axis_company_id = $1 FOR UPDATE`,
                [params.buyerCompanyId]
            );
            const seller = await client.query(
                `SELECT * FROM company_wallets WHERE axis_company_id = $1 FOR UPDATE`,
                [params.sellerCompanyId]
            );
            if (!buyer.rows[0] || buyer.rows[0].status !== 'active') {
                throw new Error('Buyer company wallet missing or inactive');
            }
            if (!seller.rows[0] || seller.rows[0].status !== 'active') {
                throw new Error('Seller company wallet missing or inactive');
            }
            if (Number(buyer.rows[0].balance) < amount) {
                throw new Error('Insufficient company wallet balance');
            }

            await client.query(
                `UPDATE company_wallets
                 SET balance = balance - $1,
                     locked_balance = locked_balance + $1,
                     lifetime_spent = lifetime_spent + $1,
                     updated_at = NOW()
                 WHERE id = $2`,
                [amount, buyer.rows[0].id]
            );

            const txId = crypto.randomUUID();
            const tx = await client.query(
                `INSERT INTO settlement_transactions
                    (id, type, status, axis_order_id, buyer_company_id, seller_company_id,
                     buyer_wallet_id, seller_wallet_id, amount, commission_rate, commission_amount,
                     net_amount, idempotency_key, metadata)
                 VALUES ($1,'hold','held',$2,$3,$4,$5,$6,$7,$8,0,$7,$9,$10::jsonb)
                 RETURNING *`,
                [
                    txId,
                    params.axisOrderId,
                    params.buyerCompanyId,
                    params.sellerCompanyId,
                    buyer.rows[0].id,
                    seller.rows[0].id,
                    amount,
                    COMMISSION_RATE,
                    params.idempotencyKey,
                    JSON.stringify({}),
                ]
            );

            await client.query('COMMIT');
            return this.formatTx(tx.rows[0]);
        } catch (error: any) {
            await client.query('ROLLBACK');
            if (error?.code === '23505') {
                const again = await this.findByIdempotency(params.idempotencyKey);
                if (again) return this.formatTx(again);
            }
            throw error;
        } finally {
            client.release();
        }
    }

    static async release(params: { axisOrderId?: string; idempotencyKey: string; amount?: number }) {
        const existing = await this.findByIdempotency(params.idempotencyKey);
        if (existing) return this.formatTx(existing);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const holdRes = await client.query(
                `SELECT * FROM settlement_transactions
                 WHERE axis_order_id = $1 AND type = 'hold' AND status = 'held'
                 ORDER BY created_at DESC
                 LIMIT 1
                 FOR UPDATE`,
                [params.axisOrderId]
            );
            const hold = holdRes.rows[0];
            if (!hold) throw new Error('Held settlement not found for order');

            const releaseAmount =
                params.amount != null && Number.isFinite(Number(params.amount))
                    ? Number(params.amount)
                    : Number(hold.amount);
            if (releaseAmount <= 0 || releaseAmount > Number(hold.amount)) {
                throw new Error('Invalid release amount');
            }

            const commission = Math.round(releaseAmount * COMMISSION_RATE * 10000) / 10000;
            const net = releaseAmount - commission;

            await client.query(
                `UPDATE company_wallets
                 SET locked_balance = locked_balance - $1, updated_at = NOW()
                 WHERE id = $2`,
                [releaseAmount, hold.buyer_wallet_id]
            );
            await client.query(
                `UPDATE company_wallets
                 SET balance = balance + $1,
                     lifetime_earned = lifetime_earned + $1,
                     updated_at = NOW()
                 WHERE id = $2`,
                [net, hold.seller_wallet_id]
            );

            // Platform treasury (user_id null system account tracked in platform_settings if present)
            await client.query(
                `UPDATE platform_settings
                 SET value = (COALESCE(value::numeric, 0) + $1)::text
                 WHERE key = 'system_treasury_balance'`,
                [commission]
            ).catch(() => undefined);

            const remaining = Number(hold.amount) - releaseAmount;
            if (remaining <= 0) {
                await client.query(
                    `UPDATE settlement_transactions SET status = 'released', updated_at = NOW() WHERE id = $1`,
                    [hold.id]
                );
            } else {
                await client.query(
                    `UPDATE settlement_transactions
                     SET amount = $1, updated_at = NOW(),
                         metadata = COALESCE(metadata, '{}'::jsonb) || $2::jsonb
                     WHERE id = $3`,
                    [remaining, JSON.stringify({ partial_released: releaseAmount }), hold.id]
                );
            }

            const tx = await client.query(
                `INSERT INTO settlement_transactions
                    (id, type, status, axis_order_id, buyer_company_id, seller_company_id,
                     buyer_wallet_id, seller_wallet_id, amount, commission_rate, commission_amount,
                     net_amount, idempotency_key, related_hold_id, metadata)
                 VALUES ($1,'release','released',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
                 RETURNING *`,
                [
                    crypto.randomUUID(),
                    hold.axis_order_id,
                    hold.buyer_company_id,
                    hold.seller_company_id,
                    hold.buyer_wallet_id,
                    hold.seller_wallet_id,
                    releaseAmount,
                    COMMISSION_RATE,
                    commission,
                    net,
                    params.idempotencyKey,
                    hold.id,
                    JSON.stringify({}),
                ]
            );

            await client.query('COMMIT');
            return this.formatTx(tx.rows[0]);
        } catch (error: any) {
            await client.query('ROLLBACK');
            if (error?.code === '23505') {
                const again = await this.findByIdempotency(params.idempotencyKey);
                if (again) return this.formatTx(again);
            }
            throw error;
        } finally {
            client.release();
        }
    }

    static async refund(params: { axisOrderId?: string; idempotencyKey: string }) {
        const existing = await this.findByIdempotency(params.idempotencyKey);
        if (existing) return this.formatTx(existing);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const holdRes = await client.query(
                `SELECT * FROM settlement_transactions
                 WHERE axis_order_id = $1 AND type = 'hold' AND status = 'held'
                 ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
                [params.axisOrderId]
            );
            const hold = holdRes.rows[0];
            if (!hold) throw new Error('Held settlement not found for order');

            const amount = Number(hold.amount);
            await client.query(
                `UPDATE company_wallets
                 SET locked_balance = locked_balance - $1,
                     balance = balance + $1,
                     lifetime_spent = GREATEST(lifetime_spent - $1, 0),
                     updated_at = NOW()
                 WHERE id = $2`,
                [amount, hold.buyer_wallet_id]
            );
            await client.query(
                `UPDATE settlement_transactions SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
                [hold.id]
            );

            const tx = await client.query(
                `INSERT INTO settlement_transactions
                    (id, type, status, axis_order_id, buyer_company_id, seller_company_id,
                     buyer_wallet_id, seller_wallet_id, amount, commission_rate, commission_amount,
                     net_amount, idempotency_key, related_hold_id, metadata)
                 VALUES ($1,'refund','refunded',$2,$3,$4,$5,$6,$7,$8,0,$7,$9,$10,$11::jsonb)
                 RETURNING *`,
                [
                    crypto.randomUUID(),
                    hold.axis_order_id,
                    hold.buyer_company_id,
                    hold.seller_company_id,
                    hold.buyer_wallet_id,
                    hold.seller_wallet_id,
                    amount,
                    COMMISSION_RATE,
                    params.idempotencyKey,
                    hold.id,
                    JSON.stringify({}),
                ]
            );

            await client.query('COMMIT');
            return this.formatTx(tx.rows[0]);
        } catch (error: any) {
            await client.query('ROLLBACK');
            if (error?.code === '23505') {
                const again = await this.findByIdempotency(params.idempotencyKey);
                if (again) return this.formatTx(again);
            }
            throw error;
        } finally {
            client.release();
        }
    }

    static async findTransactions(filters: {
        companyId?: string;
        orderId?: string;
        idempotencyKey?: string;
    }) {
        const clauses: string[] = [];
        const values: unknown[] = [];
        if (filters.idempotencyKey) {
            values.push(filters.idempotencyKey);
            clauses.push(`idempotency_key = $${values.length}`);
        }
        if (filters.orderId) {
            values.push(filters.orderId);
            clauses.push(`axis_order_id = $${values.length}`);
        }
        if (filters.companyId) {
            values.push(filters.companyId);
            clauses.push(`(buyer_company_id = $${values.length} OR seller_company_id = $${values.length})`);
        }
        const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
        const res = await pool.query(
            `SELECT * FROM settlement_transactions ${where} ORDER BY created_at DESC LIMIT 100`,
            values
        );
        return res.rows.map((r) => this.formatTx(r));
    }

    private static async findByIdempotency(key: string) {
        const res = await pool.query(
            `SELECT * FROM settlement_transactions WHERE idempotency_key = $1 LIMIT 1`,
            [key]
        );
        return res.rows[0] || null;
    }

    private static formatTx(row: any) {
        return {
            id: row.id,
            type: row.type,
            status: row.status,
            axisOrderId: row.axis_order_id,
            buyerCompanyId: row.buyer_company_id,
            sellerCompanyId: row.seller_company_id,
            amount: Number(row.amount),
            commissionRate: Number(row.commission_rate),
            commissionAmount: Number(row.commission_amount || 0),
            netAmount: Number(row.net_amount || row.amount),
            idempotencyKey: row.idempotency_key,
            relatedHoldId: row.related_hold_id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
