import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,

  History,
  Search,
  Star,
  ShieldCheck,
  Zap,
  User,
  LogOut,
  ChevronRight,
  Settings,
  Palette,
  Bell,
  Users,
  MessageSquare,
  X,
} from "lucide-react-native";


import { useAuthStore } from "../../auth/store";
import { AvatarImage } from "../../../components/AvatarImage";
import { AuthUser } from "../../auth/types";
import { useAuthLocale } from "../../auth/locale";
import {
  MALI_UZS_APPROX,
  fetchRecentTransactions,
  fetchWalletBalance,
  searchExperts,
  fetchContacts,
  type ExpertSearchRow,

  type TokenBalance,
  type TransactionRow,
} from "../../dashboard/api";
import { createOrOpenPrivateChat, addContactRequest } from "../service";
import {
  createTopUpRequest,
  fetchWalletConfig,
  findAdminUserId,
  setupWalletPin,
  transferTokens,
  walletDigitsOnly,
  walletResolveRecipientFromPhone,
  type ContactWithPhone,
  MIN_TOPUP,
  MAX_TOPUP,
  MIN_WITHDRAW,
} from "../wallet-service";
import {
  createP2pAd,
  fetchP2pAds,
  startP2pTrade,
  openP2pTradeChat,
  type P2pAd,
} from "../p2p-service";
import { navigationRef } from "../../../lib/navigationRef";

const { width } = Dimensions.get("window");

type MessagesNav = {
  navigate: (
    name: "ChatDetail" | "ExpertDetail",
    params: { 
      chatId?: string; 
      name?: string; 
      avatarUrl?: string | null;
      expertId?: string;
      fallbackData?: any;
      startCall?: "audio" | "video";
    }
  ) => void;
};


// --- WALLET VIEW ---
export function WalletView() {
  const user = useAuthStore((s) => s.user);
  const myId = user?.id ? String(user.id) : "";

  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [txs, setTxs] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useAuthLocale();
  const scrollRef = useRef<ScrollView>(null);
  const historyY = useRef(0);

  const [modal, setModal] = useState<"none" | "topup" | "send" | "pin" | "withdraw" | "p2p">("none");
  const [busyAction, setBusyAction] = useState(false);
  const [formError, setFormError] = useState("");
  const [adminCard, setAdminCard] = useState<string | null>(null);
  const [systemMali, setSystemMali] = useState(0);

  const [p2pAds, setP2pAds] = useState<P2pAd[]>([]);
  const [p2pLoading, setP2pLoading] = useState(false);
  const [p2pCreateAmount, setP2pCreateAmount] = useState("");
  const [p2pCreatePrice, setP2pCreatePrice] = useState("");
  const [p2pTab, setP2pTab] = useState<"market" | "sell">("market");

  const [topUpAmount, setTopUpAmount] = useState("");
  const [sendPhone, setSendPhone] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendPin, setSendPin] = useState("");
  const [contacts, setContacts] = useState<ContactWithPhone[]>([]);
  const [pinNew, setPinNew] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawCard, setWithdrawCard] = useState("");
  const [withdrawPin, setWithdrawPin] = useState("");

  const hasPin = !!balance?.hasPin;
  const balNum = parseFloat(balance?.balance ?? "0") || 0;
  const lockedNum = parseFloat(balance?.locked_balance ?? "0") || 0;
  const uzsApprox = Math.round(balNum * MALI_UZS_APPROX);

  const load = useCallback(async (mode: "full" | "pull" = "full") => {
    if (mode === "pull") setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [b, list] = await Promise.all([fetchWalletBalance(), fetchRecentTransactions(12)]);
      setBalance(b);
      setTxs(list);
      if (!b) setError("Balansni yuklash muvaffaqiyatsiz");
    } catch {
      setError("Ma'lumotlarni yuklashda xatolik");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load("full");
    }, [load])
  );

  const closeModal = () => {
    setModal("none");
    setFormError("");
    setBusyAction(false);
  };

  const ensurePinThen = (next: "send" | "withdraw") => {
    if (!hasPin) {
      setPinNew("");
      setPinConfirm("");
      setFormError("");
      setModal("pin");
      return;
    }
    setFormError("");
    if (next === "send") {
      setSendPhone("");
      setSendAmount("");
      setSendPin("");
      setModal("send");
      void fetchContacts().then((list) => setContacts(list as ContactWithPhone[]));
    } else {
      setWithdrawAmount("");
      setWithdrawCard("");
      setWithdrawPin("");
      setModal("withdraw");
    }
  };

  const openTopUp = async () => {
    setTopUpAmount("");
    setFormError("");
    setModal("topup");
    const cfg = await fetchWalletConfig();
    setAdminCard(cfg.adminCard);
    setSystemMali(cfg.systemAvailableMali);
  };

  const openP2p = async () => {
    setFormError("");
    setP2pTab("market");
    setP2pCreateAmount("");
    setP2pCreatePrice("");
    setModal("p2p");
    setP2pLoading(true);
    try {
      const ads = await fetchP2pAds("sell");
      setP2pAds(ads);
    } catch {
      setP2pAds([]);
    } finally {
      setP2pLoading(false);
    }
  };

  const buyFromAd = async (ad: P2pAd) => {
    const maxAmt = Number(ad.amount_mali) || 0;
    const defaultAmt = String(Math.min(maxAmt, 100) || 10);

    const askAmount = (): Promise<string | null> =>
      new Promise((resolve) => {
        if (Platform.OS === "ios") {
          Alert.prompt(
            "Sotib olish",
            `Maks: ${maxAmt} MALI. Qancha olasiz?`,
            [
              { text: "Bekor", style: "cancel", onPress: () => resolve(null) },
              { text: "OK", onPress: (v?: string) => resolve(v || "") },
            ],
            "plain-text",
            defaultAmt
          );
        } else {
          Alert.alert("Sotib olish", `${defaultAmt} MALI olinsinmi? (maks ${maxAmt})`, [
            { text: "Bekor", style: "cancel", onPress: () => resolve(null) },
            { text: "Ha", onPress: () => resolve(defaultAmt) },
          ]);
        }
      });

    const ask = await askAmount();
    if (ask == null) return;
    const amount = Number(ask);
    if (!amount || amount <= 0) {
      Alert.alert("P2P", "Summani kiriting");
      return;
    }
    setBusyAction(true);
    try {
      const res = await startP2pTrade(ad.id, amount);
      if (!res.ok) {
        Alert.alert("P2P", res.message || "Savdo ochilmadi");
        return;
      }
      const tradeId = res.trade?.id;
      if (tradeId) {
        const chat = await openP2pTradeChat(String(tradeId));
        if (chat?.chatId && navigationRef.isReady()) {
          setModal("none");
          navigationRef.navigate("ChatDetail", {
            chatId: chat.chatId,
            name: chat.name || "P2P savdo",
            avatarUrl: null,
          });
          return;
        }
      }
      Alert.alert("P2P", "Savdo boshlandi");
      setModal("none");
    } finally {
      setBusyAction(false);
    }
  };

  const submitP2pSellAd = async () => {
    const amount = Number(p2pCreateAmount);
    const price = Number(p2pCreatePrice) || undefined;
    if (!amount || amount <= 0) {
      setFormError("MALI miqdorini kiriting");
      return;
    }
    setBusyAction(true);
    setFormError("");
    try {
      const res = await createP2pAd({ type: "sell", amount_mali: amount, price_uzs: price });
      if (!res.ok) {
        setFormError(res.message || "E’lon yaratilmadi");
        return;
      }
      Alert.alert("P2P", "Sotish e’loni yaratildi");
      setP2pTab("market");
      const ads = await fetchP2pAds("sell");
      setP2pAds(ads);
    } finally {
      setBusyAction(false);
    }
  };

  const onHistory = async () => {
    scrollRef.current?.scrollTo({ y: Math.max(0, historyY.current - 8), animated: true });
    try {
      const list = await fetchRecentTransactions(40);
      setTxs(list);
    } catch {
      /* keep existing */
    }
  };

  const submitTopUp = async () => {
    const n = Number(topUpAmount);
    if (!n || Number.isNaN(n) || n <= 0) {
      setFormError("To‘g‘ri summa kiriting");
      return;
    }
    if (n < MIN_TOPUP) {
      setFormError(`Minimal ${MIN_TOPUP} MALI`);
      return;
    }
    if (n > MAX_TOPUP) {
      setFormError(`Maksimal ${MAX_TOPUP.toLocaleString()} MALI`);
      return;
    }
    setBusyAction(true);
    setFormError("");
    const r = await createTopUpRequest(n);
    setBusyAction(false);
    if (!r.ok) {
      setFormError(r.message || "Xatolik");
      return;
    }
    Alert.alert("Muvaffaqiyat", "To‘ldirish so‘rovi yuborildi. Admin tasdiqlashi kerak.");
    closeModal();
    void load("pull");
  };

  const submitPin = async () => {
    if (pinNew.length !== 4 || Number.isNaN(Number(pinNew))) {
      setFormError("4 xonali PIN kiriting");
      return;
    }
    if (pinNew !== pinConfirm) {
      setFormError("PIN mos kelmadi");
      return;
    }
    setBusyAction(true);
    const r = await setupWalletPin(pinNew);
    setBusyAction(false);
    if (!r.ok) {
      setFormError(r.message || "Xatolik");
      return;
    }
    Alert.alert("Tayyor", "Hamyon PIN o‘rnatildi");
    closeModal();
    void load("pull");
  };

  const submitSend = async () => {
    const amount = Number(sendAmount);
    let receiverId = "";
    if (sendPhone.trim()) {
      receiverId = walletResolveRecipientFromPhone(sendPhone, contacts);
    }
    if (!receiverId) {
      setFormError("Kontaktlardan telefon kiriting (faqat sizdagi kontaktlar)");
      return;
    }
    if (!amount || amount <= 0) {
      setFormError("To‘g‘ri summa kiriting");
      return;
    }
    if (amount > balNum) {
      setFormError("Balans yetarli emas");
      return;
    }
    if (!sendPin || sendPin.length !== 4) {
      setFormError("4 xonali PIN kiriting");
      return;
    }
    setBusyAction(true);
    const r = await transferTokens({ receiverId, amount, pin: sendPin });
    setBusyAction(false);
    if (!r.ok) {
      setFormError(r.message || "Yuborishda xatolik");
      return;
    }
    Alert.alert("Yuborildi", `${amount} MALI o‘tkazildi`);
    closeModal();
    void load("pull");
  };

  const submitWithdraw = async () => {
    const amount = Number(withdrawAmount);
    const cleanCard = withdrawCard.replace(/\D/g, "");
    if (!amount || amount <= 0) {
      setFormError("To‘g‘ri summa kiriting");
      return;
    }
    if (amount < MIN_WITHDRAW) {
      setFormError(`Minimal yechish ${MIN_WITHDRAW} MALI`);
      return;
    }
    if (amount > balNum) {
      setFormError("Balans yetarli emas");
      return;
    }
    if (systemMali > 0 && amount > systemMali) {
      setFormError("Tizim rezervida yetarli MALI yo‘q");
      return;
    }
    if (cleanCard.length < 16) {
      setFormError("Karta raqamini to‘liq kiriting");
      return;
    }
    if (!withdrawPin || withdrawPin.length !== 4) {
      setFormError("4 xonali PIN kiriting");
      return;
    }
    setBusyAction(true);
    const adminId = await findAdminUserId();
    if (!adminId) {
      setBusyAction(false);
      setFormError("Yechish vaqtincha mavjud emas");
      return;
    }
    const r = await transferTokens({
      receiverId: adminId,
      amount,
      pin: withdrawPin,
      note: `WITHDRAW_REQUEST:${cleanCard}`,
    });
    setBusyAction(false);
    if (!r.ok) {
      setFormError(r.message || "Yechish so‘rovi yuborilmadi");
      return;
    }
    Alert.alert("So‘rov yuborildi", "Yechish so‘rovi qabul qilindi");
    closeModal();
    void load("pull");
  };

  const glassModal = (
    title: string,
    body: React.ReactNode,
    onSubmit: () => void,
    submitLabel: string
  ) => (
    <Modal visible transparent animationType="slide" onRequestClose={closeModal}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={closeModal} hitSlop={10}>
              <X color="rgba(255,255,255,0.6)" size={22} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
            {body}
            {formError ? <Text style={styles.modalError}>{formError}</Text> : null}
          </ScrollView>
          <Pressable
            style={[styles.modalSubmit, busyAction && { opacity: 0.6 }]}
            onPress={onSubmit}
            disabled={busyAction}
          >
            {busyAction ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.modalSubmitText}>{submitLabel}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.viewContainer}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 150 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load("pull")}
          tintColor="#ffffff"
        />
      }
    >
      <View style={styles.glassCardLarge}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>{t('dashTotalBalance')}</Text>
          <ShieldCheck color="#10b981" size={18} />
        </View>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginVertical: 16 }} />
        ) : (
          <>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceAmount}>
                {balNum.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}
              </Text>
              <Text style={styles.balanceCurrency}>MALI</Text>
            </View>
            <Text style={styles.balanceUzs}>≈ {uzsApprox.toLocaleString("uz-UZ")} UZS</Text>
            {lockedNum > 0 ? (
              <Text style={styles.lockedHint}>
                {t('dashLocked')}: {lockedNum.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })} MALI
              </Text>
            ) : null}
            {!hasPin && !loading ? (
              <Pressable style={styles.pinHintBtn} onPress={() => { setFormError(""); setPinNew(""); setPinConfirm(""); setModal("pin"); }}>
                <Text style={styles.pinHintText}>PIN o‘rnatish</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </View>

      {error ? (
        <Text style={styles.inlineError}>{error}</Text>
      ) : null}

      <View style={styles.actionsGrid}>
        <ActionIconBtn
          icon={<Plus color="#fff" size={24}/>}
          label={t('dashFill')}
          color="rgba(16, 185, 129, 0.6)"
          onPress={() => void openTopUp()}
        />
        <ActionIconBtn
          icon={<ArrowUpRight color="#fff" size={24}/>}
          label={t('dashSend')}
          color="rgba(59, 130, 246, 0.6)"
          onPress={() => ensurePinThen("send")}
        />
        <ActionIconBtn
          icon={<Zap color="#fff" size={24}/>}
          label={t('dashBuy')}
          color="rgba(99, 102, 241, 0.6)"
          onPress={() => void openP2p()}
        />
        <ActionIconBtn
          icon={<History color="#fff" size={24}/>}
          label={t('dashHistory')}
          color="rgba(245, 158, 11, 0.6)"
          onPress={() => void onHistory()}
        />
      </View>

      <View
        style={styles.sectionHeader}
        onLayout={(e) => {
          historyY.current = e.nativeEvent.layout.y;
        }}
      >
        <Text style={styles.sectionTitle}>{t('dashRecent')}</Text>
        <Pressable onPress={() => ensurePinThen("withdraw")} hitSlop={8}>
          <Text style={styles.withdrawLink}>Yechish</Text>
        </Pressable>
      </View>

      {loading && txs.length === 0 ? (
        <ActivityIndicator color="rgba(255,255,255,0.4)" style={{ marginVertical: 20 }} />
      ) : txs.length === 0 ? (
        <View style={styles.emptyHistoryCard}>
          <History color="rgba(255,255,255,0.2)" size={40} />
          <Text style={styles.emptyText}>{t('dashNoTxs')}</Text>
        </View>
      ) : (
        <View style={styles.txList}>
          {txs.map((tx) => (
            <View key={tx.id} style={styles.txRowWrap}>
              <TransactionRowView tx={tx} myId={myId} />
            </View>
          ))}
        </View>
      )}

      {modal === "topup" &&
        glassModal(
          "To‘ldirish",
          <>
            <Text style={styles.modalHint}>Admin kartaga o‘tkazing, so‘ng summani yuboring</Text>
            <View style={styles.adminCardBox}>
              <Text style={styles.adminCardLabel}>UZCARD</Text>
              <Text style={styles.adminCardNum}>{adminCard || "Karta ko‘rsatilmagan"}</Text>
            </View>
            <Text style={styles.fieldLabel}>Summa (MALI)</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
            />
          </>,
          () => void submitTopUp(),
          "So‘rov yuborish"
        )}

      {modal === "send" &&
        glassModal(
          "Yuborish",
          <>
            <Text style={styles.fieldLabel}>Telefon (kontakt)</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="phone-pad"
              placeholder="+998..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={sendPhone}
              onChangeText={setSendPhone}
            />
            <Text style={styles.fieldLabel}>Summa (MALI)</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={sendAmount}
              onChangeText={setSendAmount}
            />
            <Text style={styles.fieldLabel}>PIN</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={sendPin}
              onChangeText={setSendPin}
            />
          </>,
          () => void submitSend(),
          "Yuborish"
        )}

      {modal === "pin" &&
        glassModal(
          "PIN o‘rnatish",
          <>
            <Text style={styles.modalHint}>4 xonali hamyon PIN yarating</Text>
            <Text style={styles.fieldLabel}>Yangi PIN</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pinNew}
              onChangeText={setPinNew}
            />
            <Text style={styles.fieldLabel}>Tasdiqlash</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={pinConfirm}
              onChangeText={setPinConfirm}
            />
          </>,
          () => void submitPin(),
          "Saqlash"
        )}

      {modal === "withdraw" &&
        glassModal(
          "Yechish",
          <>
            <Text style={styles.fieldLabel}>Summa (MALI)</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="decimal-pad"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              placeholderTextColor="rgba(255,255,255,0.3)"
              placeholder="0.00"
            />
            <Text style={styles.fieldLabel}>Karta raqami</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="number-pad"
              value={withdrawCard}
              onChangeText={setWithdrawCard}
              placeholder="8600..."
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <Text style={styles.fieldLabel}>PIN</Text>
            <TextInput
              style={styles.fieldInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={withdrawPin}
              onChangeText={setWithdrawPin}
            />
          </>,
          () => void submitWithdraw(),
          "So‘rov yuborish"
        )}

      <Modal visible={modal === "p2p"} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.p2pOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={styles.p2pSheet}>
            <View style={styles.p2pHeader}>
              <Text style={styles.p2pTitle}>P2P bozor</Text>
              <Pressable onPress={closeModal} hitSlop={10}>
                <X color="#aaa" size={22} />
              </Pressable>
            </View>
            <View style={styles.p2pTabs}>
              <Pressable
                style={[styles.p2pTab, p2pTab === "market" && styles.p2pTabActive]}
                onPress={() => {
                  setP2pTab("market");
                  void fetchP2pAds("sell").then(setP2pAds);
                }}
              >
                <Text style={styles.p2pTabText}>Sotib olish</Text>
              </Pressable>
              <Pressable
                style={[styles.p2pTab, p2pTab === "sell" && styles.p2pTabActive]}
                onPress={() => setP2pTab("sell")}
              >
                <Text style={styles.p2pTabText}>Sotish e’loni</Text>
              </Pressable>
            </View>
            {formError ? <Text style={styles.inlineError}>{formError}</Text> : null}
            {p2pTab === "market" ? (
              p2pLoading ? (
                <ActivityIndicator color="#fff" style={{ marginVertical: 24 }} />
              ) : p2pAds.length === 0 ? (
                <Text style={styles.emptyText}>Hozircha sotuv e’lonlari yo‘q</Text>
              ) : (
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {p2pAds.map((ad) => (
                    <View key={ad.id} style={styles.p2pAdRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.p2pAdName}>{ad.user_name || "Foydalanuvchi"}</Text>
                        <Text style={styles.p2pAdMeta}>
                          {Number(ad.amount_mali).toLocaleString()} MALI
                          {ad.price_uzs ? ` · ${Number(ad.price_uzs).toLocaleString()} UZS` : ""}
                        </Text>
                      </View>
                      <Pressable
                        style={[styles.p2pBuyBtn, busyAction && { opacity: 0.5 }]}
                        disabled={busyAction}
                        onPress={() => void buyFromAd(ad)}
                      >
                        <Text style={styles.p2pBuyText}>Olish</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )
            ) : (
              <View>
                <Text style={styles.fieldLabel}>Sotiladigan MALI</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="decimal-pad"
                  value={p2pCreateAmount}
                  onChangeText={setP2pCreateAmount}
                  placeholder="100"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
                <Text style={styles.fieldLabel}>Narx (UZS, ixtiyoriy)</Text>
                <TextInput
                  style={styles.fieldInput}
                  keyboardType="decimal-pad"
                  value={p2pCreatePrice}
                  onChangeText={setP2pCreatePrice}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />
                <Pressable
                  style={[styles.modalSubmit, busyAction && { opacity: 0.6 }]}
                  disabled={busyAction}
                  onPress={() => void submitP2pSellAd()}
                >
                  {busyAction ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>E’lon qilish</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function formatTxDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = d.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString();
  
  const time = d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Bugun, ${time}`;
  if (isYesterday) return `Kecha, ${time}`;
  
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" }) + `, ${time}`;
}

function TransactionRowView({ tx, myId }: { tx: TransactionRow; myId: string }) {
  const isOut = myId && String(tx.sender_id) === myId;
  const amount = parseFloat(String(tx.amount ?? 0)) || 0;
  const otherName = isOut
    ? [tx.receiver_name, tx.receiver_surname].filter(Boolean).join(" ").trim()
    : [tx.sender_name, tx.sender_surname].filter(Boolean).join(" ").trim();
  
  const title = otherName || (isOut ? "To'lov" : "Kirim");
  const sub = tx.note || (isOut ? "Chiquvchi o'tkazma" : "Kiruvchi o'tkazma");
  const when = formatTxDate(tx.created_at);
  const sign = isOut ? "−" : "+";
  const color = isOut ? "#fca5a5" : "#86efac";
  const Icon = isOut ? ArrowUpRight : ArrowDownLeft;

  return (
    <View style={styles.txRow}>
      <View style={[styles.txIconBox, { backgroundColor: isOut ? "rgba(252,165,165,0.1)" : "rgba(134,239,172,0.1)" }]}>
        <Icon color={color} size={18} />
      </View>
      <View style={styles.txRowText}>
        <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.txWhen}>{when}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.txAmount, { color }]}>
          {sign}{amount.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })}
        </Text>
        <Text style={styles.txCurrency}>MALI</Text>
      </View>
    </View>
  );
}


// --- SERVICES VIEW ---
export function ServicesView({ navigation }: { navigation: MessagesNav }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [experts, setExperts] = useState<ExpertSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchBusy, setSearchBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expertsCountRef = useRef(0);
  const { t } = useAuthLocale();

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(id);
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const hadData = expertsCountRef.current > 0;
      (async () => {
        if (hadData) setSearchBusy(true);
        else setLoading(true);
        setError(null);
        try {
          const list = await searchExperts(debounced);
          if (!cancelled) {
            setExperts(list);
            expertsCountRef.current = list.length;
          }
        } catch {
          if (!cancelled) setError("Ro'yxatni yuklashda xatolik");
        } finally {
          if (!cancelled) {
            setLoading(false);
            setSearchBusy(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [debounced])
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const list = await searchExperts(debounced);
      setExperts(list);
      expertsCountRef.current = list.length;
    } catch {
      setError("Ro'yxatni yuklashda xatolik");
    } finally {
      setRefreshing(false);
    }
  }, [debounced]);

  return (
    <View style={styles.viewContainer}>
      <View style={styles.glassSearch}>


        <Search color="rgba(255,255,255,0.4)" size={18} />
        <TextInput
          placeholder={t('dashSearchPlaceholder')}
          placeholderTextColor="rgba(255,255,255,0.4)"
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
        {searchBusy ? (
          <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
        ) : null}
      </View>

      <Text style={styles.searchHint}>
        {t('dashSearchHint')}
      </Text>

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      {loading && experts.length === 0 ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 180 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor="#ffffff"
            />
          }
        >
          {experts.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Search color="rgba(255,255,255,0.2)" size={40} />
              <Text style={styles.emptyText}>{t('dashNoExperts')}</Text>
            </View>
          ) : (
            experts.map((e) => (
              <ExpertGlassCard key={e.id} expert={e} navigation={navigation} />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

// --- PROFILE VIEW ---
export function ProfileView({ navigation }: any) {
  const currentUser = useAuthStore((s) => s.user) as AuthUser | null;
  const logout = useAuthStore((s) => s.logout);
  const avatarUri = currentUser?.avatar ?? currentUser?.avatar_url;
  const { t } = useAuthLocale();

  return (
    <ScrollView style={styles.viewContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
      <View style={styles.profileGlassCard}>
        <View style={{ marginBottom: 15 }}>
          <AvatarImage uri={avatarUri} name={currentUser?.name || "U"} size={80} />
        </View>
        <Text style={styles.profileName}>{currentUser?.name || 'Foydalanuvchi'}</Text>
        <Text style={styles.profilePhone}>{currentUser?.phone || '+998 00 000 00 00'}</Text>

        <Pressable style={styles.editProfileBtn} onPress={() => navigation.navigate("Settings")}>
           <Text style={styles.editProfileText}>{t('settingsProfile').toUpperCase()}</Text>
        </Pressable>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.profileSectionTitle}>{t('dashMenu')}</Text>
        <MenuGlassItem
          icon={<Settings color="#fff" size={20} />}
          label={t('settingsTitle')}
          onPress={() => navigation.navigate("Settings")}
        />
        <MenuGlassItem
          icon={<Palette color="#fff" size={20} />}
          label={t('settingsTheme')}
          onPress={() => navigation.navigate("ThemeDesign")}
        />
        <MenuGlassItem
          icon={<Bell color="#fff" size={20} />}
          label={t('settingsNotif')}
          onPress={() => navigation.navigate("Settings")}
        />
        <MenuGlassItem
          icon={<User color="#fff" size={20} />}
          label={t('settingsProfile')}
          onPress={() => navigation.navigate("Settings")}
        />
        <MenuGlassItem
          icon={<ShieldCheck color="#fff" size={20} />}
          label={t('privSecurity')}
          onPress={() => navigation.navigate("Settings")}
        />
        <Pressable style={styles.logoutBtn} onPress={async () => { await logout(); navigation.replace("Login"); }}>
           <View style={styles.logoutGlass}>
              <LogOut color="#fca5a5" size={20} />
              <Text style={styles.logoutText}>{t('settingsLogout').toUpperCase()}</Text>
           </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// --- CONTACTS VIEW ---
export function ContactsView({ navigation }: { navigation: MessagesNav }) {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useAuthLocale();
  
  const [contacts, setContacts] = useState<ExpertSearchRow[]>([]);
  const [selectedContact, setSelectedContact] = useState<ExpertSearchRow | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchContacts().then(list => {
        if (!cancelled) {
          setContacts(list);
          setLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; };
    }, [])
  );

  const filtered = contacts.filter(c => {
    const name = `${c.name || ""} ${c.surname || ""}`.toLowerCase();
    const username = (c.username || "").toLowerCase();
    const searchLow = search.toLowerCase();
    return name.includes(searchLow) || username.includes(searchLow);
  });


  const onAddContact = () => {
    const runSearch = async (q: string) => {
      const query = q.trim();
      if (query.length < 2) {
        Alert.alert(t("menuNewContact"), "Kamida 2 ta belgi kiriting");
        return;
      }
      try {
        const list = await searchExperts(query);
        if (!list.length) {
          Alert.alert(t("menuNewContact"), "Foydalanuvchi topilmadi");
          return;
        }
        const pick = list[0];
        await addContactRequest(
          pick.id,
          pick.name || undefined,
          pick.surname || undefined
        );
        Alert.alert("OK", `${pick.name || ""} kontaktlarga qo'shildi`);
        const rows = await fetchContacts();
        setContacts(rows);
      } catch (e) {
        Alert.alert(t("menuNewContact"), e instanceof Error ? e.message : "Xato");
      }
    };

    if (Platform.OS === "ios") {
      Alert.prompt(
        t("menuNewContact"),
        "Username yoki ism bo'yicha qidiring",
        [
          { text: t("msgCancel"), style: "cancel" },
          { text: "Qo'shish", onPress: (val?: string) => void runSearch(val || "") },
        ],
        "plain-text"
      );
    } else {
      Alert.alert(t("menuNewContact"), "Kontaktlar ro'yxatidan yoki qidiruv orqali tanlang, yoki ism yozing:", [
        { text: t("msgCancel"), style: "cancel" },
        {
          text: "Qidirish",
          onPress: () => {
            // Android: search current field
            void runSearch(search);
          },
        },
      ]);
    }
  };

  const onCallContact = async (c: ExpertSearchRow) => {
    setSelectedContact(null);
    try {
      const { chatId, name, avatarUrl } = await createOrOpenPrivateChat(c.id);
      navigation.navigate("ChatDetail", {
        chatId,
        name,
        avatarUrl: avatarUrl ?? null,
        startCall: "audio",
      });
    } catch (e) {
      Alert.alert("Qo'ng'iroq", e instanceof Error ? e.message : "Chat ochilmadi");
    }
  };

  const onOpenChat = async (c: ExpertSearchRow) => {
    setSelectedContact(null);
    try {
      const { chatId, name, avatarUrl } = await createOrOpenPrivateChat(c.id);
      navigation.navigate("ChatDetail", { chatId, name, avatarUrl: avatarUrl ?? null });
    } catch (e) {
      Alert.alert("Chat", e instanceof Error ? e.message : "Chat ochilmadi");
    }
  };

  return (
    <View style={styles.viewContainer}>
      <View style={styles.contactsHeader}>
         <View style={[styles.glassSearch, { flex: 1, marginBottom: 0 }]}>
            <Search color="rgba(255,255,255,0.4)" size={18} />
            <TextInput
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
         </View>
         <Pressable style={styles.addContactBtn} onPress={onAddContact}>
            <Plus color="#fff" size={24} />
         </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 180, paddingTop: 15 }}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyHistoryCard}>
              <Users color="rgba(255,255,255,0.2)" size={40} />
              <Text style={styles.emptyText}>{t('msgNoContacts')}</Text>
            </View>
          ) : (
            filtered.map((c) => (
              <Pressable 
                key={c.id} 
                style={styles.contactRow}
                onPress={() => setSelectedContact(c)}
              >
                <AvatarImage uri={c.avatar_url} name={`${c.name} ${c.surname}`} size={44} />
                <View style={styles.contactInfo}>
                   <Text style={styles.contactName}>{c.name} {c.surname}</Text>
                   <Text style={styles.contactSub}>{c.profession || c.specialization || t('msgUser')}</Text>
                </View>
                <ChevronRight color="rgba(255,255,255,0.2)" size={20} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
         <View style={styles.detailOverlay}>
            <View style={styles.detailGlassCard}>
               <Pressable style={styles.closeDetail} onPress={() => setSelectedContact(null)}>
                  <Plus color="#fff" size={24} style={{ transform: [{ rotate: '45deg' }] }} />
               </Pressable>
               
               <AvatarImage uri={selectedContact.avatar_url} name={`${selectedContact.name} ${selectedContact.surname}`} size={120} />
               <Text style={styles.detailName}>{selectedContact.name} {selectedContact.surname}</Text>
               <Text style={styles.detailSub}>{selectedContact.profession || selectedContact.specialization || t('msgUser')}</Text>
               
               <View style={styles.detailActions}>
                  <Pressable style={styles.detailActionBtn} onPress={() => onOpenChat(selectedContact)}>
                     <MessageSquare color="#fff" size={24} />
                     <Text style={styles.detailActionText}>{t('chatSendMessage')}</Text>
                  </Pressable>
                  <Pressable style={[styles.detailActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]} onPress={() => void onCallContact(selectedContact)}>
                     <Bell color="#fff" size={24} />
                     <Text style={styles.detailActionText}>{t('callAccept')}</Text>
                  </Pressable>
               </View>
               
               <View style={styles.detailMeta}>
                  <View style={styles.metaRow}>
                     <User color="rgba(255,255,255,0.4)" size={16} />
                     <Text style={styles.metaLabel}>{t('settingsProfile')}:</Text>
                     <Text style={styles.metaVal}>{selectedContact.username ? `@${selectedContact.username}` : t('msgUser')}</Text>
                  </View>
                  <View style={styles.metaRow}>
                     <Zap color="rgba(255,255,255,0.4)" size={16} />
                     <Text style={styles.metaLabel}>{t('expertStatus')}:</Text>
                     <Text style={styles.metaVal}>{selectedContact.verified_status === 'approved' ? t('expertVerified') : t('expertPending')}</Text>
                  </View>
               </View>
            </View>
         </View>
      )}
    </View>
  );
}

// --- HELPERS ---

function ActionIconBtn({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.actionItem} onPress={onPress}>
      <View style={[styles.actionGlassIcon, { borderBottomColor: color }]}>
        {icon}
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

function formatExpertPriceUz(expert: ExpertSearchRow): string {
  const raw = expert.hourly_rate ?? expert.service_price;
  if (raw == null || raw === "") return "—";
  const n = parseFloat(String(raw));
  if (Number.isNaN(n)) return String(raw);
  return n.toLocaleString("uz-UZ", { maximumFractionDigits: 0 });
}

function ExpertGlassCard({
  expert,
  navigation,
}: {
  expert: ExpertSearchRow;
  navigation: MessagesNav;
}) {
  const [booking, setBooking] = useState(false);
  const fullName =
    [expert.name, expert.surname].filter(Boolean).join(" ").trim() ||
    (expert.username ? `@${expert.username}` : "Mutaxassis");
  const job = expert.profession || expert.specialization || "—";
  const price = formatExpertPriceUz(expert);
  const verified = expert.verified_status === "approved";
  const { t } = useAuthLocale();
  const avg = parseFloat(String(expert.expert_rating ?? 0));
  const ratingLabel = Number.isFinite(avg) && avg > 0 ? avg.toFixed(1) : "—";

  const onOpenDetail = () => {
    navigation.navigate("ExpertDetail", { 
      expertId: expert.id,
      fallbackData: expert 
    });
  };

  return (
    <Pressable
      style={styles.expertGlassCard}
      onPress={onOpenDetail}
    >
      <View style={styles.expertTop}>
        <AvatarImage uri={expert.avatar_url} name={fullName} size={44} />
        <View style={styles.expertInfo}>
          <Text style={styles.expertName}>{fullName}</Text>
          <Text style={styles.expertJob}>{job}</Text>
        </View>
        <View style={styles.ratingBox}>
          <Star color="#f59e0b" fill={ratingLabel !== "—" ? "#f59e0b" : "transparent"} size={11} />
          <Text style={styles.ratingVal}>{ratingLabel}</Text>
          {verified ? <ShieldCheck color="#10b981" size={12} style={{ marginLeft: 4 }} /> : null}
        </View>
      </View>
      <View style={styles.expertBottom}>
        <View>
          <Text style={styles.priceLabel}>{t('dashPrice')}:</Text>
          <Text style={styles.priceVal}>{price} UZS</Text>
        </View>
        <View style={styles.bookBtn}>
          <Text style={styles.bookBtnText}>{t('dashBook')}</Text>
        </View>
      </View>
    </Pressable>
  );
}


function MenuGlassItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.menuIconWrap}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight color="rgba(255,255,255,0.3)" size={20} />
    </>
  );
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.menuItemGlass, pressed && styles.menuItemPressed]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.menuItemGlass}>{content}</View>;
}

const styles = StyleSheet.create({
  viewContainer: { flex: 1, padding: 16 },

  // Wallet
  glassCardLarge: { borderRadius: 30, padding: 25, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden", marginBottom: 20 },
  balanceHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  balanceLabel: { color: "#10b981", fontSize: 10, fontWeight: "900", letterSpacing: 1.5 },
  balanceRow: { flexDirection: "row", alignItems: "baseline" },
  balanceAmount: { color: "#fff", fontSize: 44, fontWeight: "900" },
  balanceCurrency: { color: "rgba(255,255,255,0.6)", fontSize: 16, marginLeft: 8, fontWeight: "bold" },
  balanceUzs: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 5 },
  lockedHint: { color: "rgba(251,191,36,0.85)", fontSize: 11, marginTop: 8 },
  inlineError: { color: "#fca5a5", fontSize: 13, marginBottom: 8, marginLeft: 4 },



  actionsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  actionItem: { alignItems: "center", width: width / 5 },
  actionGlassIcon: { width: 52, height: 52, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 8, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  actionLabel: { color: "rgba(255,255,255,0.5)", fontSize: 7, fontWeight: "900", textAlign: "center" },

  sectionHeader: {
    marginBottom: 12,
    marginLeft: 5,
    marginRight: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  withdrawLink: { color: "rgba(96,165,250,0.85)", fontSize: 11, fontWeight: "700" },
  pinHintBtn: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.4)",
    backgroundColor: "rgba(251,191,36,0.12)",
  },
  pinHintText: { color: "#fbbf24", fontSize: 12, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "#151820",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  modalHint: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 12 },
  modalError: { color: "#fca5a5", fontSize: 13, marginTop: 10 },
  fieldLabel: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 10,
  },
  fieldInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(0,0,0,0.35)",
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  adminCardBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    backgroundColor: "rgba(37,99,235,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  adminCardLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  adminCardNum: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginTop: 10,
    letterSpacing: 2,
    textAlign: "center",
  },
  modalSubmit: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#10b981",
  },
  modalSubmitText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  emptyHistoryCard: { borderRadius: 25, padding: 40, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  emptyText: { color: "rgba(255,255,255,0.25)", marginTop: 12, fontSize: 13 },
  txList: {},
  txRowWrap: { marginBottom: 8 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  txIconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 15 },
  txRowText: { flex: 1 },
  txTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  txSub: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },
  txWhen: { color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: "800" },
  txCurrency: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "900", marginTop: 2 },


  // Services
  glassSearch: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 15, height: 50, marginBottom: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  searchInput: { flex: 1, marginLeft: 10, color: "#fff", fontSize: 14 },
  searchHint: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    marginBottom: 12,
    marginLeft: 4,
    lineHeight: 16,
  },
  expertGlassCard: { borderRadius: 30, padding: 20, marginBottom: 12, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  expertCardBusy: { opacity: 0.85 },
  expertTop: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  expertInfo: { flex: 1, marginLeft: 12 },
  expertName: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  expertJob: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  ratingBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratingVal: { color: "#f59e0b", fontSize: 10, fontWeight: "bold", marginLeft: 4 },
  expertBottom: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", paddingTop: 15, justifyContent: "space-between" },
  priceLabel: { color: "rgba(255,255,255,0.3)", fontSize: 8, fontWeight: "900" },
  priceVal: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  bookBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnDisabled: { opacity: 0.7 },
  bookBtnText: { color: "#fff", fontSize: 9, fontWeight: "900" },

  // Profile
  profileGlassCard: { borderRadius: 35, padding: 30, alignItems: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden", marginBottom: 25 },
  profileName: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  profilePhone: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 },
  editProfileBtn: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)" },
  editProfileText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  profileSectionTitle: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
    marginLeft: 4,
  },
  menuSection: { gap: 12 },
  menuItemGlass: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.25)", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  menuItemPressed: { opacity: 0.88 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  menuLabel: { flex: 1, color: "#fff", fontSize: 14, fontWeight: "500" },
  logoutBtn: { marginTop: 15 },
  logoutGlass: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 15, borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(252,165,165,0.45)", backgroundColor: "rgba(252,165,165,0.12)", overflow: "hidden" },
  logoutText: { color: "#fca5a5", fontSize: 11, fontWeight: "900", marginLeft: 10 },
  
  // Contacts
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  contactInfo: { flex: 1, marginLeft: 12 },
  contactName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  contactSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },

  // Contact Detail
  contactsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addContactBtn: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 2000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailGlassCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 40,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closeDetail: { position: 'absolute', top: 20, right: 20, padding: 8 },
  detailName: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
  detailSub: { color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 6 },
  detailActions: { flexDirection: 'row', gap: 15, marginTop: 30, width: '100%' },
  detailActionBtn: {
    flex: 1,
    height: 90,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  detailActionText: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginTop: 10 },
  detailMeta: { width: '100%', marginTop: 35, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 25 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 13, flex: 1 },
  metaVal: { color: '#fff', fontSize: 13, fontWeight: '500' },
  p2pOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  p2pSheet: {
    backgroundColor: "#1a1f2e",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
    maxHeight: "82%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  p2pHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  p2pTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  p2pTabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  p2pTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },
  p2pTabActive: {
    backgroundColor: "rgba(99,102,241,0.35)",
    borderWidth: 1,
    borderColor: "rgba(129,140,248,0.45)",
  },
  p2pTabText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  p2pAdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  p2pAdName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  p2pAdMeta: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 },
  p2pBuyBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  p2pBuyText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
