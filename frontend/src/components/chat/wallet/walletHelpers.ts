import React from 'react';

/** Mobil hamyonda modallar glass-premium orqasidan fon "ko'rinib" qolmasin */
export const WALLET_MODAL_SOLID_STYLE: React.CSSProperties = {
    background: '#151820',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
};

/** Mobil pastki tab bar + safe-area: modal tug'malari yashirinmasin */
export const WALLET_MODAL_FOOTER_CLASS =
    'shrink-0 border-t border-white/10 bg-[#151820] px-4 sm:px-6 pt-2.5 pb-[max(0.75rem,calc(72px+env(safe-area-inset-bottom,0px)+0.35rem))]';

export function walletDigitsOnly(s: string): string {
    return s.replace(/\D/g, '');
}

export function walletPhonesMatch(input: string, contactPhone: string): boolean {
    const a = walletDigitsOnly(input);
    const b = walletDigitsOnly(contactPhone);
    if (!a || !b) return false;
    if (a === b) return true;
    const tail = (x: string) => x.slice(-9);
    return tail(a) === tail(b);
}

export function walletResolveRecipientFromPhone(phone: string, list: any[]): string {
    const matches = list.filter((c) => walletPhonesMatch(phone, String(c.phone || '')));
    if (matches.length === 1) return String(matches[0].id);
    return '';
}
