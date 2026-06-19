import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
} from "react-native";
import { 
  ChevronLeft, 
  MessageSquare, 
  Star, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  MapPin, 
  Award,
  CircleDollarSign
} from "lucide-react-native";
import { fetchExpertDetail } from "../api";
import { AvatarImage } from "../../../components/AvatarImage";
import { createOrOpenPrivateChat } from "../../chat/service";
import { useAuthLocale } from "../../auth/locale";

const { width } = Dimensions.get("window");

export function ExpertDetailScreen({ route, navigation }: any) {
  const { expertId, fallbackData } = route.params;
  const [expert, setExpert] = useState<any>(fallbackData || null);
  const [loading, setLoading] = useState(!fallbackData);
  const [booking, setBooking] = useState(false);
  const { t } = useAuthLocale();

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchExpertDetail(expertId);
        setExpert(data);
      } catch (err) {
        if (!expert) Alert.alert("Xato", "Mutaxassis topilmadi");
      } finally {
        setLoading(false);
      }
    })();
  }, [expertId]);

  const onContact = async () => {
    if (booking) return;
    setBooking(true);
    try {
      const { chatId, name, avatarUrl } = await createOrOpenPrivateChat(expertId);
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

  if (loading && !expert) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0ea5e9" size="large" />
      </View>
    );
  }

  const fullName = `${expert.name} ${expert.surname || ""}`.trim();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Mutaxassis Profili</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileHero}>
           <View style={styles.avatarOutline}>
              <AvatarImage uri={expert.avatar_url} name={fullName} size={110} />
              {expert.verified_status === 'approved' && (
                <View style={styles.verifyBadge}>
                  <ShieldCheck color="#fff" size={16} />
                </View>
              )}
           </View>
           <Text style={styles.userName}>{fullName}</Text>
           <Text style={styles.userProfession}>{expert.profession || "Mutaxassis"}</Text>
           
           <View style={styles.statsRow}>
              <View style={styles.statItem}>
                 <Star color="#f59e0b" fill="#f59e0b" size={16} />
                 <Text style={styles.statValue}>{expert.expert_rating || "5.0"}</Text>
                 <Text style={styles.statLabel}>Reyting</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                 <Award color="#38bdf8" size={16} />
                 <Text style={styles.statValue}>{expert.experience_years || "1"}+ yil</Text>
                 <Text style={styles.statLabel}>Tajriba</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                 <MessageSquare color="#10b981" size={16} />
                 <Text style={styles.statValue}>100+</Text>
                 <Text style={styles.statLabel}>Maslahat</Text>
              </View>
           </View>
        </View>

        {/* Info Sections */}
        <View style={styles.contentSections}>
           <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mutaxassis Haqida</Text>
              <Text style={styles.sectionDesc}>
                {expert.bio_expert || expert.specialty_desc || expert.bio || "Mutaxassis o'zining tajribasi va xizmatlari haqida hali ma'lumot qoldirmagan."}
              </Text>
           </View>

           <View style={styles.section}>
              <Text style={styles.sectionTitle}>Xizmat Tafsilotlari</Text>
              <View style={styles.detailRow}>
                 <CircleDollarSign color="rgba(255,255,255,0.4)" size={20} />
                 <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Narxi</Text>
                    <Text style={styles.detailValue}>
                      {expert.hourly_rate || expert.service_price || "0"} {expert.currency || "MALI"}
                      <Text style={styles.detailSub}> / {expert.pricing_model === 'session' ? 'sessiya' : 'soat'}</Text>
                    </Text>
                 </View>
              </View>

              <View style={styles.detailRow}>
                 <Clock color="rgba(255,255,255,0.4)" size={20} />
                 <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Ish vaqti</Text>
                    <Text style={styles.detailValue}>{expert.working_hours || "Kelishuvga ko'ra"}</Text>
                 </View>
              </View>

              <View style={styles.detailRow}>
                 <MapPin color="rgba(255,255,255,0.4)" size={20} />
                 <View style={styles.detailText}>
                    <Text style={styles.detailLabel}>Manzil</Text>
                    <Text style={styles.detailValue}>{expert.wiloyat ? `${expert.wiloyat}, ${expert.tuman}` : "Onlayn xizmat"}</Text>
                 </View>
              </View>
           </View>
        </View>
      </ScrollView>

      {/* Floating Action Bar */}
      <View style={styles.actionBar}>
         <Pressable 
           style={[styles.contactBtn, booking && styles.btnDisabled]} 
           onPress={onContact}
           disabled={booking}
         >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MessageSquare color="#fff" size={20} />
                <Text style={styles.contactBtnText}>MUTAXASSIS BILAN BOG'LANISH</Text>
              </>
            )}
         </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#020617" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  scrollContent: { paddingBottom: 150 },
  profileHero: { alignItems: "center", marginTop: 20, paddingHorizontal: 24 },
  avatarOutline: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 3,
    borderColor: "#0ea5e9",
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(14, 165, 233, 0.1)",
  },
  verifyBadge: {
    position: "absolute",
    bottom: 0,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#020617",
  },
  userName: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 15, textAlign: "center" },
  userProfession: { color: "#0ea5e9", fontSize: 14, fontWeight: "800", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    paddingVertical: 15,
    paddingHorizontal: 10,
    marginTop: 25,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 4 },
  statLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "700", marginTop: 2, textTransform: "uppercase" },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.1)" },
  contentSections: { paddingHorizontal: 24, marginTop: 30 },
  section: { marginBottom: 30 },
  sectionTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  sectionDesc: { color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 22 },
  detailRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  detailText: { marginLeft: 15 },
  detailLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  detailValue: { color: "#fff", fontSize: 15, fontWeight: "700", marginTop: 2 },
  detailSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "500" },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 30,
    backgroundColor: "rgba(2, 6, 23, 0.95)",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  contactBtn: {
    height: 60,
    backgroundColor: "#0ea5e9",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  contactBtnText: { color: "#fff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  btnDisabled: { opacity: 0.7, backgroundColor: "#475569" },
});
