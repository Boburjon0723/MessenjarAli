/**
 * Auth storage: token, refreshToken, user.
 * - "Eslab qolaylik" (remember me) = true: saqlash localStorage da (brauzer yopilsa ham qoladi).
 * - "Eslab qolaylik" = false: saqlash sessionStorage da (faqat shu oyna/yotiq; brauzer yopilganda o'chadi).
 * - Mobil brauzer / PWA: sessionStorage tez yo'qoladi — foydalanuvchi "faqat bu seans"ni tanlamagan bo'lsa,
 *   localStorage bilan davom etish uchun qo'shimcha qoida.
 */
const REMEMBER_ME_KEY = 'remember_me';

/** Telefon / planshet brauzeri — sessiyani saqlash uchun localStorage afzal */
export function isMobileWebClient(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** Mobil webda token yo'qolmasligi uchun joriy tanlovni localStorage bilan kuchaytirish */
function effectiveRemember(remember: boolean): boolean {
    return remember || isMobileWebClient();
}

function getStorage(): Storage {
  if (typeof window === 'undefined') return localStorage;
  return localStorage.getItem(REMEMBER_ME_KEY) === 'false' ? sessionStorage : localStorage;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
}

export function getUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * @param remember - true = localStorage (eslab qolish), false = sessionStorage (faqat shu sessiya).
 */
export function setAuth(
  token: string,
  refreshToken: string,
  user: Record<string, unknown>,
  remember: boolean
): void {
  if (typeof window === 'undefined') return;
  const persist = effectiveRemember(remember);
  const storage = persist ? localStorage : sessionStorage;
  const other = persist ? sessionStorage : localStorage;
  storage.setItem('token', token);
  storage.setItem('refreshToken', refreshToken);
  storage.setItem('user', JSON.stringify(user));
  /** Mobil uchun ham doimiy saqlash — UI tanlovi bilan birga */
  localStorage.setItem(REMEMBER_ME_KEY, String(persist));
  other.removeItem('token');
  other.removeItem('refreshToken');
  other.removeItem('user');
  notifyUserUpdated(user);
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('user');
}

/** Token/user o‘qishda qaysi storage dan o‘qilishini bilish uchun (masalan refresh keyingi yozishda). */
export function getStorageForAuth(): Storage {
  return getStorage();
}

/** Profil yangilanganda React (menyu/header) storage bilan sinxron bo‘lishi uchun */
export const AUTH_USER_UPDATED_EVENT = 'mali-auth-user-updated';

function notifyUserUpdated(user: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT, { detail: user }));
  } catch {
    /* ignore */
  }
}

/** Faqat user ni yangilash (profil o‘zgarishi va h.k.). */
export function setUser(user: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  getStorage().setItem('user', JSON.stringify(user));
  notifyUserUpdated(user);
}
