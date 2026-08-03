import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/postgres/User';
import { getJwtSecrets, JWT_VERIFY_OPTS, timingSafeEqualString } from '../config/security';
import { authCookieName, getCookie } from '../config/authCookies';
import { recordSecurityAudit } from '../services/securityAudit.service';

export interface JwtUserPayload {
    /** Preferred subject claim (user id) */
    sub?: string;
    /** Legacy claim — still accepted for older tokens */
    id?: string;
    phone?: string;
    role?: string;
    isExpert?: boolean;
    name?: string;
    surname?: string;
}

export interface AuthRequest extends Request {
    user?: JwtUserPayload & { id: string };
}

export function userIdFromToken(user: JwtUserPayload | undefined): string | undefined {
    if (!user) return undefined;
    return user.sub || user.id;
}

/** Cookie first (web session), then Authorization Bearer (mobile/API). */
export function extractAccessToken(req: Request): string | undefined {
    const fromCookie = getCookie(req, authCookieName());
    if (fromCookie) return fromCookie;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7).trim() || undefined;
    }
    return undefined;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = extractAccessToken(req);

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    let secret: string;
    try {
        secret = getJwtSecrets().accessTokenSecret;
    } catch {
        console.error('JWT_SECRET is not defined');
        return res.status(500).json({ message: 'Internal Server Error' });
    }

    try {
        const decoded = jwt.verify(token, secret, JWT_VERIFY_OPTS) as JwtUserPayload;
        const id = userIdFromToken(decoded);
        if (!id) {
            return res.status(403).json({ message: 'Invalid token payload' });
        }
        req.user = { ...decoded, id };
        next();
    } catch {
        recordSecurityAudit(req, {
            event: 'auth_invalid_token',
            success: false,
            reason: 'invalid_or_expired',
            metadata: { method: req.method, path: req.originalUrl.split('?')[0] },
        });
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

/** Admin: JWT role ishqibozlik; har safar DB dan role + is_active tekshiriladi. */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = userIdFromToken(req.user);
        if (!userId) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const dbUser = await UserModel.findById(userId);
        const active = dbUser?.is_active !== false;
        if (!dbUser || dbUser.role !== 'admin' || !active) {
            return res.status(403).json({ message: 'Admin access required' });
        }
        req.user = { ...req.user!, id: userId, role: 'admin' };
        next();
    } catch (err) {
        console.error('requireAdmin error:', err);
        return res.status(500).json({ message: 'Authentication error' });
    }
};

export const requireSelfOrAdmin = (paramKey = 'userId') => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const userId = userIdFromToken(req.user);
            if (!userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            const target = String(req.params[paramKey] || req.body?.[paramKey] || '');
            if (target && target === userId) {
                return next();
            }
            const dbUser = await UserModel.findById(userId);
            if (dbUser?.role === 'admin') {
                return next();
            }
            return res.status(403).json({ message: 'Ruxsat yo‘q' });
        } catch (err) {
            console.error('requireSelfOrAdmin error:', err);
            return res.status(500).json({ message: 'Authentication error' });
        }
    };
};

export interface BotAuthRequest extends Request {
    bot?: any;
}

export const authenticateBotToken = async (req: BotAuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.startsWith('Bot ') ? authHeader.slice(4).trim() : null;
    const tokenFromQuery = (req.headers['x-bot-token'] as string) || null;
    const token = tokenFromHeader || tokenFromQuery;

    if (!token) {
        return res.status(401).json({ message: 'Bot token required (Authorization: Bot <token> or X-Bot-Token)' });
    }

    try {
        const { BotModel } = await import('../models/postgres/Bot');
        const bot = await BotModel.findByToken(token);
        if (!bot) {
            return res.status(403).json({ message: 'Invalid or expired bot token' });
        }
        (req as any).bot = bot;
        next();
    } catch (err) {
        console.error('Bot auth error:', err);
        return res.status(500).json({ message: 'Authentication error' });
    }
};

/** Telegram ichki S2S — faqat BOT_LINK_TOKEN (user bot token emas). */
export const requireBotLinkToken = (req: Request, res: Response, next: NextFunction) => {
    const expected = process.env.BOT_LINK_TOKEN;
    const provided =
        (req.headers['x-bot-link-token'] as string | undefined) ||
        (req.headers['x-bot-control-token'] as string | undefined);

    if (!expected || !timingSafeEqualString(provided, expected)) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    next();
};
