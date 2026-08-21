import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react-native";
import { apiFetch } from "../../lib/api";
import { useAuthLocale } from "../auth/locale";
import { ChatBackground } from "../../components/ChatBackground";

type ExpenseType = "expense" | "income";

type ExpenseRow = {
  id: number | string;
  amount: number | string;
  category: string;
  description?: string | null;
  type: ExpenseType;
  date: string;
};

const CATEGORIES = [
  "Oziq-ovqat",
  "Transport",
  "Xizmatlar",
  "Moliya",
  "Ko'ngilochar",
  "Sog'liq",
  "Boshqa",
];

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(viewDate: Date) {
  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const end = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
  return { start: localYmd(start), end: localYmd(end) };
}

export function ExpenseTrackerScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t, lang } = useAuthLocale();
  const locale = lang === "ru" ? "ru-RU" : lang === "en" ? "en-US" : "uz-UZ";

  const [viewDate, setViewDate] = useState(new Date());
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [stats, setStats] = useState<{ totals: any[]; categories: any[] }>({
    totals: [],
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category: "Oziq-ovqat",
    description: "",
    type: "expense" as ExpenseType,
    date: localYmd(new Date()),
  });

  const { start, end } = useMemo(() => monthRange(viewDate), [viewDate]);

  const load = useCallback(async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        apiFetch(`/api/expenses?startDate=${start}&endDate=${end}`),
        apiFetch(`/api/expenses/stats?startDate=${start}&endDate=${end}`),
      ]);
      if (listRes.ok) setExpenses(await listRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [start, end]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const totalIncome = Number(stats.totals.find((x) => x.type === "income")?.total || 0);
  const totalExpense = Number(stats.totals.find((x) => x.type === "expense")?.total || 0);
  const balance = totalIncome - totalExpense;

  const money = (n: number) => Math.round(n).toLocaleString(locale);

  const submit = async () => {
    const amount = parseFloat(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert(t("menuFinance"), t("expenseAmountHint"));
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          amount,
          category: form.category,
          description: form.description.trim() || null,
          type: form.type,
          date: form.date || localYmd(new Date()),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || t("loginErrorGeneric"));
      }
      setShowAdd(false);
      setForm({
        amount: "",
        category: "Oziq-ovqat",
        description: "",
        type: "expense",
        date: localYmd(new Date()),
      });
      await load();
    } catch (e: any) {
      Alert.alert(t("menuFinance"), e?.message || t("loginErrorGeneric"));
    } finally {
      setSaving(false);
    }
  };

  const remove = (id: number | string) => {
    Alert.alert(t("expenseDeleteTitle"), t("expenseDeleteDesc"), [
      { text: t("msgCancel"), style: "cancel" },
      {
        text: t("msgDelete"),
        style: "destructive",
        onPress: async () => {
          try {
            const res = await apiFetch(`/api/expenses/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error(t("loginErrorGeneric"));
            await load();
          } catch (e: any) {
            Alert.alert(t("menuFinance"), e?.message || t("loginErrorGeneric"));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ArrowLeft color="#fff" size={22} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t("expenseControl")}</Text>
            <View style={styles.monthRow}>
              <Pressable
                onPress={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                }
              >
                <ChevronLeft color="rgba(255,255,255,0.6)" size={18} />
              </Pressable>
              <Text style={styles.monthText}>
                {viewDate.toLocaleDateString(locale, { month: "long", year: "numeric" })}
              </Text>
              <Pressable
                onPress={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                }
              >
                <ChevronRight color="rgba(255,255,255,0.6)" size={18} />
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Plus color="#fff" size={20} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#6ab3f3" size="large" />
          </View>
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  void load();
                }}
                tintColor="#fff"
              />
            }
            ListHeaderComponent={
              <View style={styles.statsRow}>
                <Stat label={t("expenseBalance")} value={money(balance)} color="#6ab3f3" />
                <Stat label={t("expenseIncome")} value={money(totalIncome)} color="#34d399" />
                <Stat label={t("expenseOut")} value={money(totalExpense)} color="#fb7185" />
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <TrendingUp color="rgba(255,255,255,0.2)" size={36} />
                <Text style={styles.emptyText}>{t("expenseEmpty")}</Text>
                <Pressable style={styles.emptyCta} onPress={() => setShowAdd(true)}>
                  <Text style={styles.emptyCtaText}>{t("expenseAdd")}</Text>
                </Pressable>
              </View>
            }
            renderItem={({ item }) => {
              const isIncome = item.type === "income";
              return (
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.category}</Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.description || t("expenseNoDesc")}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.rowAmount, isIncome && { color: "#34d399" }]}>
                      {isIncome ? "+" : "-"}
                      {money(Number(item.amount))}
                    </Text>
                    <Text style={styles.rowDate}>
                      {new Date(item.date).toLocaleDateString(locale, {
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                  </View>
                  <Pressable onPress={() => remove(item.id)} style={styles.trashBtn}>
                    <Trash2 color="rgba(255,255,255,0.35)" size={18} />
                  </Pressable>
                </View>
              );
            }}
          />
        )}
      </ChatBackground>

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAdd(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t("expenseAdd")}</Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[styles.typeBtn, form.type === "expense" && styles.typeExpense]}
                onPress={() => setForm({ ...form, type: "expense" })}
              >
                <Text style={styles.typeText}>{t("expenseOut")}</Text>
              </Pressable>
              <Pressable
                style={[styles.typeBtn, form.type === "income" && styles.typeIncome]}
                onPress={() => setForm({ ...form, type: "income" })}
              >
                <Text style={styles.typeText}>{t("expenseIncome")}</Text>
              </Pressable>
            </View>
            <Text style={styles.label}>{t("expenseCategory")}</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setForm({ ...form, category: c })}
                  style={[styles.chip, form.category === c && styles.chipActive]}
                >
                  <Text style={[styles.chipText, form.category === c && { color: "#fff" }]}>{c}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.label}>{t("expenseAmountHint")}</Text>
            <TextInput
              value={form.amount}
              onChangeText={(amount) => setForm({ ...form, amount })}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.input}
            />
            <Text style={styles.label}>{t("expenseNoDesc")}</Text>
            <TextInput
              value={form.description}
              onChangeText={(description) => setForm({ ...form, description })}
              placeholderTextColor="rgba(255,255,255,0.3)"
              style={styles.input}
            />
            <Pressable
              style={[styles.saveBtn, form.type === "income" ? { backgroundColor: "#10b981" } : null]}
              onPress={() => void submit()}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>{t("expenseSave")}</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={styles.statValue}>
        {value} <Text style={styles.statUnit}>UZS</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f0f0f" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  monthRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  monthText: { color: "rgba(255,255,255,0.55)", fontSize: 13, textTransform: "capitalize" },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#6ab3f3",
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#212121",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  statLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", marginBottom: 8 },
  statValue: { color: "#fff", fontSize: 15, fontWeight: "700" },
  statUnit: { fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: "500" },
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.12)",
  },
  emptyText: { color: "rgba(255,255,255,0.45)", marginTop: 12, textAlign: "center" },
  emptyCta: {
    marginTop: 16,
    backgroundColor: "#6ab3f3",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyCtaText: { color: "#fff", fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#212121",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  rowTitle: { color: "#fff", fontWeight: "600", fontSize: 14 },
  rowSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  rowAmount: { color: "#fff", fontWeight: "700", fontSize: 14 },
  rowDate: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },
  trashBtn: { padding: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#212121",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "90%",
  },
  modalTitle: { color: "#fff", fontSize: 17, fontWeight: "700", marginBottom: 14 },
  typeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#181818",
    alignItems: "center",
  },
  typeExpense: { backgroundColor: "#e11d48" },
  typeIncome: { backgroundColor: "#059669" },
  typeText: { color: "#fff", fontWeight: "700" },
  label: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#181818",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipActive: { borderColor: "#6ab3f3", backgroundColor: "rgba(106,179,243,0.15)" },
  chipText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "600" },
  input: {
    backgroundColor: "#181818",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  saveBtn: {
    marginTop: 8,
    backgroundColor: "#e11d48",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
