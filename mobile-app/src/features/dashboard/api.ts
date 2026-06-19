import { apiFetch } from "../../lib/api";

/** Web WalletPanel bilan mos taxminiy kurs (1 MALI ≈ UZS) */
export const MALI_UZS_APPROX = 4899;

export type TokenBalance = {
  balance: string;
  locked_balance: string;
};

export async function fetchWalletBalance(): Promise<TokenBalance | null> {
  const res = await apiFetch("/api/wallet/balance");
  if (!res.ok) return null;
  const j = (await res.json()) as { success?: boolean; data?: TokenBalance };
  if (!j.success || !j.data) return null;
  return j.data;
}

export type TransactionRow = {
  id: string;
  amount: string | number;
  fee?: string | number;
  net_amount?: string | number;
  type: string;
  status: string;
  note?: string | null;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  sender_name?: string | null;
  receiver_name?: string | null;
  sender_surname?: string | null;
  receiver_surname?: string | null;
};

export async function fetchRecentTransactions(limit = 15): Promise<TransactionRow[]> {
  const res = await apiFetch("/api/token/transactions");
  if (!res.ok) return [];
  const rows = (await res.json()) as TransactionRow[];
  return Array.isArray(rows) ? rows.slice(0, limit) : [];
}

export type ExpertSearchRow = {
  id: string;
  name?: string | null;
  surname?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  profession?: string | null;
  specialization?: string | null;
  hourly_rate?: string | null;
  service_price?: string | null;
  pricing_model?: string | null;
  currency?: string | null;
  verified_status?: string | null;
  /** `user_profiles.rating` — sharhlardan AVG (backend searchUsers) */
  expert_rating?: string | number | null;
};

export async function searchExperts(search?: string): Promise<ExpertSearchRow[]> {
  const params = new URLSearchParams({ expert: "true" });
  const q = search?.trim();
  /** Backend: mutaxassis qidiruvida 1+ belgi bilan `q` yuborish mumkin */
  if (q && q.length >= 1) params.set("q", q);
  const res = await apiFetch(`/api/users/search?${params.toString()}`);
  if (!res.ok) return [];
  const rows = (await res.json()) as ExpertSearchRow[];
  return Array.isArray(rows) ? rows : [];
}

export async function fetchExpertDetail(userId: string): Promise<any> {
  const res = await apiFetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error("Mutaxassis ma'lumotlarini yuklashda xatolik");
  return res.json();
}

export async function fetchContacts(): Promise<ExpertSearchRow[]> {
  const res = await apiFetch("/api/users/contacts");
  if (!res.ok) return [];
  /** Backend: getContacts returns enriched list */
  const rows = (await res.json()) as ExpertSearchRow[];
  return Array.isArray(rows) ? rows : [];
}


