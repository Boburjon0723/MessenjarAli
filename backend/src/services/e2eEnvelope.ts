/** Client-side E2E envelope. Server stores ciphertext only — never decrypts. */

export type E2eMetadata = {
    e2e?: boolean;
    e2e_v?: number;
    alg?: string;
    nonce?: string;
    sender_pub?: string;
    recipient_pub?: string;
};

export function parseMetadata(raw: unknown): Record<string, unknown> {
    if (raw == null) return {};
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
        } catch {
            return {};
        }
    }
    if (typeof raw === 'object') return raw as Record<string, unknown>;
    return {};
}

export function isE2eEnvelope(raw: unknown): boolean {
    const meta = parseMetadata(raw);
    return meta.e2e === true || Number(meta.e2e_v) >= 1;
}

export const E2E_LIST_PLACEHOLDER = '🔒 Shifrlangan xabar';
