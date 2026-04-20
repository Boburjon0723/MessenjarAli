import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MessageCircle, Phone, LifeBuoy, Send } from "lucide-react-native";
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthLocale } from "../../auth/locale";

export function SupportScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useAuthLocale();

  const handleTG = () => Linking.openURL("https://t.me/ExpertLine_Support");
  const handleCall = () => Linking.openURL("tel:+998901234567");

  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('settingsOther')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <LifeBuoy color="#3b82f6" size={50} />
            <Text style={styles.introTitle}>Qanday yordam bera olamiz?</Text>
            <Text style={styles.introDesc}>
              Savollaringiz bormi yoki muammoga duch keldingiz? Bizning jamoamiz sizga yordam berishga tayyor.
            </Text>
          </View>

          <View style={styles.optionsList}>
             <SupportOption 
               icon={<Send color="#0088cc" size={22} />} 
               title={t('supportTg')} 
               onPress={handleTG} 
             />
             <SupportOption 
               icon={<Phone color="#10b981" size={22} />} 
               title={t('supportCall')} 
               onPress={handleCall} 
             />
             <SupportOption 
               icon={<MessageCircle color="#f59e0b" size={22} />} 
               title={t('supportHelp')} 
               onPress={() => {}} 
             />
          </View>

          <View style={styles.hoursCard}>
             <Text style={styles.hoursLabel}>Ish vaqti:</Text>
             <Text style={styles.hoursText}>Dushanba - Shanba: 09:00 - 18:00</Text>
             <Text style={styles.hoursSub}>Yakshanba: Dam olish kuni</Text>
          </View>
        </ScrollView>
      </ChatBackground>
    </View>
  );
}

function SupportOption({ icon, title, onPress }: any) {
  return (
    <Pressable style={styles.optionItem} onPress={onPress}>
      <View style={styles.optionIcon}>{icon}</View>
      <Text style={styles.optionTitle}>{title}</Text>
      <ArrowLeft color="rgba(255,255,255,0.2)" size={18} style={{ transform: [{ rotate: '180deg'}] }} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  scrollContent: { padding: 20, paddingBottom: 60 },
  introCard: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(59, 130, 246, 0.2)",
    marginBottom: 30,
  },
  introTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 20, textAlign: "center" },
  introDesc: { color: "rgba(255,255,255,0.6)", fontSize: 14, marginTop: 10, textAlign: "center", lineHeight: 20 },
  optionsList: { gap: 12 },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  optionTitle: { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1 },
  hoursCard: {
    marginTop: 40,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    alignItems: "center",
  },
  hoursLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 },
  hoursText: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 8 },
  hoursSub: { color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 4 },
});
