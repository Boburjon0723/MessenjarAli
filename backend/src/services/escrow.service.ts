import { pool } from '../config/database';
import { EscrowModel } from '../models/postgres/Escrow';
import { TransactionModel } from '../models/postgres/Transaction';

async function assertBalanceUpdate(result: { rowCount?: number | null }, label: string) {
    if (!result.rowCount) {
        throw new Error(`Balance update failed: ${label}`);
    }
}

async function ensureTokenBalanceRow(client: any, userId: string) {
    await client.query(
        `INSERT INTO token_balances (user_id, balance, locked_balance, lifetime_earned, lifetime_spent)
         VALUES ($1, 0, 0, 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
    );
}

export class EscrowService {
    private static COMMISSION_RATE = parseFloat(process.env.SERVICE_COMMISSION_PERCENTAGE || '0.05');

    static async resolveProviderId(escrow: any, client?: any): Promise<string | null> {
        const db = client || pool;
        let providerId: string | null = null;
        if (escrow.booking_id) {
            const bookingRes = await db.query('SELECT provider_id FROM bookings WHERE id = $1', [escrow.booking_id]);
            providerId = bookingRes.rows[0]?.provider_id || null;
        } else if (escrow.metadata?.session_id) {
            const sessionRes = await db.query('SELECT expert_id FROM service_sessions WHERE id = $1', [
                escrow.metadata.session_id,
            ]);
            providerId = sessionRes.rows[0]?.expert_id || null;
        } else if (escrow.service_id) {
            const serviceRes = await db.query('SELECT provider_id FROM services WHERE id = $1', [escrow.service_id]);
            providerId = serviceRes.rows[0]?.provider_id || null;
        }
        return providerId;
    }

    static async assertEscrowActor(
        escrowId: string,
        userId: string,
        action: 'release' | 'refund',
        isAdmin: boolean
    ): Promise<{ escrow: any; providerId: string | null }> {
        const escrow = await EscrowModel.findById(null, escrowId);
        if (!escrow) throw new Error('Escrow record not found');
        if (escrow.status !== 'held') throw new Error(`Escrow status is ${escrow.status}, cannot ${action}`);

        const providerId = await this.resolveProviderId(escrow);
        const isBuyer = String(escrow.user_id) === String(userId);
        const isProvider = providerId != null && String(providerId) === String(userId);

        if (action === 'release') {
            if (!isBuyer && !isAdmin) {
                throw new Error('Faqat xaridor (yoki admin) mablag‘ni chiqarishi mumkin');
            }
        } else if (!isProvider && !isAdmin && !isBuyer) {
            throw new Error('Faqat provider, xaridor yoki admin refund qilishi mumkin');
        }

        return { escrow, providerId };
    }

    static async holdFunds(
        userId: string,
        amount: number,
        reference: { serviceId?: string; bookingId?: string; sessionId?: string }
    ) {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number');
        }
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await ensureTokenBalanceRow(client, userId);

            const userBalanceRes = await client.query(
                'SELECT balance FROM token_balances WHERE user_id = $1 FOR UPDATE',
                [userId]
            );
            const userBalance = userBalanceRes.rows[0];

            if (!userBalance || parseFloat(userBalance.balance) < amount) {
                throw new Error('Insufficient funds to hold in escrow');
            }

            const debit = await client.query(
                `UPDATE token_balances 
                 SET balance = balance - $1, 
                     locked_balance = locked_balance + $1 
                 WHERE user_id = $2 AND balance >= $1`,
                [amount, userId]
            );
            await assertBalanceUpdate(debit, 'hold debit');

            const escrow = await EscrowModel.create(client, {
                user_id: userId,
                service_id: reference.serviceId,
                booking_id: reference.bookingId,
                amount: amount,
                metadata: { session_id: reference.sessionId },
            });

            await TransactionModel.create(client, {
                sender_id: userId,
                receiver_id: null,
                amount: amount,
                fee: 0,
                net_amount: amount,
                type: 'escrow_hold',
                status: 'completed',
                reference_type: reference.sessionId
                    ? 'session'
                    : reference.bookingId
                      ? 'booking'
                      : 'service',
                reference_id: reference.sessionId || reference.bookingId || reference.serviceId,
                note: `Funds held for ${reference.sessionId ? 'session' : 'service'}`,
            });

            await client.query('COMMIT');
            return escrow;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async releaseFunds(escrowId: string) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const escrowRes = await client.query('SELECT * FROM escrow WHERE id = $1 FOR UPDATE', [escrowId]);
            const escrow = escrowRes.rows[0];

            if (!escrow) throw new Error('Escrow record not found');
            if (escrow.status !== 'held') throw new Error(`Escrow status is ${escrow.status}, cannot release`);

            const providerId = await this.resolveProviderId(escrow, client);
            if (!providerId) throw new Error('Provider not found for escrow release');

            const amount = parseFloat(escrow.amount);
            const commission = amount * this.COMMISSION_RATE;
            const netAmount = amount - commission;

            await ensureTokenBalanceRow(client, escrow.user_id);
            await ensureTokenBalanceRow(client, providerId);

            const unlock = await client.query(
                `UPDATE token_balances 
                 SET locked_balance = locked_balance - $1,
                     lifetime_spent = lifetime_spent + $1
                 WHERE user_id = $2 AND locked_balance >= $1`,
                [amount, escrow.user_id]
            );
            await assertBalanceUpdate(unlock, 'release unlock buyer');

            const credit = await client.query(
                `UPDATE token_balances 
                 SET balance = balance + $1, 
                     lifetime_earned = lifetime_earned + $1 
                 WHERE user_id = $2`,
                [netAmount, providerId]
            );
            await assertBalanceUpdate(credit, 'release credit provider');

            await client.query(
                `UPDATE platform_balance 
                 SET balance = balance + $1, 
                     total_commissions_collected = total_commissions_collected + $1 
                 WHERE id = 1`,
                [commission]
            );

            const updatedEscrow = await EscrowModel.updateStatus(client, escrowId, 'released');

            await TransactionModel.create(client, {
                sender_id: escrow.user_id,
                receiver_id: providerId,
                amount: amount,
                fee: commission,
                net_amount: netAmount,
                type: 'escrow_release',
                status: 'completed',
                reference_type: 'escrow',
                reference_id: escrowId,
                note: `Funds released for ${escrow.booking_id ? 'booking' : 'session'}`,
            });

            await client.query('COMMIT');
            return updatedEscrow;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async refundFunds(escrowId: string) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            const escrowRes = await client.query('SELECT * FROM escrow WHERE id = $1 FOR UPDATE', [escrowId]);
            const escrow = escrowRes.rows[0];

            if (!escrow) throw new Error('Escrow record not found');
            if (escrow.status !== 'held') throw new Error(`Escrow status is ${escrow.status}, cannot refund`);

            const amount = parseFloat(escrow.amount);
            await ensureTokenBalanceRow(client, escrow.user_id);

            const refund = await client.query(
                `UPDATE token_balances 
             SET locked_balance = locked_balance - $1,
                 balance = balance + $1
             WHERE user_id = $2 AND locked_balance >= $1`,
                [amount, escrow.user_id]
            );
            await assertBalanceUpdate(refund, 'refund unlock');

            const updatedEscrow = await EscrowModel.updateStatus(client, escrowId, 'refunded');

            await TransactionModel.create(client, {
                sender_id: escrow.user_id,
                receiver_id: escrow.user_id,
                amount: amount,
                fee: 0,
                net_amount: amount,
                type: 'refund',
                status: 'completed',
                reference_type: 'escrow',
                reference_id: escrowId,
                note: `Funds refunded for service ${escrow.service_id}`,
            });

            await client.query('COMMIT');
            return updatedEscrow;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}
