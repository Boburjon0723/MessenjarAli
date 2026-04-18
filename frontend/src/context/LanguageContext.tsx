"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Language, TranslationKeys } from '@/lib/translations';

function applyVars(s: string, variables?: Record<string, string | number>): string {
    let out = s;
    if (variables) {
        Object.entries(variables).forEach(([k, v]) => {
            out = out.replaceAll(`{${k}}`, String(v));
        });
    }
    return out;
}

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKeys, variables?: Record<string, string | number>) => string;
    /** Bullet ro‘yxat matnlari (masalan mentor_payment_lines) */
    tLines: (key: TranslationKeys, variables?: Record<string, string | number>) => string[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguageState] = useState<Language>('ru');

    useEffect(() => {
        const storedLang = localStorage.getItem('app-lang') as Language;
        if (storedLang && (storedLang === 'uz' || storedLang === 'ru' || storedLang === 'en')) {
            setLanguageState(storedLang);
        } else {
            const browserLang = navigator.language || navigator.languages?.[0] || 'ru';
            if (browserLang.startsWith('uz')) {
                setLanguageState('uz');
            } else if (browserLang.startsWith('en')) {
                setLanguageState('en');
            } else {
                setLanguageState('ru');
            }
        }
    }, []);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app-lang', lang);
        document.documentElement.lang = lang;
    };

    const resolveRaw = (key: TranslationKeys): string | string[] => {
        const transObj = translations[language] || translations.ru;
        const raw = transObj[key as keyof typeof transObj]
            ?? translations.en[key as keyof typeof translations.en]
            ?? translations.uz[key as keyof typeof translations.uz]
            ?? key;
        return raw as string | string[];
    };

    const tLines = (key: TranslationKeys, variables?: Record<string, string | number>): string[] => {
        const raw = resolveRaw(key);
        if (Array.isArray(raw)) {
            return raw.map((line) => applyVars(String(line), variables));
        }
        return [applyVars(String(raw), variables)];
    };

    const t = (key: TranslationKeys, variables?: Record<string, string | number>): string => {
        const raw = resolveRaw(key);
        if (Array.isArray(raw)) {
            return raw.map((line) => applyVars(String(line), variables)).join('\n');
        }
        return applyVars(String(raw), variables);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, tLines }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};


