import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  MessageCircle,
  Phone,
  User,
  Link2,
  Mic,
  Users,
  Pencil,
  Trash2,
  ShieldAlert,
  Radio,
} from "lucide-react-native";
import { ChatBackground } from "../../../components/ChatBackground";
import { AvatarImage } from "../../../components/AvatarImage";
import {
  ChatDetailsParticipant,
  ChatDetailsResponse,
  getChatDetailsRequest,
  normalizeUserId,
} from "../service";
import { useAuthStore } from "../../auth/store";

type Props = {
  route: {
    params?: {
      chatId?: string;
      name?: string;
      avatarUrl?: string | null;
    };
  };
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
};

export function ChatPeerInfoScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const chatId = route.params?.chatId ? String(route.params.chatId) : "";
  const fallbackName = route.params?.name ? String(route.params.name) : "";
  const fallbackAvatar = route.params?.avatarUrl ? String(route.params.avatarUrl) : "";

  const selfId = useAuthStore((s) => {
    const u = s.user as { id?: string; _id?: string } | null | undefined;
    return normalizeUserId(u?.id ?? u?._id);
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ChatDetailsResponse | null>(null);

  const load = useCallback(async () => {
    if (!chatId) {
      setLoading(false);
      setError("Chat topilmadi");
      return;
    }
    setError(null);
    try {
      const d = await getChatDetailsRequest(chatId);
      setDetails(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    void load();
  }, [load]);

  const participants = details?.participants ?? [];
  const chatType = String(details?.type ?? "private").toLowerCase();
  const isGroup = chatType === "group" || chatType === "channel";

  const peer: ChatDetailsParticipant | null = (() => {
    if (!participants.length) return null;
    if (isGroup) return null;
    const other = participants.find((p) => normalizeUserId(p.id) !== selfId);
    return other ?? participants[0];
  })();

  const displayName = (() => {
    if (isGroup) {
      return details?.name || fallbackName || "Guruh";
    }
    if (peer) {
      const n = `${peer.name ?? ""} ${peer.surname ?? ""}`.trim();
      return n || fallbackName || "Foydalanuvchi";
    }
    return fallbackName || "Chat";
  })();

  /** AvatarImage ichida getFullUrl — nisbiy yo‘llar server bilan to‘liq URL bo‘ladi */
  const avatarRawForImage = isGroup
    ? details?.avatar_url ?? null
    : peer?.avatar ?? (fallbackAvatar ? fallbackAvatar : null);

  const phone = !isGroup && peer?.phone ? String(peer.phone) : null;
  const handle = (() => {
    if (isGroup) return `@${String(details?.name ?? "group").replace(/\s+/g, "_").slice(0, 24)}`;
    if (phone) return `@${phone.replace(/\D/g, "").slice(-4)}`;
    if (peer?.id) return `@user_${String(peer.id).slice(0, 8)}`;
    return "@user";
  })();

  const statusLine = isGroup
    ? `${participants.length} ishtirokchi`
    : peer?.specialization || peer?.profession || "Oxirgi faollik: yaqinda";

  const glassBtn = (icon: React.ReactNode, label: string, onPress: () => void) => (
    <Pressable style={styles.quickBtn} onPress={onPress}>
      {icon}
      <Text style={styles.quickBtnText}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <ChatBackground>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={12}>
            <X color="#fff" size={26} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#38bdf8" size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.err}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryText}>Qayta urinish</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.avatarRing}>
                <AvatarImage uri={avatarRawForImage} name={displayName} size={112} />
              </View>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.handle}>{handle}</Text>
              <Text style={styles.status}>{statusLine}</Text>
            </View>

            <View style={styles.quickRow}>
              {glassBtn(
                <MessageCircle color="#fff" size={22} />,
                "Suhbat",
                () => navigation.goBack()
              )}
              {glassBtn(
                <Phone color="#fff" size={22} />,
                "Qo‘ng‘iroq",
                () => Alert.alert("Qo‘ng‘iroq", "Tez orada qo‘shiladi.")
              )}
              {glassBtn(
                <User color="#fff" size={22} />,
                "Shaxsiy",
                () => Alert.alert("Shaxsiy", "Tez orada.")
              )}
            </View>

            <View style={styles.card}>
              {phone ? (
                <View style={styles.row}>
                  <Text style={styles.rowMain}>{phone}</Text>
                  <Text style={styles.rowSub}>Telefon raqami</Text>
                </View>
              ) : isGroup ? (
                <View style={styles.row}>
                  <Text style={styles.rowMain}>{details?.name || "—"}</Text>
                  <Text style={styles.rowSub}>Guruh nomi</Text>
                </View>
              ) : (
                <View style={styles.row}>
                  <Text style={styles.rowMuted}>Telefon API orqali yo‘q</Text>
                  <Text style={styles.rowSub}>Telefon raqami</Text>
                </View>
              )}

              {(peer?.specialization || peer?.profession) && (
                <>
                  <View style={styles.sep} />
                  <View style={styles.row}>
                    <Text style={styles.rowMain}>{peer.specialization || peer.profession}</Text>
                    <Text style={styles.rowSub}>Mutaxassisligi</Text>
                  </View>
                </>
              )}

              {(peer as any)?.experience_years != null && (
                <>
                  <View style={styles.sep} />
                  <View style={styles.row}>
                    <Text style={styles.rowMain}>{(peer as any).experience_years} yil</Text>
                    <Text style={styles.rowSub}>Ish tajribasi</Text>
                  </View>
                </>
              )}

              {(peer as any)?.bio_expert && (
                <>
                  <View style={styles.sep} />
                  <View style={styles.row}>
                    <Text style={[styles.rowMain, { fontWeight: '400', fontSize: 14, lineHeight: 20 }]}>
                        {(peer as any).bio_expert}
                    </Text>
                    <Text style={styles.rowSub}>O'zi haqida</Text>
                  </View>
                </>
              )}

              <View style={styles.sep} />

              <Pressable style={styles.listRow} onPress={() => Alert.alert("Havolalar", "Tez orada.")}>
                <Link2 color="rgba(255,255,255,0.85)" size={20} />
                <Text style={styles.listText}>Umumiy havolalar</Text>
                <Text style={styles.listMeta}>0</Text>
              </Pressable>
              <Pressable style={styles.listRow} onPress={() => Alert.alert("Ovoz", "Tez orada.")}>
                <Mic color="rgba(255,255,255,0.85)" size={20} />
                <Text style={styles.listText}>Ovozli xabarlar</Text>
                <Text style={styles.listMeta}>0</Text>
              </Pressable>
              <Pressable style={styles.listRow} onPress={() => Alert.alert("Guruhlar", "Tez orada.")}>
                <Users color="rgba(255,255,255,0.85)" size={20} />
                <Text style={styles.listText}>Umumiy guruhlar</Text>
                <Text style={styles.listMeta}>0</Text>
              </Pressable>
              {isGroup ? (
                <Pressable style={styles.listRow} onPress={() => {}}>
                  <Radio color="rgba(255,255,255,0.85)" size={20} />
                  <Text style={styles.listText}>Kanal / guruh turi</Text>
                  <Text style={styles.listMeta}>{chatType}</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={[styles.card, { marginTop: 14 }]}>
              <Pressable
                style={styles.actionRow}
                onPress={() => Alert.alert("Tahrirlash", "Tez orada.")}
              >
                <Pencil color="rgba(255,255,255,0.9)" size={20} />
                <Text style={styles.actionLabel}>Kontaktni tahrirlash</Text>
              </Pressable>
              <View style={styles.sep} />
              <Pressable
                style={styles.actionRow}
                onPress={() => Alert.alert("O‘chirish", "Tez orada.")}
              >
                <Trash2 color="rgba(248,113,113,0.95)" size={20} />
                <Text style={[styles.actionLabel, { color: "#fca5a5" }]}>Kontaktni o‘chirish</Text>
              </Pressable>
              <View style={styles.sep} />
              <Pressable
                style={styles.actionRow}
                onPress={() => Alert.alert("Bloklash", "Tez orada.")}
              >
                <ShieldAlert color="rgba(248,113,113,0.95)" size={20} />
                <Text style={[styles.actionLabel, { color: "#fca5a5" }]}>Bloklash</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </ChatBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
  closeBtn: { padding: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  err: { color: "#fca5a5", textAlign: "center", marginBottom: 12 },
  retry: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.12)" },
  retryText: { color: "#fff", fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  hero: { alignItems: "center", paddingHorizontal: 20, paddingTop: 8 },
  avatarRing: {
    padding: 3,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.85)",
    marginBottom: 16,
  },
  name: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  handle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 15,
    marginTop: 6,
  },
  status: {
    color: "#38bdf8",
    fontSize: 14,
    marginTop: 10,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 22,
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    gap: 8,
  },
  quickBtnText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 22,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  row: { padding: 16 },
  rowMain: { color: "#fff", fontSize: 17, fontWeight: "600" },
  rowSub: { color: "#38bdf8", fontSize: 12, marginTop: 6, fontWeight: "500" },
  rowMuted: { color: "rgba(255,255,255,0.45)", fontSize: 15 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.1)" },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  listText: { flex: 1, color: "rgba(255,255,255,0.92)", fontSize: 15 },
  listMeta: { color: "rgba(255,255,255,0.35)", fontSize: 14 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  actionLabel: { color: "rgba(255,255,255,0.92)", fontSize: 15 },
});
