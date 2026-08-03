import { Router } from 'express';
import { WalletController } from '../controllers/wallet.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { moneyLimiter } from '../../middleware/rateLimit.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { bookSessionSchema, completeSessionSchema } from '../../validation/money.schemas';

const router = Router();

router.use(authenticateToken);

router.get('/balance', WalletController.getBalance);
router.post('/subscribe', moneyLimiter, WalletController.subscribeExpert);
router.post('/book', moneyLimiter, validateBody(bookSessionSchema), WalletController.bookSession);
router.post('/complete', moneyLimiter, validateBody(completeSessionSchema), WalletController.completeSession);
router.get('/my-bookings', WalletController.getMyBookings);
router.post('/booking/reject', moneyLimiter, WalletController.rejectBooking);
router.get('/settings', WalletController.getPlatformSettings);
router.post('/subscribe-to-mentor', moneyLimiter, WalletController.subscribeToMentor);
router.get('/subscription-status', WalletController.getSubscriptionStatus);

export default router;
