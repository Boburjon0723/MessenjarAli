import { type RefObject, useLayoutEffect } from 'react';

/**
 * Gorizontal kategoriya navigatsiyasi: sichqoncha g'ildiragini va trackpadni
 * gorizontal aylantirish (Shift+g'ildirak yoki oddiy g'ildirak ustida).
 */
export function useHorizontalNavWheel(
    ref: RefObject<HTMLElement | null>,
    attachWhen: boolean = true
) {
    useLayoutEffect(() => {
        if (!attachWhen) return;
        const el = ref.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (el.scrollWidth <= el.clientWidth) return;
            const dx = e.deltaX;
            const dy = e.deltaY;
            if (e.shiftKey || Math.abs(dx) > Math.abs(dy)) {
                e.preventDefault();
                el.scrollLeft += dx || dy;
                return;
            }
            if (Math.abs(dy) > 0) {
                e.preventDefault();
                el.scrollLeft += dy;
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [attachWhen]);
}
