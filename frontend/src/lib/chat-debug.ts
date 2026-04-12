/**
 * Vaqtinchalik chat lifecycle loglari. Production buildda o‘chiq (NEXT bundler NODE_ENV ni qo‘yadi).
 */
export const CHAT_DEBUG =
    typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export function chatDebug(label: string, payload?: Record<string, unknown>): void {
    if (!CHAT_DEBUG) return;
    if (payload !== undefined) {
        console.log("[CHAT_DEBUG]", label, payload);
    } else {
        console.log("[CHAT_DEBUG]", label);
    }
}
