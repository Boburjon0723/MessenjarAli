import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../../config/redis';
import { authenticateToken } from '../../middleware/auth.middleware';
import { requireSettlementHmac } from '../../middleware/settlementAuth.middleware';
import {
    linkCompanyWallet,
    getCompanyBalance,
    holdSettlement,
    releaseSettlement,
    refundSettlement,
    listSettlementTransactions,
} from '../controllers/settlement.controller';

const createStore = (prefix: string) => {
    if (redisClient && redisClient.isOpen) {
        return new RedisStore({
            // @ts-ignore
            sendCommand: (...args: string[]) => redisClient.sendCommand(args),
            prefix: `rl:${prefix}:`,
        });
    }
    return undefined;
};

const settlementLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('settlement'),
    message: { message: 'Settlement rate limit exceeded' },
});

const router = Router();

// User-initiated link (Axis owner/admin completes OAuth-style redirect as Mali user)
router.post('/wallets/link', authenticateToken, settlementLimiter, linkCompanyWallet);

// S2S HMAC surface
router.get('/wallets/:companyId/balance', requireSettlementHmac, settlementLimiter, getCompanyBalance);
router.post('/hold', requireSettlementHmac, settlementLimiter, holdSettlement);
router.post('/release', requireSettlementHmac, settlementLimiter, releaseSettlement);
router.post('/refund', requireSettlementHmac, settlementLimiter, refundSettlement);
router.get('/transactions', requireSettlementHmac, settlementLimiter, listSettlementTransactions);

export default router;
