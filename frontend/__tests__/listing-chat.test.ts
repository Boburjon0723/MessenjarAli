import { describe, expect, it } from 'vitest';
import { getChatMetadata, isExpertListingChat, isJobListingChat, getMurojaatSidebarSections } from '@/lib/listing-chat';

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

describe('isJobListingChat', () => {
  it('requires private chat with job_listing metadata and snapshot', () => {
    expect(
      isJobListingChat({
        type: 'private',
        metadata: { source: 'job_listing', job_id: 'j1', snapshot: { title: 'Dev' } },
      })
    ).toBe(true);
    expect(
      isJobListingChat({
        type: 'private',
        metadata: { source: 'job_listing', job_id: 'j1' },
      })
    ).toBe(false);
  });
});

describe('getMurojaatSidebarSections', () => {
  const expertId = 'expert-1';
  const clientId = 'client-1';
  const posterId = 'poster-1';

  it('splits expert inbox vs applicant accepted', () => {
    const chats = [
      {
        id: 'c1',
        type: 'private',
        metadata: { source: 'expert_listing', expert_id: expertId, application_status: 'pending' },
      },
      {
        id: 'c2',
        type: 'private',
        metadata: { source: 'expert_listing', expert_id: expertId, application_status: 'accepted' },
      },
      {
        id: 'c3',
        type: 'private',
        metadata: { source: 'expert_listing', expert_id: expertId, application_status: 'accepted' },
      },
    ];
    const expertView = getMurojaatSidebarSections(chats, expertId);
    expect(expertView.expertInbox).toHaveLength(3);
    expect(expertView.applicantMurojaat).toHaveLength(0);

    const clientView = getMurojaatSidebarSections(chats, clientId);
    expect(clientView.applicantMurojaat).toHaveLength(2);
    expect(clientView.expertInbox).toHaveLength(0);
  });

  it('does not show pending job apply to applicant', () => {
    const chats = [
      {
        id: 'j1',
        type: 'private',
        metadata: {
          source: 'job_listing',
          job_id: 'job-1',
          poster_id: posterId,
          intent: 'apply',
          snapshot: { title: 'Dev' },
          application_status: 'pending',
        },
      },
    ];
    expect(getMurojaatSidebarSections(chats, posterId).employerApplications).toHaveLength(1);
    expect(getMurojaatSidebarSections(chats, clientId).applicantJobs).toHaveLength(0);
  });
});
