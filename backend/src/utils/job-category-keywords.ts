/** job_categories.id → profession/specialization qidiruv kalitlari */
export const JOB_CATEGORY_KEYWORDS: Record<number, readonly string[]> = {
    1: ['yurist', 'huquq', 'advokat', 'lawyer', 'jurist', 'notarius', 'huquqshunos'],
    2: ['psixolog', 'psycholog', 'terapevt', 'psixoterap', 'klinik psix'],
    3: ['repetitor', 'oqituvchi', "o'qituvchi", 'mentor', 'teacher', 'tutor', 'ustoz'],
    4: ['santexnik', 'plumber', 'santex'],
    5: ['elektrik', 'electric'],
    6: ['usta', 'remont', 'quruvchi'],
    7: ['fotograf', 'videograf', 'photo', 'camera'],
    8: ['avtomobil', 'avto', 'mashina', 'car', 'avtoservis'],
    9: ['buxgalter', 'accountant', 'hisob'],
    10: ['hamshira', 'qarovchi', 'med', 'sidelka', 'nurse', 'parxez'],
};

export function categoryKeywordPatterns(categoryId: number): string[] | null {
    const keys = JOB_CATEGORY_KEYWORDS[categoryId];
    if (!keys?.length) return null;
    return keys.map((k) => `%${k}%`);
}
