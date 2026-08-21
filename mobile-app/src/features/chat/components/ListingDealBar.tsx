import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { apiFetch } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

export type ListingDeal = {
  id: string;
  chat_id: string;
  expert_id: string;
  client_id: string;
  amount: string | number;
  status: string;
};

type Props = {
  chatId: string;
  currentUserId: string;
  /** chat_type / metadata — expert_listing bo‘lsa ko‘rsatiladi */
  isExpertListing: boolean;
  suggestedAmount?: number;
};

async function apiJson(path: string, init?: { method?: string; body?: string }) {
  const res = await apiFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || "Xatolik");
  return data;
}

/** Web ListingDealBar — listing chat escrow paneli */
export function ListingDealBar({
  chatId,
  currentUserId,
  isExpertListing,
  suggestedAmount = 100,
}: Props) {
  const [deal, setDeal] = useState<ListingDeal | null>(null);
  const [role, setRole] = useState<"expert" | "client" | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState(String(suggestedAmount || 100));

  const load = useCallback(async () => {
    if (!chatId || !currentUserId || !isExpertListing) return;
    try {
      const d = await apiJson(`/api/listing-deals/chat/${encodeURIComponent(chatId)}`);
      setDeal(d.deal || null);
      setRole(d.role || null);
    } catch {
      /* ignore */
    }
  }, [chatId, currentUserId, isExpertListing]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (deal) return;
    setAmountInput(String(suggestedAmount || 100));
  }, [chatId, deal, suggestedAmount]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;
    const onUpd = (p: any) => {
      if (String(p?.chatId) === String(chatId)) void load();
    };
    socket.on("listing_deal_updated", onUpd);
    return () => {
      socket.off("listing_deal_updated", onUpd);
    };
  }, [chatId, load]);

  if (!isExpertListing || (!deal && !role)) return null;

  const run = async (fn: () => Promise<void>) => {
    setLoading(true);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  const status = deal?.status || "";
  const amt = deal ? Number(deal.amount) : 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Escrow / Listing to‘lov</Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      {deal ? (
        <Text style={styles.meta}>
          {amt} MALI · {status}
        </Text>
      ) : null}

      {role === "expert" && (!deal || status === "pending_payment") ? (
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={amountInput}
            onChangeText={setAmountInput}
            keyboardType="decimal-pad"
            placeholder="Summa"
            placeholderTextColor="rgba(255,255,255,0.35)"
            editable={!loading}
          />
          <Pressable
            style={[styles.btnPrimary, loading && styles.disabled]}
            disabled={loading}
            onPress={() =>
              void run(async () => {
                const parsed = Number(String(amountInput).replace(",", "."));
                if (!parsed || parsed <= 0) throw new Error("Summani kiriting");
                const data = await apiJson("/api/listing-deals/request", {
                  method: "POST",
                  body: JSON.stringify({ chatId, amount: parsed }),
                });
                setDeal(data.deal);
                setMsg("To‘lov so‘rovi yuborildi");
              })
            }
          >
            <Text style={styles.btnText}>So‘rash</Text>
          </Pressable>
        </View>
      ) : null}

      {role === "client" && status === "pending_payment" ? (
        <Pressable
          style={[styles.btnPrimary, loading && styles.disabled]}
          disabled={loading}
          onPress={() =>
            void run(async () => {
              if (!deal?.id) return;
              await apiJson("/api/listing-deals/pay", {
                method: "POST",
                body: JSON.stringify({ dealId: deal.id }),
              });
              await load();
              setMsg("To‘lov qilindi");
            })
          }
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>To‘lash ({amt} MALI)</Text>
          )}
        </Pressable>
      ) : null}

      {role === "expert" && status === "paid" ? (
        <Pressable
          style={[styles.btnPrimary, loading && styles.disabled]}
          disabled={loading}
          onPress={() =>
            void run(async () => {
              if (!deal?.id) return;
              await apiJson("/api/listing-deals/mark-done", {
                method: "POST",
                body: JSON.stringify({ dealId: deal.id }),
              });
              await load();
              setMsg("Mijoz tasdiqlashini kutmoqda");
            })
          }
        >
          <Text style={styles.btnText}>Ish tugadi</Text>
        </Pressable>
      ) : null}

      {role === "client" && status === "awaiting_client_confirm" ? (
        <Pressable
          style={[styles.btnPrimary, loading && styles.disabled]}
          disabled={loading}
          onPress={() =>
            void run(async () => {
              if (!deal?.id) return;
              await apiJson("/api/listing-deals/complete", {
                method: "POST",
                body: JSON.stringify({ dealId: deal.id }),
              });
              await load();
              setMsg("Deal yakunlandi");
            })
          }
        >
          <Text style={styles.btnText}>Tasdiqlash</Text>
        </Pressable>
      ) : null}

      {deal && ["pending_payment", "paid", "awaiting_client_confirm"].includes(status) ? (
        <View style={styles.row}>
          <Pressable
            style={[styles.btnGhost, loading && styles.disabled]}
            disabled={loading}
            onPress={() =>
              void run(async () => {
                if (!deal?.id) return;
                await apiJson("/api/listing-deals/cancel", {
                  method: "POST",
                  body: JSON.stringify({ dealId: deal.id }),
                });
                setDeal(null);
                setMsg("Bekor qilindi");
              })
            }
          >
            <Text style={styles.btnGhostText}>Bekor</Text>
          </Pressable>
          <Pressable
            style={[styles.btnGhost, loading && styles.disabled]}
            disabled={loading}
            onPress={() =>
              void run(async () => {
                if (!deal?.id) return;
                await apiJson("/api/listing-deals/dispute", {
                  method: "POST",
                  body: JSON.stringify({ dealId: deal.id }),
                });
                await load();
                setMsg("Nizo ochildi");
              })
            }
          >
            <Text style={[styles.btnGhostText, { color: "#f87171" }]}>Nizo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 10,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#212121",
    gap: 8,
  },
  title: { color: "#8774e1", fontSize: 13, fontWeight: "600" },
  msg: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
  meta: { color: "rgba(255,255,255,0.55)", fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  input: {
    minWidth: 72,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 13,
  },
  btnPrimary: {
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  btnGhostText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  disabled: { opacity: 0.5 },
});
