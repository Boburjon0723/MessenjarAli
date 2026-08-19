/**
 * Sintetik qo'ng'iroq ovozlari — Web Audio API orqali,
 * tashqi .mp3 ga bog'liq emas.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
    if (!ctx || ctx.state === 'closed') {
        ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
}

function playTone(freq: number, duration: number, gain = 0.15): OscillatorNode | null {
    try {
        const ac = getCtx();
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.value = gain;
        g.gain.setTargetAtTime(0, ac.currentTime + duration - 0.05, 0.02);
        osc.connect(g).connect(ac.destination);
        osc.start(ac.currentTime);
        osc.stop(ac.currentTime + duration);
        return osc;
    } catch {
        return null;
    }
}

/**
 * Kiruvchi qo'ng'iroq ringtone — ikki tonli "brrr-brrr" har 2s
 * Returns stop function.
 */
export function playIncomingRing(): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const ring = () => {
        if (stopped) return;
        playTone(440, 0.15, 0.12);
        setTimeout(() => { if (!stopped) playTone(440, 0.15, 0.12); }, 200);
        setTimeout(() => { if (!stopped) playTone(523, 0.15, 0.12); }, 450);
        setTimeout(() => { if (!stopped) playTone(523, 0.15, 0.12); }, 650);
    };

    ring();
    timer = setInterval(ring, 2000);

    return () => {
        stopped = true;
        if (timer) clearInterval(timer);
    };
}

/**
 * Chiquvchi calling tone — davomiy "tuuut... tuuut..." (Telegram uslubi)
 * Returns stop function.
 */
export function playOutgoingTone(): () => void {
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const beep = () => {
        if (stopped) return;
        playTone(425, 1.0, 0.08);
    };

    beep();
    timer = setInterval(beep, 3000);

    return () => {
        stopped = true;
        if (timer) clearInterval(timer);
    };
}
