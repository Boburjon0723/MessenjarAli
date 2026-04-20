import React from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Info, ShieldCheck, Zap, Globe } from "lucide-react-native";
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthLocale } from "../../auth/locale";

export function AboutAppScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useAuthLocale();

  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('settingsAbout')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.logoCard}>
            <View style={styles.logoIcon}>
              <Zap color="#38bdf8" size={50} fill="#38bdf8" />
            </View>
            <Text style={styles.appName}>ExpertLine</Text>
            <Text style={styles.version}>Version 1.2.0</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.description}>
              {t('aboutFull')}
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <FeatureItem 
              icon={<ShieldCheck color="#10b981" size={20} />} 
              title="Xavfsiz muloqot" 
              desc="Barcha xabarlar va qo'ng'iroqlar shifrlangan"
            />
            <FeatureItem 
              icon={<Globe color="#3b82f6" size={20} />} 
              title="Global platforma" 
              desc="Dunyoning istalgan nuqtasidan mutaxassislar"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.copyright}>© 2026 MALI Platform. Barcha huquqlar himoyalangan.</Text>
          </View>
        </ScrollView>
      </ChatBackground>
    </View>
  );
}

function FeatureItem({ icon, title, desc }: any) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
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
  logoCard: {
    alignItems: "center",
    marginVertical: 30,
  },
  logoIcon: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.3)",
    marginBottom: 20,
  },
  appName: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: 1 },
  version: { color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 5 },
  infoCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 25,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 25,
  },
  description: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "left",
  },
  featuresSection: { gap: 12 },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  featureText: { flex: 1 },
  featureTitle: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  featureDesc: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  footer: { marginTop: 40, alignItems: "center" },
  copyright: { color: "rgba(255,255,255,0.25)", fontSize: 11, textAlign: "center" },
});
