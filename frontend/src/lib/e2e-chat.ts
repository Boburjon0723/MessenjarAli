import type { ChatMessage } from '@/types/chat-message';
import { getUser } from './auth-storage';
import { decryptTextEnvelope } from './e2e-crypto';
import { E2E_FAILED_PLACEHOLDER, E2E_PLACEHOLDER, isE2eEnvelope } from './e2e-envelope';

function metaObject(raw: ChatMessage['metadata']): Record<string, unknown> {
    if (!raw) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return raw as Record<string, unknown>;
}

export async function decryptChatMessage(msg: ChatMessage): Promise<ChatMessage> {
    const meta = metaObject(msg.metadata);
    if (!isE2eEnvelope(meta)) return msg;
    const userId = (getUser() as { id?: string } | null)?.id;
    if (!userId) {
        return { ...msg, text: E2E_PLACEHOLDER, e2e: true };
    }
    const plain = await decryptTextEnvelope(userId, msg.text || '', meta);
    if (plain == null) {
        return { ...msg, text: E2E_FAILED_PLACEHOLDER, e2e: true, e2eFailed: true };
    }
    const next: ChatMessage = { ...msg, text: plain, e2e: true };
    if (next.parentMessage?.text && isE2eEnvelope(next.parentMessage)) {
        /* parent ciphertext is decrypted separately when loaded as its own row */
    }
    return next;
}

export async function decryptChatMessages(messages: ChatMessage[]): Promise<ChatMessage[]> {
    return Promise.all(messages.map(decryptChatMessage));
}

export async function decryptListPreview(
    cipher: string | undefined,
    meta: unknown,
    fallback: string
): Promise<string> {
    if (!isE2eEnvelope(meta) || !cipher) return fallback;
    const userId = (getUser() as { id?: string } | null)?.id;
    if (!userId) return fallback;
    const plain = await decryptTextEnvelope(userId, cipher, meta as Record<string, unknown>);
    return plain ?? fallback;
}
