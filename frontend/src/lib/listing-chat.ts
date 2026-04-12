/** E'londan boshlangan shaxsiy suhbat (backend `chats.metadata`) */

export function getChatMetadata(chat: any): Record<string, any> {
  const m = chat?.metadata;
  if (!m) return {};
  if (typeof m === 'object') return m as Record<string, any>;
  try {
    return JSON.parse(String(m)) as Record<string, any>;
  } catch {
    return {};
  }
}

/** Faqat `chats.metadata` da `expert_listing` yoki backenddan kelgan `listing_privacy` bo‘lsa */
export function isExpertListingChat(chat: any): boolean {
  if (chat?.type !== 'private') return false;
  const meta = getChatMetadata(chat);
  if (meta.source === 'expert_listing' && !!meta.expert_id) return true;
  if (chat?.otherUser?.listing_privacy === true) return true;
  return false;
}
