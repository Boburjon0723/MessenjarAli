import { pool } from '../../config/database';

export interface Transaction {
  id: string;
  sender_id: string | null;
  receiver_id: string | null;
  amount: number;
  fee: number;
  net_amount: number;
  type: 'transfer' | 'service_payment' | 'escrow_hold' | 'escrow_release' | 'refund' | 'commission' | 'deposit' | 'withdrawal' | 'subscription' | 'booking';
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  reference_type?: string | null;
  reference_id?: string | null;
  note?: string;
  metadata?: any;
  created_at: Date;
}

export const TransactionModel = {
  async create(client: any, data: Partial<Transaction>): Promise<Transaction> {
    const query = `
      INSERT INTO transactions (
        sender_id, receiver_id, amount, fee, net_amount, type, status,
        reference_type, reference_id, note, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      data.sender_id ?? null,
      data.receiver_id ?? null,
      data.amount,
      data.fee ?? 0,
      data.net_amount,
      data.type,
      data.status ?? 'pending',
      data.reference_type ?? null,
      data.reference_id ?? null,
      data.note ?? null,
      data.metadata ?? null,
    ];

    const db = client || pool;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async findByUserId(userId: string, limit: number = 20, offset: number = 0): Promise<Transaction[]> {
    const query = `
      SELECT * FROM transactions 
      WHERE sender_id = $1 OR receiver_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  },

  async findByReference(referenceType: string, referenceId: string): Promise<Transaction[]> {
    const result = await pool.query(
      `SELECT * FROM transactions
       WHERE reference_type = $1 AND reference_id::text = $2
       ORDER BY created_at DESC`,
      [referenceType, referenceId]
    );
    return result.rows;
  },
};
