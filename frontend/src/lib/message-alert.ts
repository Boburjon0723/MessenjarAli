/**
 * Socket / API xabarlaridan chat UUID ni bir xil ko‘rinishda ajratish
 */
export function getMessageChatId(message: Record<string, unknown> | null | undefined): string {
  if (!message) return "";
  const raw =
    message.chat_id ?? message.chatId ?? message.roomId ?? message.room_id;
  if (raw == null || raw === "") return "";
  return String(raw);
}

/** Telefon / planshet web: tizim bildirishnomalari va ovoz (PWA, Chrome Android, va h.k.) */
export function isMobileMessagingClient(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  if (typeof window !== "undefined" && "ontouchstart" in window) {
    try {
      return window.matchMedia("(max-width: 1024px)").matches;
    } catch {
      return true;
    }
  }
  return false;
}

function prefersSystemNotificationSound(): boolean {
  return isMobileMessagingClient();
}

const MOBILE_NOTIF_PROMPT_KEY = "mali_mobile_notif_prompt_v1";

/**
 * Mobil qurilmada chat ochilganda bildirishnomalarga ruxsatni oldindan so‘raydi (bir marta, keyin localStorage).
 */
export function promptMobileNotificationPermissionEarly(): void {
  if (typeof window === "undefined") return;
  if (!isMobileMessagingClient()) return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    if (localStorage.getItem(MOBILE_NOTIF_PROMPT_KEY)) return;
  } catch {
    return;
  }

  window.setTimeout(() => {
    if (Notification.permission !== "default") return;
    void Notification.requestPermission().finally(() => {
      try {
        localStorage.setItem(MOBILE_NOTIF_PROMPT_KEY, "1");
      } catch {
        /* quota / private mode */
      }
    });
  }, 900);
}

let sharedAudioCtx: AudioContext | null = null;

function getAlertAudioCtx(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Telegram Web uslubidagi yumshoq "pop" — qisqa, past, ikki tonli.
 * Eski 880 Hz uzoq bip o‘rniga.
 */
function playInlineBeep(): void {
  try {
    const ctx = getAlertAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.07, t0 + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
    master.connect(ctx.destination);

    const tone = (freq: number, start: number, dur: number, peak: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0 + start);
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    };

    // Yumshoq juft ovoz (Telegramga yaqin "du-dip")
    tone(784, 0, 0.07, 0.55); // G5
    tone(1046.5, 0.055, 0.09, 0.4); // C6
  } catch {
    /* ignore */
  }
}

/**
 * Yangi chat xabari uchun bildirishnoma:
 * - Mobil: tizim bildirishnomasi ovozi + vibratsiya (ikkilanmasin).
 * - Desktop: yumshoq ichki ovoz (Telegram uslubi); tizim banner `silent`
 *   — Windows/Chrome default "asabga tegadigan" ovoz o‘rniga.
 * - Ruxsat yo‘q: faqat yumshoq ichki ovoz.
 */
export function alertIncomingChatMessage(opts: { title: string; body: string; tag: string }): void {
  const canNotify = typeof Notification !== "undefined" && Notification.permission === "granted";
  const mobile = prefersSystemNotificationSound();

  if (canNotify) {
    try {
      new Notification(opts.title, {
        body: opts.body,
        icon: "/icon.png",
        tag: opts.tag,
        // Desktopda tizim ovozini o‘chirib, yumshoq ichki tonni qo‘yamiz
        silent: !mobile,
      });
    } catch {
      /* Safari / xavfsizlik */
    }
    if (mobile) {
      try {
        navigator.vibrate?.(140);
      } catch {
        /* ignore */
      }
      return;
    }
    playInlineBeep();
    return;
  }

  playInlineBeep();
}


