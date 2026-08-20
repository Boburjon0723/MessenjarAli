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
 * Yangi SMS / chat xabarnoma ovozi — yumshoq uch tonli "pling".
 * Mixkit CDN va eski qattiq bip o‘rniga (Telegram/iMessage uslubi).
 */
export function playMessageNotificationSound(): void {
  try {
    const ctx = getAlertAudioCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.11, t0 + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    master.connect(ctx.destination);

    const tone = (
      freq: number,
      start: number,
      dur: number,
      peak: number,
      type: OscillatorType = 'sine'
    ) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0 + start);
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.03);
    };

    // Yumshoq "ti-du-ding" (SMS chime)
    tone(880, 0, 0.06, 0.5); // A5
    tone(1174.7, 0.05, 0.08, 0.42); // D6
    tone(1568, 0.11, 0.12, 0.28, 'triangle'); // G6 soft
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
    playMessageNotificationSound();
    return;
  }

  playMessageNotificationSound();
}


