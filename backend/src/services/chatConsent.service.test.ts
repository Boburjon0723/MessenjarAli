import { describe, expect, it } from 'vitest';
import {
    isListingChatMetadata,
    isListingMessagingUnlocked,
    parseChatMetadata,
    computeListingConsentUpdate,
} from './chatConsent.service';

describe('chatConsent.service', () => {
    it('parseChatMetadata handles object and JSON string', () => {
        expect(parseChatMetadata({ source: 'expert_listing' })).toEqual({ source: 'expert_listing' });
        expect(parseChatMetadata('{"intent":"apply"}')).toEqual({ intent: 'apply' });
        expect(parseChatMetadata(null)).toEqual({});
    });

    it('detects listing chat metadata', () => {
        expect(isListingChatMetadata({ source: 'expert_listing', expert_id: 'e1' })).toBe(true);
        expect(isListingChatMetadata({ source: 'job_listing', job_id: 'j1' })).toBe(true);
        expect(isListingChatMetadata({ source: 'job_listing' })).toBe(false);
        expect(isListingChatMetadata({})).toBe(false);
    });

    it('blocks messaging until both parties accept', () => {
        const meta = { source: 'expert_listing', expert_id: 'e1', application_status: 'pending' };
        expect(isListingMessagingUnlocked(meta)).toBe(false);
        expect(
            isListingMessagingUnlocked({
                ...meta,
                client_accepted_at: '2026-01-01',
            })
        ).toBe(false);
        expect(
            isListingMessagingUnlocked({
                ...meta,
                client_accepted_at: '2026-01-01',
                expert_accepted_at: '2026-01-02',
            })
        ).toBe(true);
    });

    it('unlocks when application_status is accepted', () => {
        expect(
            isListingMessagingUnlocked({
                source: 'job_listing',
                job_id: 'j1',
                application_status: 'accepted',
            })
        ).toBe(true);
    });

    it('blocks when application_status is rejected', () => {
        expect(
            isListingMessagingUnlocked({
                source: 'job_listing',
                job_id: 'j1',
                application_status: 'rejected',
            })
        ).toBe(false);
    });

    it('allows non-listing chats', () => {
        expect(isListingMessagingUnlocked({})).toBe(true);
    });
});

describe('computeListingConsentUpdate', () => {
    const expertMeta = {
        source: 'expert_listing',
        expert_id: 'expert-1',
        application_status: 'pending',
    };
    const jobMeta = {
        source: 'job_listing',
        job_id: 'job-1',
        poster_id: 'poster-1',
        intent: 'apply',
        application_status: 'pending',
    };
    const now = '2026-08-19T00:00:00.000Z';

    it('sets accepted when both parties consent on expert listing', () => {
        const first = computeListingConsentUpdate({
            meta: expertMeta,
            action: 'client_accept',
            currentUserId: 'client-1',
            now,
        });
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        const second = computeListingConsentUpdate({
            meta: first.next,
            action: 'expert_accept',
            currentUserId: 'expert-1',
            now,
        });
        expect(second.ok).toBe(true);
        if (second.ok) expect(second.next.application_status).toBe('accepted');
    });

    it('rejects employer reject from non-poster', () => {
        const result = computeListingConsentUpdate({
            meta: jobMeta,
            action: 'employer_reject',
            currentUserId: 'applicant-1',
            now,
            rejectReason: 'Tajriba yetarli emas',
        });
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.status).toBe(403);
    });

    it('marks job application rejected with reason', () => {
        const result = computeListingConsentUpdate({
            meta: jobMeta,
            action: 'employer_reject',
            currentUserId: 'poster-1',
            now,
            rejectReason: 'Tajriba yetarli emas',
        });
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.next.application_status).toBe('rejected');
            expect(result.next.reject_reason).toBe('Tajriba yetarli emas');
        }
    });
});
