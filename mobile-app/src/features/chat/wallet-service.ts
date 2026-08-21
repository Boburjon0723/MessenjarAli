import { apiFetch } from "../../lib/api";
import type { ExpertSearchRow, TransactionRow } from "../dashboard/api";

export const MIN_TOPUP = 10;
export const MAX_TOPUP = 1_000_000;
export const MIN_WITHDRAW = 10;

export type TokenBalanceFull = {
  balance: string;
  locked_balance: string;
  hasPin: boolean;
};

export type WalletConfig = {
  adminCard: string | null;
  systemAvailableMali: number;
};

export function walletDigitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function walletPhonesMatch(input: string, contactPhone: string): boolean {
  const a = walletDigitsOnly(input);
  const b = walletDigitsOnly(contactPhone);
  if (!a || !b) return false;
  if (a === b) return true;
  const tail = (x: string) => x.slice(-9);
  return tail(a) === tail(b);
}

export function walletResolveRecipientFromPhone(
  phone: string,
  list: Array<{ id?: string; phone?: string | null }>
): string {
  const matches = list.filter((c) => walletPhonesMatch(phone, String(c.phone || "")));
  if (matches.length === 1) return String(matches[0].id);
  return "";
}

export async function fetchTokenBalance(): Promise<TokenBalanceFull | null> {
  const res = await apiFetch("/api/token/balance");
  if (!res.ok) return null;
  const data = (await res.json()) as {
    balance?: number | string;
    locked_balance?: number | string;
    hasPin?: boolean;
  };
  return {
    balance: String(data.balance ?? 0),
    locked_balance: String(data.locked_balance ?? 0),
    hasPin: !!data.hasPin,
  };
}

export async function fetchWalletConfig(): Promise<WalletConfig> {
  const res = await apiFetch("/api/token/config");
  if (!res.ok) return { adminCard: null, systemAvailableMali: 0 };
  const data = (await res.json()) as {
    admin_card_number?: string | null;
    system_available_mali?: number;
  };
  return {
    adminCard: data.admin_card_number || null,
    systemAvailableMali: Number(data.system_available_mali || 0),
  };
}

export async function setupWalletPin(pin: string): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch("/api/token/setup", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: (err as { message?: string }).message || "PIN o‘rnatib bo‘lmadi" };
}

export async function transferTokens(payload: {
  receiverId: string;
  amount: number;
  pin: string;
  note?: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch("/api/token/transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: (err as { message?: string }).message || "O‘tkazmada xatolik" };
}

export async function createTopUpRequest(amount: number): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch("/api/token/topup", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: (err as { message?: string }).message || "So‘rov yuborilmadi" };
}

export async function fetchTransactions(limit = 40): Promise<TransactionRow[]> {
  const res = await apiFetch("/api/token/transactions");
  if (!res.ok) return [];
  const rows = (await res.json()) as TransactionRow[];
  return Array.isArray(rows) ? rows.slice(0, limit) : [];
}

export async function findAdminUserId(): Promise<string | null> {
  const res = await apiFetch("/api/users");
  if (!res.ok) return null;
  const users = (await res.json()) as Array<{ id?: string; role?: string }>;
  if (!Array.isArray(users)) return null;
  const admin = users.find((u) => u.role === "admin");
  return admin?.id ? String(admin.id) : null;
}

export type ContactWithPhone = ExpertSearchRow & { phone?: string | null };
