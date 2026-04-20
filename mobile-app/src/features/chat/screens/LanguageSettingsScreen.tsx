import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView } from "react-native";
import { ArrowLeft, Check } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthLocale } from "../../auth/locale";

export function LanguageSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { lang, setLang, t }: any = useAuthLocale();

  const languages = [
    { code: "uz", name: "O'zbekcha", label: "O'zbekcha" },
    { code: "ru", name: "Русский", label: "Русский" },
    { code: "en", name: "English", label: "English" },
  ];

  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('langTitle')}</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('langSection')}</Text>
            {languages.map((langItem) => (
              <Pressable 
                key={langItem.code} 
                style={styles.item}
                onPress={() => setLang(langItem.code)}
              >
                <View style={styles.itemInfo}>
                   <Text style={styles.langName}>{langItem.name}</Text>
                   <Text style={styles.langLabel}>{langItem.label}</Text>
                </View>
                {lang === langItem.code && <Check color="#3b82f6" size={22} />}
              </Pressable>
            ))}
          </View>

          <View style={styles.infoCard}>
             <Text style={styles.infoText}>
                {t('langInfo')}
             </Text>
          </View>
        </ScrollView>
      </ChatBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  backButton: { padding: 5, marginRight: 15 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: "bold", letterSpacing: 1, marginBottom: 15, marginLeft: 5 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  itemInfo: {},
  langName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  langLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  infoCard: {
     padding: 15,
     borderRadius: 15,
     backgroundColor: "rgba(59, 130, 246, 0.1)",
     borderWidth: 1,
     borderColor: "rgba(59, 130, 246, 0.2)",
  },
  infoText: { color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 18, textAlign: "center" },
});
