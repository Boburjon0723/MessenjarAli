export type E2eAlg = 'x25519' | 'p256';

export type E2eEnvelopeMeta = {
    e2e: true;
    e2e_v: 1;
    alg: E2eAlg;
    nonce: string;
    sender_pub: string;
    recipient_pub: string;
};

export function isE2eEnvelope(raw: unknown): boolean {
    if (!raw || typeof raw !== 'object') {
        if (typeof raw === 'string') {
            try {
                return isE2eEnvelope(JSON.parse(raw));
            } catch {
                return false;
            }
        }
        return false;
    }
    const meta = raw as Record<string, unknown>;
    return meta.e2e === true || Number(meta.e2e_v) >= 1;
}

export const E2E_PLACEHOLDER = '🔒 Shifrlangan xabar';
