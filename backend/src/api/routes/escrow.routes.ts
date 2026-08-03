import { Router } from 'express';
import { holdFunds, releaseFunds, refundFunds } from '../controllers/escrow.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { moneyLimiter } from '../../middleware/rateLimit.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { escrowHoldSchema, escrowIdSchema } from '../../validation/money.schemas';

const router = Router();

router.post('/escrow/hold', authenticateToken, moneyLimiter, validateBody(escrowHoldSchema), holdFunds);
router.post('/escrow/release', authenticateToken, moneyLimiter, validateBody(escrowIdSchema), releaseFunds);
router.post('/escrow/refund', authenticateToken, moneyLimiter, validateBody(escrowIdSchema), refundFunds);

export default router;
