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

function playInlineBeep(): void {
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.28);
  } catch {
    /* ignore */
  }
}

/**
 * Yangi chat xabari uchun bildirishnoma:
 * - Mobil: faqat tizim bildirishnomasi (`silent: false` → foydalanuvchi tanlagan bildirishnoma ovozi) + vibratsiya;
 *   qo‘shimcha Web Audio bip yo‘q (tizim ovozi bilan ikkilanmaydi).
 * - Ruxsat yo‘q bo‘lsa: engil ichki bip.
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
        silent: false,
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
    return;
  }

  playInlineBeep();
}
