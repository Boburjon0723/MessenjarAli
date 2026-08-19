import { apiFetch } from './api';

export type ListingConsentAction =
    | 'client_accept'
    | 'expert_accept'
    | 'employer_accept'
    | 'employer_reject';

export async function postListingConsent(
    chatId: string,
    action: ListingConsentAction,
    options?: { reason?: string }
): Promise<{ metadata: Record<string, unknown> }> {
    const res = await apiFetch(`/api/chats/${encodeURIComponent(chatId)}/listing-consent`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: options?.reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : 'Consent failed');
    }
    return data as { metadata: Record<string, unknown> };
}
