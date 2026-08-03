import type { Language } from '@/lib/translations';

export function stripHtmlLite(s: string) {
    return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

export function flattenDdgRelatedTopics(raw: unknown): { title: string; url: string }[] {
    const out: { title: string; url: string }[] = [];
    const walk = (items: unknown) => {
        if (!Array.isArray(items)) return;
        for (const t of items) {
            if (!t || typeof t !== 'object') continue;
            const o = t as { Topics?: unknown; Text?: string; FirstURL?: string };
            if (Array.isArray(o.Topics)) walk(o.Topics);
            else if (o.Text && o.FirstURL) {
                out.push({ title: stripHtmlLite(String(o.Text)), url: String(o.FirstURL) });
            }
        }
    };
    walk(raw);
    return out.slice(0, 18);
}

export function formatMaliUi(n: number, lang: Language) {
    if (n == null || Number.isNaN(n)) return '—';
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ';
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);
}

export type ConsultChatFinancialPrep = {
    clientUserId: string;
    clientName: string | null;
    clientLockedBalance: number;
    expertServicePrice: number | null;
    session: { id: string; status: string; amountMali: number } | null;
};

/** DB (question_text / option_text) va frontend shakllarini birlashtirish */
export function normalizeQuizFromApi(q: any) {
    if (!q) return q;
    return {
        ...q,
        questions: (q.questions || []).map((qq: any) => ({
            ...qq,
            text: qq.text ?? qq.question_text ?? '',
            typeof: qq.typeof ?? qq.question_type ?? 'multiple_choice',
            options: (qq.options || []).map((o: any, oi: number) => ({
                ...o,
                id: o.id != null ? String(o.id) : `opt-${oi}`,
                text: o.text ?? o.option_text ?? '',
                label: o.option_text ?? o.text ?? '',
                isCorrect: Boolean(o.is_correct ?? o.isCorrect),
            })),
        })),
    };
}

export function buildQuizChatSummary(q: any, t: any): string {
    const n = normalizeQuizFromApi(q);
    const lines = [`📝 **${t('quiz_label')}:** ${n.title || t('test_label')}`];
    (n.questions || []).forEach((qq: any, i: number) => {
        lines.push(`${i + 1}. ${qq.text || ''}`);
        (qq.options || []).forEach((o: any, j: number) => {
            lines.push(`   ${String.fromCharCode(65 + j)}. ${o.text || ''}`);
        });
    });
    lines.push(`_${t('quiz_chat_notice')}_`);
    return lines.join('\n');
}
