import { TranslationKeys } from './translations';
import type { ExpertPanelMode } from '@/lib/expert-roles';

export type ComplianceAudience = 'expert' | 'client';

export type ExpertComplianceBlock = {
  title: string;
  lines: string[];
};

/**
 * Mutaxassis va mijoz uchun o'ng panelda chiqadigan etik / huquqiy ogohlantirishlar.
 */
export function getExpertComplianceNotice(
  mode: ExpertPanelMode,
  audience: ComplianceAudience,
  t: (key: TranslationKeys) => string,
  tLines: (key: TranslationKeys) => string[],
): ExpertComplianceBlock | null {
  if (mode === 'legal') {
    if (audience === 'expert') {
      return {
        title: t('legal_expert_notice_title'),
        lines: tLines('legal_expert_notice_lines'),
      };
    }
    return {
      title: t('be_careful_title'),
      lines: tLines('legal_client_notice_lines'),
    };
  }

  if (mode === 'psychology') {
    if (audience === 'expert') {
      return {
        title: t('psychology_expert_notice_title'),
        lines: tLines('psychology_expert_notice_lines'),
      };
    }
    return {
      title: t('be_careful_title'),
      lines: tLines('psychology_client_notice_lines'),
    };
  }

  return null;
}


