import { TranslationKeys } from './translations';
import type { ExpertActionKind } from '@/lib/expert-roles';

export type ClientTermsBlock = {
  paymentTitle: string;
  paymentLines: string[];
  consultTitle: string;
  consultLines: string[];
};

/** O‘ng panel: to‘lov va maslahat shartlari (mijoz uchun) */
export function getClientServiceTerms(
  actionType: ExpertActionKind | null,
  t: (key: TranslationKeys) => string,
  tLines: (key: TranslationKeys) => string[],
): ClientTermsBlock {
  if (actionType === 'mentor') {
    return {
      paymentTitle: t('payment_terms_title'),
      paymentLines: tLines('mentor_payment_lines'),
      consultTitle: t('mentor_consult_terms_title'),
      consultLines: tLines('mentor_consult_lines'),
    };
  }

  return {
    paymentTitle: t('payment_terms_title'),
    paymentLines: tLines('regular_payment_lines'),
    consultTitle: t('consult_terms_title'),
    consultLines: tLines('regular_consult_lines'),
  };
}
