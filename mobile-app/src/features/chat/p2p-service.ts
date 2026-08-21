import { apiFetch } from "../../lib/api";

export type P2pAd = {
  id: string;
  user_id?: string;
  user_name?: string;
  type: "buy" | "sell" | string;
  amount_mali: number | string;
  price_uzs?: number | string;
  rate?: number | string;
  status?: string;
};

export type P2pTrade = {
  id: string;
  ad_id?: string;
  buyer_id?: string;
  seller_id?: string;
  buyer_name?: string;
  seller_name?: string;
  amount_mali?: number | string;
  status?: string;
};

/** Sotuv e’lonlari (sotib olish uchun) — `GET /api/p2p?type=sell` */
export async function fetchP2pAds(type: "buy" | "sell" = "sell"): Promise<P2pAd[]> {
  const res = await apiFetch(`/api/p2p?type=${type}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchMyP2pAds(): Promise<P2pAd[]> {
  const res = await apiFetch("/api/p2p/my-ads");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createP2pAd(params: {
  type: "buy" | "sell";
  amount_mali: number;
  price_uzs?: number;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch("/api/p2p", {
    method: "POST",
    body: JSON.stringify(params),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, message: (err as any)?.message || "E’lon yaratilmadi" };
}

export async function startP2pTrade(
  adId: string,
  amount: number
): Promise<{ ok: boolean; trade?: P2pTrade; message?: string }> {
  const res = await apiFetch("/api/p2p/trade", {
    method: "POST",
    body: JSON.stringify({ adId, amount }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: (data as any)?.message || "Savdo ochilmadi" };
  return { ok: true, trade: data as P2pTrade };
}

export async function fetchP2pTrades(): Promise<P2pTrade[]> {
  const res = await apiFetch("/api/p2p/trades");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function openP2pTradeChat(
  tradeId: string
): Promise<{ chatId: string; name?: string } | null> {
  const res = await apiFetch(`/api/p2p/trade-chat/${encodeURIComponent(tradeId)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const chatId = String(data?.chatId || data?.id || "").trim();
  if (!chatId) return null;
  return { chatId, name: data?.name ? String(data.name) : "P2P savdo" };
}
