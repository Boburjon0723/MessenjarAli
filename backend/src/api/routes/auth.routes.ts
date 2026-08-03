import { Router } from 'express';
import {
    register,
    login,
    refresh,
    logout,
    linkTelegram,
    requestPasswordReset,
    confirmPasswordReset,
    startTelegramLink,
    verifyRegistrationPhone,
    registrationLinkStatus,
    resendRegistrationOtp,
} from '../controllers/auth.controller';
import {
    authLimiter,
    loginLimiter,
    refreshLimiter,
    registerLimiter,
} from '../../middleware/rateLimit.middleware';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate.middleware';
import {
    confirmResetSchema,
    loginSchema,
    refreshSchema,
    registerSchema,
    requestResetSchema,
} from '../../validation/auth.schemas';

const router = Router();

router.post('/auth/register', registerLimiter, validateBody(registerSchema), register);
router.post('/auth/login', loginLimiter, validateBody(loginSchema), login);
router.post('/auth/refresh', refreshLimiter, validateBody(refreshSchema), refresh);
router.post('/auth/logout', logout);

router.post('/auth/start-telegram-link', authenticateToken, startTelegramLink);
router.post('/auth/start-telegram-havolasi', authenticateToken, startTelegramLink);

router.post('/auth/link-telegram', linkTelegram);

router.post('/auth/request-reset', authLimiter, validateBody(requestResetSchema), requestPasswordReset);
router.post('/auth/confirm-reset', authLimiter, validateBody(confirmResetSchema), confirmPasswordReset);

router.post('/auth/registration-status', authLimiter, registrationLinkStatus);
router.post('/auth/verify-registration', authLimiter, verifyRegistrationPhone);
router.post('/auth/resend-registration-otp', authLimiter, resendRegistrationOtp);

export default router;
