import { Request, Response, NextFunction } from 'express';
import {
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME,
    getCookie,
} from '../config/authCookies';
import { timingSafeEqualString } from '../config/security';
import { recordSecurityAudit } from '../services/securityAudit.service';

const CSRF_EXEMPT_PREFIXES = [
    '/api/health',
    '/api/ping',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/auth/request-reset',
    '/api/auth/confirm-reset',
    '/api/auth/verify-registration',
    '/api/auth/resend-registration-otp',
    '/api/auth/registration-status',
    '/api/auth/link-telegram',
    '/api/bot/',
    '/api/settlement/v1/',
    '/api/translate',
];

/**
 * Double-submit CSRF for cookie sessions.
 * Bearer Authorization skips (mobile / API clients).
 */
export function csrfProtect(req: Request, res: Response, next: NextFunction) {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return next();
    }

    const path = req.path.startsWith('/api') ? req.path : req.originalUrl.split('?')[0];
    for (const prefix of CSRF_EXEMPT_PREFIXES) {
        if (path.startsWith(prefix) || req.originalUrl.split('?')[0].startsWith(prefix)) {
            return next();
        }
    }

    const auth = String(req.headers.authorization || '').trim();
    if (auth.startsWith('Bearer ')) {
        return next();
    }

    const cookieToken = getCookie(req, CSRF_COOKIE_NAME);
    const headerToken = String(req.headers[CSRF_HEADER_NAME.toLowerCase()] || '').trim();

    if (!cookieToken || !headerToken || !timingSafeEqualString(cookieToken, headerToken)) {
        recordSecurityAudit(req, {
            event: 'csrf_rejected',
            success: false,
            reason: !cookieToken ? 'missing_cookie' : !headerToken ? 'missing_header' : 'token_mismatch',
            metadata: { method, path: req.originalUrl.split('?')[0] },
        });
        return res.status(403).json({ message: 'CSRF token noto‘g‘ri yoki topilmadi' });
    }

    return next();
}
