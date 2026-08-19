import { describe, expect, it } from 'vitest';
import { isMessagingUnlocked } from '@/lib/chat-consent';

describe('chat-consent', () => {
    it('unlocks normal private chat', () => {
        expect(isMessagingUnlocked({ type: 'private', metadata: {} })).toBe(true);
    });

    it('locks expert listing without acceptance', () => {
        expect(
            isMessagingUnlocked({
                type: 'private',
                metadata: { source: 'expert_listing', expert_id: 'e1' },
            })
        ).toBe(false);
    });

    it('unlocks when application accepted', () => {
        expect(
            isMessagingUnlocked({
                type: 'private',
                metadata: {
                    source: 'expert_listing',
                    expert_id: 'e1',
                    application_status: 'accepted',
                },
            })
        ).toBe(true);
    });

    it('blocks messaging when application rejected', () => {
        expect(
            isMessagingUnlocked({
                type: 'private',
                metadata: {
                    source: 'job_listing',
                    job_id: 'j1',
                    snapshot: {},
                    application_status: 'rejected',
                },
            })
        ).toBe(false);
    });
});
