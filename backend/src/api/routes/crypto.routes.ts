import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import { upsertPublicKeySchema } from '../../validation/crypto.schemas';
import { getPublicKey, getPublicKeysBatch, upsertMyPublicKey } from '../controllers/crypto.controller';

const router = Router();

router.use(authenticateToken);
router.put('/keys', validateBody(upsertPublicKeySchema), upsertMyPublicKey);
router.get('/keys', getPublicKeysBatch);
router.get('/keys/:userId', getPublicKey);

export default router;
