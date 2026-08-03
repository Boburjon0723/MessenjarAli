import { Router } from 'express';
import { requireBotLinkToken, authenticateBotToken } from '../../middleware/auth.middleware';
import * as BotApiController from '../controllers/botApi.controller';
import { validateBody } from '../../middleware/validate.middleware';
import { botUpdatePhoneSchema } from '../../validation/money.schemas';

const router = Router();

router.post('/bot/sendMessage', authenticateBotToken, BotApiController.sendMessage);
// Phone mutation: only Telegram S2S (BOT_LINK_TOKEN), never user bot API keys
router.post(
    '/bot/update-phone',
    requireBotLinkToken,
    validateBody(botUpdatePhoneSchema),
    BotApiController.updateUserPhoneFromTelegram
);

export default router;
