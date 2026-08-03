import { Response } from 'express';
import { EscrowService } from '../../services/escrow.service';
import { NotificationService } from '../../services/notification.service';
import { AuthRequest, userIdFromToken } from '../../middleware/auth.middleware';
import { UserModel } from '../../models/postgres/User';
import { pool } from '../../config/database';

async function isAdminUser(userId: string): Promise<boolean> {
    const u = await UserModel.findById(userId);
    return u?.role === 'admin';
}

/** Prefer server-side service price when serviceId is provided. */
async function resolveHoldAmount(body: {
    amount?: unknown;
    serviceId?: string;
}): Promise<number> {
    if (body.serviceId) {
        const res = await pool.query('SELECT price FROM services WHERE id = $1', [body.serviceId]);
        const price = parseFloat(res.rows[0]?.price);
        if (Number.isFinite(price) && price > 0) return price;
    }
    const amount = parseFloat(String(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Amount is required (or provide a valid serviceId)');
    }
    return amount;
}

export const holdFunds = async (req: AuthRequest, res: Response) => {
    try {
        const userId = userIdFromToken(req.user);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { serviceId, bookingId, sessionId } = req.body;
        const amount = await resolveHoldAmount(req.body);

        const escrow = await EscrowService.holdFunds(userId, amount, { serviceId, bookingId, sessionId });
        res.status(201).json({ message: 'Funds held in escrow', escrow });
    } catch (error: any) {
        console.error('Hold funds error:', error);
        res.status(400).json({ message: error.message || 'Failed to hold funds' });
    }
};

export const releaseFunds = async (req: AuthRequest, res: Response) => {
    try {
        const userId = userIdFromToken(req.user);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { escrowId } = req.body;
        if (!escrowId) return res.status(400).json({ message: 'Escrow ID required' });

        const admin = await isAdminUser(userId);
        await EscrowService.assertEscrowActor(escrowId, userId, 'release', admin);

        const updatedEscrow = await EscrowService.releaseFunds(escrowId);

        const io = req.app.get('io');
        if (io) {
            await NotificationService.createNotification(
                updatedEscrow.user_id,
                'funds_released',
                'Mablag\' chiqarildi',
                `${updatedEscrow.amount} MALI miqdoridagi mablag\' expertga o'tkazildi.`,
                { escrowId },
                io
            );
        }

        res.json({ message: 'Funds released successfully', escrow: updatedEscrow });
    } catch (error: any) {
        console.error('Release funds error:', error);
        const status = String(error.message || '').includes('Faqat') ? 403 : 400;
        res.status(status).json({ message: error.message || 'Failed to release funds' });
    }
};

export const refundFunds = async (req: AuthRequest, res: Response) => {
    try {
        const userId = userIdFromToken(req.user);
        if (!userId) return res.status(401).json({ message: 'Unauthorized' });

        const { escrowId } = req.body;
        if (!escrowId) return res.status(400).json({ message: 'Escrow ID required' });

        const admin = await isAdminUser(userId);
        await EscrowService.assertEscrowActor(escrowId, userId, 'refund', admin);

        const updatedEscrow = await EscrowService.refundFunds(escrowId);

        const io = req.app.get('io');
        if (io) {
            await NotificationService.createNotification(
                updatedEscrow.user_id,
                'funds_refunded',
                'Mablag\' qaytarildi',
                `${updatedEscrow.amount} MALI miqdoridagi mablag\' hisobingizga qaytarildi.`,
                { escrowId },
                io
            );
        }

        res.json({ message: 'Funds refunded successfully', escrow: updatedEscrow });
    } catch (error: any) {
        console.error('Refund funds error:', error);
        const status = String(error.message || '').includes('Faqat') ? 403 : 400;
        res.status(status).json({ message: error.message || 'Failed to refund funds' });
    }
};
