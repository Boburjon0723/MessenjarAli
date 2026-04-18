/**
 * Mutaxassis kasbi bo'yicha UI harakatlari (dars / maslahat) — ProfileViewer bilan bir xil ro'yxat.
 */

export const MENTOR_PROFESSIONS = new Set([
  "O'qituvchi",
  'Mentor',
  'Startap mentori',
  'Dasturchi mentor',
]);

export function isMentorProfession(prof: string | undefined | null): boolean {
  if (!prof || typeof prof !== 'string') return false;
  const t = prof.trim();
  if (MENTOR_PROFESSIONS.has(t)) return true;
  const k = professionKey(t);
  if (!k) return false;
  /** DBda turli apostrof / dash: "O‘qituvchi", "Matematika o‘qituvchisi" */
  if (
    /\boqituvchi\b|mentor|teacher|tutor|ustoz|ustoz\s|repetitor|professor|препод|наставник|репетитор/.test(k)
  ) {
    return true;
  }
  if (/dasturchi\s*mentor|startap\s*mentor/.test(k)) return true;
  return false;
}

/** Advokat / yurist — aniq ro'yxat (DBda bosh harf farqi, "Advakat" imlosi) */
const LEGAL_PROFESSION_KEYS = new Set([
  "advokat",
  "advakat",
  "yurist",
  "huquqshunos",
  "advocate",
  "attorney",
  "jurist",
  "notarius",
  "адвокат",
  "юрист",
]);

function professionKey(prof: string | undefined | null): string {
  if (!prof || typeof prof !== 'string') return '';
  return prof
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ё/g, 'е');
}

export function isLegalProfession(prof: string | undefined | null): boolean {
  const k = professionKey(prof);
  if (!k) return false;
  if (LEGAL_PROFESSION_KEYS.has(k)) return true;
  if (/advok|yurist|huquq|jurist|notarius|lawyer|attorne|advocate/.test(k)) return true;
  return false;
}

export type ExpertActionKind = 'mentor' | 'consultant' | null;

/** Mutaxassis paneli rejimi — mentor darsidan boshqa kasblar uchun alohida matn va funksiya filtri */
export type ExpertPanelMode = 'mentor' | 'legal' | 'psychology' | 'consult';

export type ExpertPanelLabels = {
  header: string;
  roleLine: string;
  sessionNotifyWord: string;
  primaryStartLabel: string;
  primaryStartedLabel: string;
  rightPanelMaterialsTitle: string;
  /** Yuqori paneldagi taymer yorlig‘i */
  sessionTimerLabel?: string;
  /** Chap ustun: «Sessiyani boshqarish» o‘rniga */
  manageSessionTitle?: string;
  /** Konsultatsiya: mijozlar ro‘yxati bo‘sh */
  consultClientsEmptyHint?: string;
  /** Konsultatsiya: «Yakunlash» tasdiq oynasi */
  consultFinishConfirm?: string;
  /** «Qabul xabari» tugmasi tooltip */
  consultInviteTooltip?: string;
  /** O‘ng panel: fayllar ro‘yxati sarlavhasi (masalan «Kurs materiallari» / «Yuklangan hujjatlar») */
  rightPanelListSectionTitle?: string;
  /** O‘ng panel: yuklash tugmasi */
  rightPanelUploadLabel?: string;
  rightPanelUploadHint?: string;
  /** O‘ng panel yig‘ish (chevron) */
  rightPanelToggleCloseLabel?: string;
  rightPanelToggleOpenLabel?: string;
};

export function getExpertPanelLabels(mode: ExpertPanelMode, t: any): ExpertPanelLabels {
  switch (mode) {
    case 'mentor':
      return {
        header: t('panel_header_mentor'),
        roleLine: t('role_line_mentor'),
        sessionNotifyWord: t('lesson_word'),
        primaryStartLabel: t('start_lesson_btn'),
        primaryStartedLabel: t('status_started'),
        rightPanelMaterialsTitle: t('materials_and_quizzes'),
      };
    case 'legal':
      return {
        header: t('panel_header_legal'),
        roleLine: t('role_line_legal'),
        sessionNotifyWord: t('session_word'),
        primaryStartLabel: t('start_session_btn'),
        primaryStartedLabel: t('status_ongoing'),
        rightPanelMaterialsTitle: t('materials_and_docs'),
        sessionTimerLabel: t('session_timer_label_legal'),
        manageSessionTitle: t('manage_session_title_legal'),
        consultClientsEmptyHint: t('no_clients_hint_legal'),
        consultFinishConfirm: t('finish_session_confirm_legal'),
        consultInviteTooltip: t('invite_tooltip_legal'),
        rightPanelListSectionTitle: t('right_panel_list_docs'),
        rightPanelUploadLabel: t('upload_doc_btn'),
        rightPanelUploadHint: t('upload_hint_legal'),
        rightPanelToggleCloseLabel: t('toggle_panel_docs_close'),
        rightPanelToggleOpenLabel: t('toggle_panel_docs_open'),
      };
    case 'psychology':
      return {
        header: t('panel_header_psychology'),
        roleLine: t('role_line_psychology'),
        sessionNotifyWord: t('session_word'),
        primaryStartLabel: t('start_session_btn'),
        primaryStartedLabel: t('status_ongoing'),
        rightPanelMaterialsTitle: t('materials'),
        sessionTimerLabel: t('session_timer_label_general'),
        manageSessionTitle: t('manage_session_title_psychology'),
        consultClientsEmptyHint: t('no_clients_hint_psych'),
        consultFinishConfirm: t('finish_session_confirm_psych'),
        consultInviteTooltip: t('invite_tooltip_psych'),
        rightPanelListSectionTitle: t('right_panel_list_materials'),
        rightPanelUploadLabel: t('upload_material_btn'),
        rightPanelUploadHint: t('upload_hint_general'),
        rightPanelToggleCloseLabel: t('toggle_panel_materials_close'),
        rightPanelToggleOpenLabel: t('toggle_panel_materials_open'),
      };
    case 'consult':
    default:
      return {
        header: t('panel_header_consult'),
        roleLine: t('role_line_consult'),
        sessionNotifyWord: t('session_word'),
        primaryStartLabel: t('start_meeting_btn'),
        primaryStartedLabel: t('status_ongoing'),
        rightPanelMaterialsTitle: t('materials'),
        sessionTimerLabel: t('session_timer_label_general'),
        manageSessionTitle: t('manage_session_title_general'),
        consultClientsEmptyHint: t('no_clients_hint_consult'),
        consultFinishConfirm: t('finish_session_confirm_consult'),
        consultInviteTooltip: t('invite_tooltip_consult'),
        rightPanelListSectionTitle: t('right_panel_list_general'),
        rightPanelUploadLabel: t('upload_material_btn'),
        rightPanelUploadHint: t('upload_hint_general'),
        rightPanelToggleCloseLabel: t('toggle_panel_materials_close'),
        rightPanelToggleOpenLabel: t('toggle_panel_materials_open'),
      };
  }
}

/**
 * Profil maydonlaridan panel rejimini aniqlash (1-bosqich: UI va klass uchun vositalar filtri).
 */
export function getExpertPanelMode(expert: {
  profession?: string;
  specialty?: string;
  bio_expert?: string;
  specialty_desc?: string;
} | null): ExpertPanelMode {
  if (!expert) return 'consult';

  const profession = (expert.profession || '').trim();
  if (isMentorProfession(profession)) return 'mentor';

  /** Huquq / psixologiya — avval (bio'da "dars" so'zi bo'lsa ham mentor bo'lib ketmasin) */
  if (isLegalProfession(expert.profession) || isLegalProfession(expert.specialty)) {
    return 'legal';
  }

  const p = (expert.profession || expert.specialty || '').toLowerCase();
  const bio = (expert.bio_expert || expert.specialty_desc || '').toLowerCase();
  const text = `${p} ${bio}`;

  if (
    /psixolog|psixoterap|psycholog|klinik psix|oila psix|bolalar psix|terapevt|psixiatr|psixosomat|mental|depressiya|\bstress\b|trevoga|anxiety/i.test(
      text
    )
  ) {
    return 'psychology';
  }

  if (
    /advokat|advakat|yurist|lawyer|huquqshunos|jurist|notarius|soliq maslahatchi|migratsiya|mehnat huquqi|advocate|attorney|legal\b|compliance|адвокат|юрист/i.test(
      text
    )
  ) {
    return 'legal';
  }

  /** Mentor konteksti: "coach" qo'shilmagan — "career coach" konsultatsiyada qolishi kerak */
  if (
    /o['']?qituvchi|mentor|teacher|tutor|startap|dasturchi\s*mentor|\blesson\b|\bustoz\b|repetitor|professor|препод|наставник|репетитор/i.test(
      text
    )
  ) {
    return 'mentor';
  }

  if (
    /maslahat|career coach|dietolog|shifokor|nutrient|reabilitatsiya|konferans|biznes maslahat|consultant|consulting/i.test(
      text
    )
  ) {
    return 'consult';
  }

  return 'consult';
}

export function isMentorPanelMode(mode: ExpertPanelMode): boolean {
  return mode === 'mentor';
}

/** Soket `consult_panel_invite` — mijoz chatidagi taklif matni uchun */
export type ConsultPanelInviteStyle = 'mentor' | 'consult' | 'legal' | 'psychology';

export function getConsultPanelInviteSessionStyle(mode: ExpertPanelMode): ConsultPanelInviteStyle {
  if (mode === 'legal') return 'legal';
  if (mode === 'psychology') return 'psychology';
  return 'consult';
}

/**
 * Mentor: aniq kasb ro'yxati yoki matn (bio) bo'yicha.
 * Maslahatchi: huquq / psixologiya va boshqa konsultantlar — regex + aniq qiymatlar.
 */
export function getExpertActionType(expert: {
  profession?: string;
  specialty?: string;
  bio_expert?: string;
  specialty_desc?: string;
} | null): ExpertActionKind {
  if (!expert) return null;

  const mode = getExpertPanelMode(expert);
  if (mode === 'mentor') return 'mentor';
  return 'consultant';
}

/** E'lon / ro'yxat kartalarida narx va birlik matni */
export function formatExpertPublicPrice(exp: {
  hourly_rate?: number | string;
  service_price?: number | string;
  currency?: string;
  pricing_model?: string;
}, t: any): { line: string; isSession: boolean } {
  const raw = exp.hourly_rate ?? exp.service_price ?? 0;
  const amount = typeof raw === 'string' ? parseFloat(raw) || 0 : Number(raw) || 0;
  const cur = exp.currency || 'MALI';
  const isSession = exp.pricing_model === 'session';
  const unit = isSession ? t('price_per_session_short') : t('price_per_hour_short');
  const line = `${unit}: ${amount} ${cur}`;
  return { line, isSession };
}

export function getExpertSpecialtyLine(exp: {
  specialization_details?: string;
  specialization?: string;
}): string {
  const a = (exp.specialization_details || '').trim();
  const b = (exp.specialization || '').trim();
  return a || b || '';
}

/** E‘lon va kartada: avvalo birlashgan tavsif (`specialty_desc`), keyin eski `expert_proposal`, so‘ng bio. */
export function getExpertListingPitch(exp: {
  expert_proposal?: string;
  bio_expert?: string;
  specialty_desc?: string;
}): string {
  const s = (exp.specialty_desc || '').trim();
  if (s) return s;
  const p = (exp.expert_proposal || '').trim();
  if (p) return p;
  const b = (exp.bio_expert || '').trim();
  if (b) return b;
  return '';
}

/** Mutaxassis formasidagi placeholderlar — kasb rejimiga qarab (mentor / psixolog / huquq / boshqalar). */
export type ExpertFormPlaceholders = {
  direction: string;
  /** Mutaxassislik tavsifi + mijozga taklif (e‘lon matni) */
  listing: string;
  /** Tajriba (yil) — qisqa namuna */
  experienceExample: string;
};

export function getExpertFormPlaceholders(mode: ExpertPanelMode, t: any): ExpertFormPlaceholders {
  switch (mode) {
    case 'mentor':
      return {
        direction: t('placeholder_direction_mentor'),
        listing: t('placeholder_listing_mentor'),
        experienceExample: '6',
      };
    case 'psychology':
      return {
        direction: t('placeholder_direction_psychology'),
        listing: t('placeholder_listing_psychology'),
        experienceExample: '10',
      };
    case 'legal':
      return {
        direction: t('placeholder_direction_legal'),
        listing: t('placeholder_listing_legal'),
        experienceExample: '8',
      };
    case 'consult':
    default:
      return {
        direction: t('placeholder_direction_consult'),
        listing: t('placeholder_listing_consult'),
        experienceExample: '5',
      };
  }
}

export function countExpertGroups(expertGroups: unknown): number {
  if (!expertGroups) return 0;
  try {
    const arr =
      typeof expertGroups === 'string' ? JSON.parse(expertGroups) : expertGroups;
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

export function formatServiceFormatLabel(serviceFormat: string | undefined, t: any): string {
  const v = (serviceFormat || '').toLowerCase();
  if (v === 'online') return t('job_type_online');
  if (v === 'offline') return t('job_type_offline');
  if (!v) return '—';
  return serviceFormat || '—';
}

/** `/messages?room=...&style=` — talaba/mijoz jonli paneli */
export function parseStudentSessionStyle(raw: string | null | undefined): ExpertPanelMode {
  if (!raw || typeof raw !== 'string') return 'mentor';
  const k = raw.trim().toLowerCase();
  if (k === 'legal' || k === 'psychology' || k === 'consult' || k === 'mentor') return k;
  return 'mentor';
}

export function getStudentPanelExpertLabel(mode: ExpertPanelMode, t: any): string {
  switch (mode) {
    case 'legal':
      return t('expert_role_legal');
    case 'psychology':
      return t('expert_role_psychology');
    case 'consult':
      return t('expert_role_consult');
    default:
      return t('expert_role_mentor');
  }
}

/** Chap yuqori: «Talaba» yoki «Mijoz» */
export function getStudentSelfRoleLabel(mode: ExpertPanelMode, t: any): string {
  return mode === 'mentor' ? t('self_role_student') : t('self_role_client');
}


