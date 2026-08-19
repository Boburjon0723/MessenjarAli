/** job_categories.id → profession/specialization qidiruv kalitlari (backend bilan bir xil) */
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

export function expertMatchesCategory(
    expert: {
        profession?: string;
        specialization?: string;
        specialization_details?: string;
        specialty_desc?: string;
    },
    categoryId: number
): boolean {
    const keys = JOB_CATEGORY_KEYWORDS[categoryId];
    if (!keys?.length) return false;
    const hay = [
        expert.profession,
        expert.specialization,
        expert.specialization_details,
        expert.specialty_desc,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return keys.some((k) => hay.includes(k.toLowerCase()));
}
