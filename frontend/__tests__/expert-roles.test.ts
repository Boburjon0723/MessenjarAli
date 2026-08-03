import { describe, expect, it } from 'vitest';
import {
  countExpertGroups,
  formatExpertPublicPrice,
  getExpertActionType,
  getExpertListingPitch,
  getExpertPanelMode,
  getExpertSpecialtyLine,
  isLegalProfession,
  isMentorProfession,
  parseStudentSessionStyle,
} from '@/lib/expert-roles';

const t = (key: string) => key;

describe('isMentorProfession', () => {
  it('matches exact mentor professions', () => {
    expect(isMentorProfession("O'qituvchi")).toBe(true);
    expect(isMentorProfession('Mentor')).toBe(true);
  });

  it('matches fuzzy mentor keywords', () => {
    expect(isMentorProfession('Repetitor')).toBe(true);
    expect(isMentorProfession('Startap mentori')).toBe(true);
  });

  it('rejects unrelated professions', () => {
    expect(isMentorProfession('Advokat')).toBe(false);
    expect(isMentorProfession(null)).toBe(false);
  });
});

describe('isLegalProfession', () => {
  it('matches legal professions', () => {
    expect(isLegalProfession('Advokat')).toBe(true);
    expect(isLegalProfession('Yurist')).toBe(true);
    expect(isLegalProfession('Huquqshunos')).toBe(true);
  });

  it('rejects non-legal professions', () => {
    expect(isLegalProfession('Psixolog')).toBe(false);
  });
});

describe('getExpertPanelMode', () => {
  it('detects mentor mode', () => {
    expect(getExpertPanelMode({ profession: "O'qituvchi" })).toBe('mentor');
  });

  it('detects legal mode before mentor bio noise', () => {
    expect(
      getExpertPanelMode({
        profession: 'Advokat',
        bio_expert: 'Darslar va mentorlik',
      })
    ).toBe('legal');
  });

  it('detects psychology mode', () => {
    expect(getExpertPanelMode({ profession: 'Klinik psixolog' })).toBe('psychology');
  });

  it('defaults to consult', () => {
    expect(getExpertPanelMode({ profession: 'Biznes maslahatchi' })).toBe('consult');
    expect(getExpertPanelMode(null)).toBe('consult');
  });
});

describe('getExpertActionType', () => {
  it('maps mentor and consultant kinds', () => {
    expect(getExpertActionType({ profession: 'Mentor' })).toBe('mentor');
    expect(getExpertActionType({ profession: 'Advokat' })).toBe('consultant');
  });
});

describe('formatExpertPublicPrice', () => {
  it('formats hourly price', () => {
    expect(formatExpertPublicPrice({ hourly_rate: 50, currency: 'MALI' }, t)).toEqual({
      line: 'price_per_hour_short: 50 MALI',
      isSession: false,
    });
  });

  it('formats session price', () => {
    expect(
      formatExpertPublicPrice({ service_price: '80', pricing_model: 'session' }, t)
    ).toEqual({
      line: 'price_per_session_short: 80 MALI',
      isSession: true,
    });
  });
});

describe('getExpertSpecialtyLine', () => {
  it('prefers specialization_details', () => {
    expect(
      getExpertSpecialtyLine({
        specialization_details: 'Frontend',
        specialization: 'IT',
      })
    ).toBe('Frontend');
  });
});

describe('getExpertListingPitch', () => {
  it('prefers specialty_desc then proposal then bio', () => {
    expect(
      getExpertListingPitch({
        specialty_desc: 'A',
        expert_proposal: 'B',
        bio_expert: 'C',
      })
    ).toBe('A');
    expect(getExpertListingPitch({ expert_proposal: 'B', bio_expert: 'C' })).toBe('B');
    expect(getExpertListingPitch({ bio_expert: 'C' })).toBe('C');
    expect(getExpertListingPitch({})).toBe('');
  });
});

describe('countExpertGroups', () => {
  it('counts array and JSON string groups', () => {
    expect(countExpertGroups(['a', 'b'])).toBe(2);
    expect(countExpertGroups('["a"]')).toBe(1);
    expect(countExpertGroups('not-json')).toBe(0);
    expect(countExpertGroups(null)).toBe(0);
  });
});

describe('parseStudentSessionStyle', () => {
  it('parses known styles', () => {
    expect(parseStudentSessionStyle('legal')).toBe('legal');
    expect(parseStudentSessionStyle('PSYCHOLOGY')).toBe('psychology');
  });

  it('defaults to mentor', () => {
    expect(parseStudentSessionStyle('unknown')).toBe('mentor');
    expect(parseStudentSessionStyle(null)).toBe('mentor');
  });
});
