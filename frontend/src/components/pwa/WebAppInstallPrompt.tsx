"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Download, X, Share2, MoreVertical } from "lucide-react";

/** Chrome/Edge `beforeinstallprompt` (TypeScript) */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Faqat mobil qurilmalar (telefon, planshet); desktop brauzer — yo‘q */
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) return true;
  if (/iPad/.test(ua)) return true;
  // iPadOS Safari: ba’zan «Macintosh», lekin sensorli ekran
  if (typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) {
    return true;
  }
  return false;
}

/** Android telefon/planshet (Chrome `beforeinstallprompt` ba’zan kelmaydi — masalan HTTP + LAN IP) */
function isAndroidMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

const PWA_PROMPT_DISMISSED_KEY = "expertline-pwa-install-prompt-dismissed";

/** iPadOS Safari ba’zan Macintosh + touch */
function isAppleTouchSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    isIOS() ||
    (/Macintosh/.test(navigator.userAgent) &&
      typeof navigator.maxTouchPoints === "number" &&
      navigator.maxTouchPoints > 1)
  );
}

/**
 * Faqat mobil: PWA o‘rnatish (Android Chrome) yoki iOS qo‘lda qo‘shish ko‘rsatmasi.
 */
export default function WebAppInstallPrompt() {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installedHint, setInstalledHint] = useState(false);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(PWA_PROMPT_DISMISSED_KEY) === "1") setDismissed(true);
    } catch {
      /* private mode / blocked */
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(PWA_PROMPT_DISMISSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (isMobile !== true) return;
    if (typeof window !== "undefined" && isStandalone()) return;

    navigator.serviceWorker?.register("/sw.js").catch(() => {});

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, [isMobile]);

  const handleInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setDeferred(null);
    if (outcome === "accepted") setInstalledHint(true);
  }, [deferred]);

  if (isMobile !== true) return null;
  if (isStandalone()) return null;
  if (dismissed) return null;

  if (installedHint) {
    return (
      <div className="fixed bottom-4 left-1/2 z-[300] max-w-md -translate-x-1/2 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-center text-sm text-emerald-100 shadow-lg backdrop-blur-md">
        Ilova o‘rnatildi. Keyingi safar ikonka orqali ochishingiz mumkin.
      </div>
    );
  }

  const showChromeBanner = Boolean(deferred);
  const showIosBanner = !deferred && isAppleTouchSafari();
  /** `beforeinstallprompt` yo‘q bo‘lsa ham (odatda HTTP+LAN) — foydalanuvchi menyudan o‘rnatishi mumkin */
  const showAndroidManualBanner = !deferred && isAndroidMobile() && !isAppleTouchSafari();

  if (!showChromeBanner && !showIosBanner && !showAndroidManualBanner) return null;

  return (
    <div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[300] flex w-[min(100%-2rem,28rem)] -translate-x-1/2 flex-col gap-2 rounded-2xl border border-white/15 bg-[#0f172a]/95 p-4 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-label="Ilovani o‘rnatish"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-2 text-white">
          {showChromeBanner ? (
            <Download className="h-5 w-5 shrink-0 text-sky-400" aria-hidden />
          ) : showIosBanner ? (
            <Share2 className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
          ) : (
            <MoreVertical className="h-5 w-5 shrink-0 text-violet-400" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold leading-snug">
              {showChromeBanner
                ? "ExpertLine ilovasini o‘rnating"
                : showIosBanner
                  ? "Safari (iPhone / iPad)"
                  : "Chrome (Android)"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              {showChromeBanner
                ? "Tezroq kirish va alohida oyna — bitta tugma bilan."
                : showIosBanner
                  ? "Safari: pastidagi «Ulashish» ⊞, keyin «Asosiy ekranga qo‘shish» ni tanlang."
                  : "Yuqori o‘ngdagi «⋮» menyuni oching — «Ilovani o‘rnatish» yoki «Bosh ekranga qo‘shish» ni tanlang."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismissPrompt}
          className="shrink-0 self-start rounded-lg border border-white/20 bg-white/10 p-2 text-white shadow-sm hover:bg-white/20 active:scale-95"
          aria-label="Yopish"
        >
          <X className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      {showChromeBanner && (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/40 transition hover:bg-sky-500 active:scale-[0.99]"
        >
          <Download className="h-4 w-4" />
          Yuklab olish / O‘rnatish
        </button>
      )}

      {showIosBanner && (
        <p className="text-[11px] leading-relaxed text-white/55">
          Safari: <span className="font-semibold text-white/80">Ulashish</span> →{" "}
          <span className="font-semibold text-white/80">Asosiy ekranga qo‘shish</span>.
        </p>
      )}

      {showAndroidManualBanner && (
        <p className="text-[11px] leading-relaxed text-white/55">
          Agar menyuda «O‘rnatish» bo‘lmasa, sayt{" "}
          <span className="font-semibold text-white/75">HTTPS</span> yoki kompyuter bilan USB orqali{" "}
          <span className="font-semibold text-white/75">localhost</span> orqali ochilgan bo‘lishi kerak — shunda
          yashirin «Yuklab olish» tugmasi ham chiqadi.
        </p>
      )}

      <button
        type="button"
        onClick={dismissPrompt}
        className="w-full rounded-lg py-2.5 text-center text-xs font-medium text-white/60 underline decoration-white/30 underline-offset-2 hover:text-white/90"
      >
        Ko‘rsatmani yopish
      </button>
    </div>
  );
}

