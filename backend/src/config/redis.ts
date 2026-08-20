import { createClient } from 'redis';

function isUsableRedisUrl(url: string | undefined): boolean {
    const u = String(url || '').trim();
    if (!u) return false;
    if (u.includes('${{') || u.includes('${')) return false;
    try {
        // redis:// and rediss://
        new URL(u);
        return true;
    } catch {
        return false;
    }
}

// Determine if we should use Redis based on env var presence.
// This ensures the app still runs if no Redis server is available locally.
const redisUrl = isUsableRedisUrl(process.env.REDIS_URL) ? String(process.env.REDIS_URL).trim() : '';

export const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;
export const subClient = redisUrl ? redisClient?.duplicate() : null;

if (redisClient && subClient) {
    redisClient.on('error', (err) => console.warn('Redis Client (Pub) Error', err));
    subClient.on('error', (err) => console.warn('Redis Client (Sub) Error', err));
    
    redisClient.on('connect', () => console.log('Redis Pub connected.'));
    subClient.on('connect', () => console.log('Redis Sub connected.'));

    // Connect both
    Promise.all([
        redisClient.connect(),
        subClient.connect()
    ]).catch(console.error);
} else {
    console.log('No REDIS_URL provided in .env. Falling back to direct PostgreSQL queries for caching layer.');
}

/**
 * Helper to safely get from cache if Redis is configured.
 */
export const safeGetCache = async (key: string): Promise<string | null> => {
    if (!redisClient || !redisClient.isOpen) return null;
    try {
        return await redisClient.get(key);
    } catch (e) {
        console.warn(`Redis get error for key ${key}:`, e);
        return null;
    }
};

/**
 * Helper to safely set cache if Redis is configured.
 */
export const safeSetCache = async (key: string, value: string, expirationSeconds: number = 300): Promise<void> => {
    if (!redisClient || !redisClient.isOpen) return;
    try {
        await redisClient.setEx(key, expirationSeconds, value);
    } catch (e) {
        console.warn(`Redis set error for key ${key}:`, e);
    }
};

/**
 * Helper to safely delete cache if Redis is configured.
 */
export const safeDelCache = async (key: string): Promise<void> => {
    if (!redisClient || !redisClient.isOpen) return;
    try {
        await redisClient.del(key);
    } catch (e) {
        console.warn(`Redis del error for key ${key}:`, e);
    }
};

/**
 * Presence management: Tracking online users
 * Redis bo‘lmasa — jarayon ichida Map (lokal / single-node).
 */
const ONLINE_USERS_KEY = 'mali_online_users';
const localOnlineSocketCounts = new Map<string, number>();

export const addUserToOnline = async (userId: string, _socketId: string): Promise<void> => {
    const uid = String(userId);
    if (!redisClient || !redisClient.isOpen) {
        localOnlineSocketCounts.set(uid, (localOnlineSocketCounts.get(uid) || 0) + 1);
        return;
    }
    try {
        // We use a HASH to track userId -> socketCount
        // Increment count when a new socket connects
        await redisClient.hIncrBy(ONLINE_USERS_KEY, uid, 1);
    } catch (e) {
        console.warn(`Redis addUserToOnline error for ${uid}:`, e);
        localOnlineSocketCounts.set(uid, (localOnlineSocketCounts.get(uid) || 0) + 1);
    }
};

export const removeUserFromOnline = async (userId: string): Promise<number> => {
    const uid = String(userId);
    if (!redisClient || !redisClient.isOpen) {
        const next = (localOnlineSocketCounts.get(uid) || 0) - 1;
        if (next <= 0) {
            localOnlineSocketCounts.delete(uid);
            return 0;
        }
        localOnlineSocketCounts.set(uid, next);
        return next;
    }
    try {
        const val = await redisClient.hIncrBy(ONLINE_USERS_KEY, uid, -1);
        if (val <= 0) {
            await redisClient.hDel(ONLINE_USERS_KEY, uid);
            return 0; // Truly offline
        }
        return val; // Still has other sockets online
    } catch (e) {
        console.warn(`Redis removeUserFromOnline error for ${uid}:`, e);
        return 0;
    }
};

export const isUserOnline = async (userId: string): Promise<boolean> => {
    const uid = String(userId);
    if (!redisClient || !redisClient.isOpen) {
        return (localOnlineSocketCounts.get(uid) || 0) > 0;
    }
    try {
        const val = await redisClient.hGet(ONLINE_USERS_KEY, uid);
        return !!(val && parseInt(val) > 0);
    } catch (e) {
        return (localOnlineSocketCounts.get(uid) || 0) > 0;
    }
};

/**
 * Clear cache by pattern (e.g. 'cache:*')
 */
export const safeClearCache = async (pattern: string): Promise<void> => {
    if (!redisClient || !redisClient.isOpen) return;
    try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`Cleared ${keys.length} keys with pattern ${pattern}`);
        }
    } catch (e) {
        console.warn(`Redis clear pattern error for ${pattern}:`, e);
    }
};

/**
 * Get count of online users
 */
export const getOnlineUserCount = async (): Promise<number> => {
    if (!redisClient || !redisClient.isOpen) {
        return localOnlineSocketCounts.size;
    }
    try {
        return await redisClient.hLen(ONLINE_USERS_KEY);
    } catch (e) {
        return localOnlineSocketCounts.size;
    }
};

