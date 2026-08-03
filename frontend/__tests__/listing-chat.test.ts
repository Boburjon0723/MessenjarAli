import { describe, expect, it } from 'vitest';
import { getChatMetadata, isExpertListingChat } from '@/lib/listing-chat';

describe('getChatMetadata', () => {
  it('returns empty object when metadata missing', () => {
    expect(getChatMetadata({})).toEqual({});
    expect(getChatMetadata(null)).toEqual({});
  });

  it('returns object metadata as-is', () => {
    expect(getChatMetadata({ metadata: { expert_id: '1' } })).toEqual({ expert_id: '1' });
  });

  it('parses JSON string metadata', () => {
    expect(getChatMetadata({ metadata: '{"expert_id":"2"}' })).toEqual({ expert_id: '2' });
  });

  it('returns empty object for invalid JSON', () => {
    expect(getChatMetadata({ metadata: '{bad' })).toEqual({});
  });
});

describe('isExpertListingChat', () => {
  it('requires private chat with expert_listing metadata', () => {
    expect(
      isExpertListingChat({
        type: 'private',
        metadata: { source: 'expert_listing', expert_id: 'x' },
      })
    ).toBe(true);
  });

  it('accepts listing_privacy on otherUser', () => {
    expect(
      isExpertListingChat({
        type: 'private',
        otherUser: { listing_privacy: true },
      })
    ).toBe(true);
  });

  it('rejects group chats and incomplete metadata', () => {
    expect(
      isExpertListingChat({
        type: 'group',
        metadata: { source: 'expert_listing', expert_id: 'x' },
      })
    ).toBe(false);
    expect(
      isExpertListingChat({
        type: 'private',
        metadata: { source: 'expert_listing' },
      })
    ).toBe(false);
  });
});
