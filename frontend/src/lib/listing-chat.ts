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

/** Mutaxassis e'loni orqali ochilgan chat */
export function isExpertListingChat(chat: any): boolean {
  if (chat?.type !== 'private') return false;
  const meta = getChatMetadata(chat);
  if (meta.source === 'expert_listing' && !!meta.expert_id) return true;
  if (chat?.otherUser?.listing_privacy === true) return true;
  return false;
}

/** Ish e'loni orqali ochilgan chat */
export function isJobListingChat(chat: any): boolean {
  if (chat?.type !== 'private') return false;
  const meta = getChatMetadata(chat);
  return meta.source === 'job_listing' && !!meta.job_id && !!meta.snapshot;
}

export function getJobListingSnapshot(chat: any): Record<string, any> | null {
  if (!isJobListingChat(chat)) return null;
  const snap = getChatMetadata(chat).snapshot;
  return snap && typeof snap === 'object' ? (snap as Record<string, any>) : null;
}

export function getJobListingIntent(chat: any): 'apply' | 'chat' | null {
  if (!isJobListingChat(chat)) return null;
  const intent = getChatMetadata(chat).intent;
  return intent === 'apply' ? 'apply' : intent === 'chat' ? 'chat' : null;
}

export function jobListingTitle(snap: Record<string, any>): string {
  return (
    snap.position ||
    snap.title ||
    snap.company_name ||
    snap.full_name ||
    (snap.short_text ? String(snap.short_text).slice(0, 48) : '') ||
    "E'lon"
  );
}

export function jobListingSubtitle(snap: Record<string, any>): string {
  if (snap.sub_type === 'seeker') return snap.full_name || snap.poster_name || '—';
  return snap.company_name || snap.poster_name || '—';
}

export function getApplicationStatus(chat: any): string | undefined {
  const s = getChatMetadata(chat).application_status;
  return typeof s === 'string' ? s : undefined;
}

export function isApplicationAccepted(chat: any): boolean {
  return getApplicationStatus(chat) === 'accepted';
}

export function isApplicationRejected(chat: any): boolean {
  return getApplicationStatus(chat) === 'rejected';
}

export function isApplicationPending(chat: any): boolean {
  const s = getApplicationStatus(chat);
  return !s || s === 'pending';
}

/** Ish arizasi yoki mutaxassis murojaati — alohida bo'limga ajratiladi */
export function isListingMarketplacePrivateChat(chat: any): boolean {
  if (chat?.type !== 'private') return false;
  if (isExpertListingChat(chat)) return true;
  return isJobListingChat(chat) && getJobListingIntent(chat) === 'apply';
}

/** Sidebar «Murojaatlar» bo'limi (barcha bo'limlar birlashtirilgan — legacy) */
export function getMurojaatSidebarChats(chats: any[], currentUserId: string | undefined): any[] {
  const sections = getMurojaatSidebarSections(chats, currentUserId);
  const seen = new Set<string>();
  const out: any[] = [];
  for (const list of [
    sections.expertInbox,
    sections.applicantMurojaat,
    sections.employerApplications,
    sections.applicantJobs,
  ]) {
    for (const chat of list) {
      const id = String(chat?.id ?? chat?._id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(chat);
    }
  }
  return out;
}

export type MurojaatSidebarSections = {
  /** Mutaxassis: kelgan murojaatlar (pending ham) */
  expertInbox: any[];
  /** Mijoz: qabul qilingan mutaxassis murojaatlari */
  applicantMurojaat: any[];
  /** Ish beruvchi: ish arizalari (pending ham) */
  employerApplications: any[];
  /** Ariza beruvchi: qabul qilingan ish arizalari */
  applicantJobs: any[];
};

/** Sidebar bo'limlari — reja §2.2 */
export function getMurojaatSidebarSections(
  chats: any[],
  currentUserId: string | undefined
): MurojaatSidebarSections {
  const empty: MurojaatSidebarSections = {
    expertInbox: [],
    applicantMurojaat: [],
    employerApplications: [],
    applicantJobs: [],
  };
  if (!currentUserId || !Array.isArray(chats)) return empty;
  const uid = String(currentUserId);

  for (const chat of chats) {
    if (chat?.type !== 'private') continue;
    const meta = getChatMetadata(chat);
    const status = getApplicationStatus(chat);

    if (meta.source === 'expert_listing' && meta.expert_id) {
      if (String(meta.expert_id) === uid) {
        empty.expertInbox.push(chat);
      } else if (status === 'accepted') {
        empty.applicantMurojaat.push(chat);
      }
    }

    if (meta.source === 'job_listing' && meta.intent === 'apply' && meta.poster_id) {
      if (String(meta.poster_id) === uid) {
        empty.employerApplications.push(chat);
      } else if (status === 'accepted') {
        empty.applicantJobs.push(chat);
      }
    }
  }

  return {
    expertInbox: empty.expertInbox,
    applicantMurojaat: empty.applicantMurojaat,
    employerApplications: empty.employerApplications,
    applicantJobs: empty.applicantJobs,
  };
}
