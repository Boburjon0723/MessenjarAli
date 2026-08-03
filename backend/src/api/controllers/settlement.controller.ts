import { Response } from 'express';
import { SettlementService } from '../../services/settlement.service';
import { AuthRequest, userIdFromToken } from '../../middleware/auth.middleware';
import { SettlementRequest } from '../../middleware/settlementAuth.middleware';

export const linkCompanyWallet = async (req: AuthRequest, res: Response) => {
    try {
        const ownerUserId = userIdFromToken(req.user);
        if (!ownerUserId) return res.status(401).json({ message: 'Unauthorized' });
        const { axisCompanyId, companyName } = req.body || {};
        const result = await SettlementService.linkCompanyWallet({
            axisCompanyId,
            ownerUserId,
            companyName,
        });
        return res.status(201).json(result);
    } catch (error: any) {
        const status = String(error.message || '').includes('already linked') ? 409 : 400;
        return res.status(status).json({ message: error.message || 'Link failed' });
    }
};

export const getCompanyBalance = async (req: SettlementRequest, res: Response) => {
    try {
        const companyId = String(req.params.companyId || '');
        if (req.settlement && req.settlement.axisCompanyId !== companyId) {
            return res.status(403).json({ message: 'Key scope mismatch' });
        }
        const balance = await SettlementService.getBalanceByAxisCompanyId(companyId);
        return res.json(balance);
    } catch (error: any) {
        return res.status(404).json({ message: error.message || 'Not found' });
    }
};

export const holdSettlement = async (req: SettlementRequest, res: Response) => {
    try {
        const { axisOrderId, buyerCompanyId, sellerCompanyId, amount, idempotencyKey } = req.body || {};
        if (req.settlement && req.settlement.axisCompanyId !== buyerCompanyId && req.settlement.axisCompanyId !== sellerCompanyId) {
            return res.status(403).json({ message: 'Key scope mismatch' });
        }
        const tx = await SettlementService.hold({
            axisOrderId,
            buyerCompanyId,
            sellerCompanyId,
            amount: Number(amount),
            idempotencyKey,
        });
        return res.status(201).json(tx);
    } catch (error: any) {
        const status = String(error.message || '').includes('Insufficient') ? 402 : 400;
        return res.status(status).json({ message: error.message || 'Hold failed' });
    }
};

export const releaseSettlement = async (req: SettlementRequest, res: Response) => {
    try {
        const { axisOrderId, idempotencyKey, amount } = req.body || {};
        const tx = await SettlementService.release({
            axisOrderId,
            idempotencyKey,
            amount: amount != null ? Number(amount) : undefined,
        });
        return res.json(tx);
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Release failed' });
    }
};

export const refundSettlement = async (req: SettlementRequest, res: Response) => {
    try {
        const { axisOrderId, idempotencyKey } = req.body || {};
        const tx = await SettlementService.refund({ axisOrderId, idempotencyKey });
        return res.json(tx);
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Refund failed' });
    }
};

export const listSettlementTransactions = async (req: SettlementRequest, res: Response) => {
    try {
        const companyId = (req.query.companyId as string) || req.settlement?.axisCompanyId;
        const rows = await SettlementService.findTransactions({
            companyId,
            orderId: req.query.orderId as string | undefined,
            idempotencyKey: req.query.idempotencyKey as string | undefined,
        });
        return res.json(rows);
    } catch (error: any) {
        return res.status(400).json({ message: error.message || 'Query failed' });
    }
};
