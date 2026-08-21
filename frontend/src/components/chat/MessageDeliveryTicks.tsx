import React from 'react';

type TickStatus = 'pending' | 'sent' | 'read';

type Props = {
    status: TickStatus;
    /** Bubble ichida oq/ko‘k; list da kulrang/ko‘k */
    tone?: 'bubble' | 'list';
    className?: string;
};

/**
 * Telegram uslubi: bitta ✓ yuborildi, ikkita ✓✓ o‘qildi.
 * Ikkalasi ham bir xil rang — ustma-ust emas, biroz siljigan.
 */
export function MessageDeliveryTicks({ status, tone = 'bubble', className = '' }: Props) {
    if (status === 'pending') {
        return (
            <svg
                className={`h-3.5 w-3.5 shrink-0 ${tone === 'bubble' ? 'text-white/70' : 'text-[#aaaaaa]'} ${className}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="pending"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        );
    }

    const color =
        status === 'read'
            ? 'text-[#8eecff]'
            : tone === 'bubble'
              ? 'text-white/85'
              : 'text-[#aaaaaa]';

    if (status === 'sent') {
        return (
            <svg
                className={`h-[14px] w-[14px] shrink-0 ${color} ${className}`}
                viewBox="0 0 14 12"
                fill="none"
                aria-label="sent"
            >
                <path
                    d="M1.2 6.8 L4.4 10 L12.5 1.8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    // read — ikkita parallel galochka (Telegram double-check)
    return (
        <svg
            className={`h-[14px] w-[18px] shrink-0 ${color} ${className}`}
            viewBox="0 0 18 12"
            fill="none"
            aria-label="read"
        >
            <path
                d="M1 6.8 L3.8 9.6 L10.2 2.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M6.2 9.6 L14.8 2.2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
