import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisClient } from '../config/redis';

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

export const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_IP_MAX || 90),
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('global'),
    message: {
        message: "Juda ko'p so'rov yuborildi. Iltimos, birozdan so'ng qayta urinib ko'ring.",
    },
});

/** Login ~10/min (Axis-yaqin) */
export const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('login'),
    message: { message: "Login urinishlari juda ko'p. 1 daqiqadan so'ng qayta urining." },
});

/** Register ~5/min */
export const registerLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('register'),
    message: { message: "Ro'yxatdan o'tish urinishlari juda ko'p." },
});

/** Legacy alias used by auth routes that share login/register */
export const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('auth'),
    message: {
        message: "Login yoki ro'yxatdan o'tish urinishlari juda ko'p. Birozdan so'ng qayta urining.",
    },
});

export const refreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('refresh'),
    message: { message: "Refresh so'rovlari juda ko'p." },
});

/** Wallet / transfer / escrow mutations */
export const moneyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('money'),
    message: { message: "Pul operatsiyalari limiti. Biroz kuting." },
});
