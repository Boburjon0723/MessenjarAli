import { jobListingSubtitle, jobListingTitle } from './listing-chat';

export type MarketplaceContactPayload = {
  id: string;
  name?: string;
  surname?: string;
  username?: string;
  phone?: string;
  avatar?: string;
  avatar_url?: string;
  profession?: string;
  fromExpertListing?: boolean;
  fromJobListing?: boolean;
  jobId?: string;
  jobIntent?: 'apply' | 'chat';
  jobTitle?: string;
  jobCompany?: string;
};

export function buildJobApplyIntro(
  snap: Record<string, any>,
  t: (key: string) => string
): string {
  const title = jobListingTitle(snap);
  const company = jobListingSubtitle(snap);
  const subType = snap.sub_type === 'seeker' ? t('im_looking_for_job') : t('hiring_worker');
  const location = snap.location ? ` · ${snap.location}` : '';
  const salary = snap.salary_text || snap.salary_min || t('negotiable_price');
  return t('job_apply_intro_message')
    .replace('{title}', title)
    .replace('{company}', company)
    .replace('{type}', subType)
    .replace('{location}', location)
    .replace('{salary}', String(salary));
}

export function buildExpertConsultIntro(
  expert: { profession?: string; name?: string },
  t: (key: string) => string
): string {
  const profession = expert.profession || t('profession');
  return t('expert_consult_intro_message').replace('{profession}', profession);
}
