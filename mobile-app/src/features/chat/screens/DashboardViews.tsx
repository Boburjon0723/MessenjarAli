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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowUpRight,
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
  type ExpertSearchRow,
  type TokenBalance,
  type TransactionRow,
} from "../../dashboard/api";
import { createOrOpenPrivateChat } from "../service";

const { width } = Dimensions.get("window");

type MessagesNav = {
  navigate: (
    name: "ChatDetail",
    params: { chatId: string; name: string; avatarUrl?: string | null }
  ) => void;
};

// --- WALLET VIEW ---
export function WalletView() {
  const user = useAuthStore((s) => s.user);
  const myId = user?.id ? String(user.id) : "";

  const [balance, setBalance] = useState<TokenBalance | null>(null);
npx expo start  const [txs, setTxs] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useAuthLocale();

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

  const balNum = parseFloat(balance?.balance ?? "0") || 0;
  const lockedNum = parseFloat(balance?.locked_balance ?? "0") || 0;
  const uzsApprox = Math.round(balNum * MALI_UZS_APPROX);

  return (
    <ScrollView
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
          </>
        )}
      </View>

      {error ? (
        <Text style={styles.inlineError}>{error}</Text>
      ) : null}

      <View style={styles.actionsGrid}>
        <ActionIconBtn icon={<Plus color="#fff" size={24}/>} label={t('dashFill')} color="rgba(16, 185, 129, 0.6)" />
        <ActionIconBtn icon={<ArrowUpRight color="#fff" size={24}/>} label={t('dashSend')} color="rgba(59, 130, 246, 0.6)" />
        <ActionIconBtn icon={<Zap color="#fff" size={24}/>} label={t('dashBuy')} color="rgba(99, 102, 241, 0.6)" />
        <ActionIconBtn icon={<History color="#fff" size={24}/>} label={t('dashHistory')} color="rgba(245, 158, 11, 0.6)" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('dashRecent')}</Text>
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
    </ScrollView>
  );
}

function TransactionRowView({ tx, myId }: { tx: TransactionRow; myId: string }) {
  const isOut = myId && String(tx.sender_id) === myId;
  const amount = parseFloat(String(tx.amount ?? 0)) || 0;
  const otherName = isOut
    ? [tx.receiver_name, tx.receiver_surname].filter(Boolean).join(" ").trim()
    : [tx.sender_name, tx.sender_surname].filter(Boolean).join(" ").trim();
  const title = otherName || tx.type || "Tranzaksiya";
  const sub = tx.note || tx.status || "";
  const when = tx.created_at
    ? new Date(tx.created_at).toLocaleString("uz-UZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";
  const sign = isOut ? "−" : "+";
  const color = isOut ? "#fca5a5" : "#86efac";

  return (
    <View style={styles.txRow}>
      <View style={styles.txRowText}>
        <Text style={styles.txTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={styles.txSub} numberOfLines={1}>{sub}</Text> : null}
        {when ? <Text style={styles.txWhen}>{when}</Text> : null}
      </View>
      <Text style={[styles.txAmount, { color }]}>
        {sign}{amount.toLocaleString("uz-UZ", { maximumFractionDigits: 2 })} MALI
      </Text>
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
      searchExperts("").then(list => {
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
    const name = `${c.name} ${c.surname}`.toLowerCase();
    return name.includes(search.toLowerCase()) || (c.username || "").toLowerCase().includes(search.toLowerCase());
  });

  const onAddContact = () => {
    Alert.alert(t('menuNewContact'), "Yangi kontakt qo'shish xizmati tez kunda ishga tushadi.");
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
                  <Pressable style={[styles.detailActionBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]} onPress={() => Alert.alert(t('callConnected'), "Tez kunda...")}>
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

function ActionIconBtn({ icon, label, color }: any) {
  return (
    <Pressable style={styles.actionItem}>
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

  const onBook = async () => {
    if (booking) return;
    setBooking(true);
    try {
      const { chatId, name, avatarUrl } = await createOrOpenPrivateChat(expert.id);
      navigation.navigate("ChatDetail", {
        chatId,
        name,
        avatarUrl: avatarUrl ?? undefined,
      });
    } catch (e) {
      Alert.alert("Chat", e instanceof Error ? e.message : "Chat ochilmadi");
    } finally {
      setBooking(false);
    }
  };

  return (
    <Pressable
      style={[styles.expertGlassCard, booking && styles.expertCardBusy]}
      onPress={onBook}
      disabled={booking}
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
        <View style={[styles.bookBtn, booking && styles.bookBtnDisabled]}>
          {booking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.bookBtnText}>{t('dashBook')}</Text>
          )}
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

  sectionHeader: { marginBottom: 12, marginLeft: 5 },
  sectionTitle: { color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  emptyHistoryCard: { borderRadius: 25, padding: 40, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  emptyText: { color: "rgba(255,255,255,0.25)", marginTop: 12, fontSize: 13 },
  txList: {},
  txRowWrap: { marginBottom: 8 },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  txRowText: { flex: 1, marginRight: 12 },
  txTitle: { color: "#fff", fontSize: 14, fontWeight: "600" },
  txSub: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 2 },
  txWhen: { color: "rgba(255,255,255,0.25)", fontSize: 10, marginTop: 4 },
  txAmount: { fontSize: 13, fontWeight: "800" },

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
});
