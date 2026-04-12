/**
 * Vaqtinchalik chat lifecycle loglari. O‘chirish: `CHAT_DEBUG = false`.
 */
export const CHAT_DEBUG = true;

export function chatDebug(label: string, payload?: Record<string, unknown>): void {
    if (!CHAT_DEBUG) return;
    if (payload !== undefined) {
        console.log("[CHAT_DEBUG]", label, payload);
    } else {
        console.log("[CHAT_DEBUG]", label);
    }
}
