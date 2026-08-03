'use client';

import React from 'react';

export type QuizQuestionDraft = {
    text: string;
    typeof?: string;
    options: { text: string; isCorrect: boolean }[];
};

export type DashboardQuizModalProps = {
    t: (...args: any[]) => string;
    open: boolean;
    newQuizTitle: string;
    setNewQuizTitle: (v: string) => void;
    newQuestions: QuizQuestionDraft[];
    setNewQuestions: React.Dispatch<React.SetStateAction<QuizQuestionDraft[]>>;
    onClose: () => void;
    onSave: () => void;
};

export function DashboardQuizModal({
    t,
    open,
    newQuizTitle,
    setNewQuizTitle,
    newQuestions,
    setNewQuestions,
    onClose,
    onSave,
}: DashboardQuizModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#161927] border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
                <h2 className="text-lg font-bold text-white mb-4">{t('create_quiz_label')}</h2>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
                    <div>
                        <label className="text-xs text-slate-400 font-bold mb-1 block">{t('quiz_title_label')}</label>
                        <input
                            type="text"
                            value={newQuizTitle}
                            onChange={(e) => setNewQuizTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                            placeholder={t('quiz_title_placeholder')}
                        />
                    </div>

                    {newQuestions.map((q, qIndex) => (
                        <div key={qIndex} className="p-3 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-white">
                                    {t('question_label')} {qIndex + 1}
                                </span>
                                {newQuestions.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setNewQuestions((prev) => prev.filter((_, i) => i !== qIndex))
                                        }
                                        className="text-red-400 text-xs"
                                    >
                                        {t('delete_btn')}
                                    </button>
                                )}
                            </div>
                            <input
                                type="text"
                                value={q.text}
                                onChange={(e) => {
                                    const arr = [...newQuestions];
                                    arr[qIndex] = { ...arr[qIndex], text: e.target.value };
                                    setNewQuestions(arr);
                                }}
                                className="w-full bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white mb-2 focus:outline-none focus:border-white/20"
                                placeholder="Savol matni..."
                            />

                            <div className="space-y-1.5 pl-2 border-l border-white/10 mt-3">
                                <span className="text-[10px] uppercase text-slate-500 font-bold block mb-1">
                                    Variantlar (to&apos;g&apos;risini belgilang)
                                </span>
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name={`q-${qIndex}-correct`}
                                            checked={opt.isCorrect}
                                            onChange={() => {
                                                const arr = [...newQuestions];
                                                const options = arr[qIndex].options.map((o, i) => ({
                                                    ...o,
                                                    isCorrect: i === oIndex,
                                                }));
                                                arr[qIndex] = { ...arr[qIndex], options };
                                                setNewQuestions(arr);
                                            }}
                                            className="w-3 h-3 cursor-pointer shrink-0"
                                        />
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) => {
                                                const arr = [...newQuestions];
                                                const options = [...arr[qIndex].options];
                                                options[oIndex] = { ...options[oIndex], text: e.target.value };
                                                arr[qIndex] = { ...arr[qIndex], options };
                                                setNewQuestions(arr);
                                            }}
                                            className="w-full bg-transparent border-b border-white/10 px-1 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                                            placeholder="Variant matni..."
                                        />
                                        {q.options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const arr = [...newQuestions];
                                                    let opts = arr[qIndex].options.filter((_, i) => i !== oIndex);
                                                    if (!opts.some((o) => o.isCorrect) && opts[0]) {
                                                        opts = opts.map((o, i) => ({
                                                            ...o,
                                                            isCorrect: i === 0,
                                                        }));
                                                    }
                                                    arr[qIndex] = { ...arr[qIndex], options: opts };
                                                    setNewQuestions(arr);
                                                }}
                                                className="text-red-400 hover:text-red-300 text-xs shrink-0"
                                                title="Variantni o'chirish"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const arr = [...newQuestions];
                                        arr[qIndex] = {
                                            ...arr[qIndex],
                                            options: [
                                                ...(arr[qIndex].options || []),
                                                { text: '', isCorrect: false },
                                            ],
                                        };
                                        setNewQuestions(arr);
                                    }}
                                    className="mt-1.5 text-xs text-slate-400 hover:text-white border border-dashed border-white/20 rounded-lg px-2 py-1"
                                >
                                    + Yana variant qo&apos;shish
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={() =>
                            setNewQuestions((prev) => [
                                ...prev,
                                {
                                    text: '',
                                    typeof: 'multiple_choice',
                                    options: [
                                        { text: '', isCorrect: true },
                                        { text: '', isCorrect: false },
                                    ],
                                },
                            ])
                        }
                        className="w-full py-2 border border-dashed border-white/20 rounded-xl text-xs text-slate-400 hover:text-white hover:border-white/40 transition-all"
                    >
                        + Yana savol qo&apos;shish
                    </button>
                </div>

                <div className="pt-4 mt-2 border-t border-white/10 flex gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl bg-white/5 text-white text-xs font-bold hover:bg-white/10"
                    >
                        Bekor qilish
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!newQuizTitle}
                        className={`flex-1 py-2 rounded-xl text-white text-xs font-bold ${
                            newQuizTitle
                                ? 'bg-blue-600 hover:bg-blue-500'
                                : 'bg-slate-700 cursor-not-allowed'
                        }`}
                    >
                        Saqlash
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DashboardQuizModal;
