import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView, Switch, Alert } from "react-native";
import { ArrowLeft, Trash2, HardDrive, Database, Shield } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthLocale } from "../../auth/locale";

export function DataStorageSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useAuthLocale();
  const [autoDownload, setAutoDownload] = useState(true);
  const [saveToGallery, setSaveToGallery] = useState(false);

  const clearCache = () => {
    Alert.alert(
      "Keshni tozalash",
      "Barcha kesh ma'lumotlari (rasmlar, videolar) o'chiriladi. Fayllar serverdan qayta yuklanishi mumkin.",
      [
        { text: "Bekor qilish", style: "cancel" },
        { text: "Tozalash", style: "destructive", onPress: () => Alert.alert("Muvaffaqiyatli", "Kesh tozalandi.") }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('dataTitle')}</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dataNetwork')}</Text>
            <View style={styles.item}>
               <View style={styles.itemIcon}><Database color="#10b981" size={20}/></View>
               <View style={styles.itemText}>
                  <Text style={styles.itemLabel}>{t('dataAutoDown')}</Text>
                  <Text style={styles.itemSubLabel}>{t('dataAutoDown')}</Text>
               </View>
               <Switch 
                 value={autoDownload} 
                 onValueChange={setAutoDownload}
                 trackColor={{ false: "#1e293b", true: "#10b981" }}
               />
            </View>
            <View style={styles.item}>
               <View style={styles.itemIcon}><Shield color="#3b82f6" size={20}/></View>
               <View style={styles.itemText}>
                  <Text style={styles.itemLabel}>{t('dataGallery')}</Text>
                  <Text style={styles.itemSubLabel}>{t('dataGallery')}</Text>
               </View>
               <Switch 
                 value={saveToGallery} 
                 onValueChange={setSaveToGallery}
                 trackColor={{ false: "#1e293b", true: "#3b82f6" }}
               />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('dataStorage')}</Text>
            <View style={styles.statsCard}>
               <View style={styles.statsRow}>
                  <HardDrive color="#94a3b8" size={18} />
                  <Text style={styles.statsLabel}>{t('dataUsage')}:</Text>
                  <Text style={styles.statsValue}>142 MB</Text>
               </View>
               <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: '45%' }]} />
               </View>
            </View>

            <Pressable style={styles.dangerBtn} onPress={clearCache}>
               <Trash2 color="#fca5a5" size={20} />
               <Text style={styles.dangerBtnText}>{t('dataClear')}</Text>
            </Pressable>
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
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 30 },
  sectionTitle: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: "bold", letterSpacing: 1, marginBottom: 15, marginLeft: 5 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    marginBottom: 10,
  },
  itemIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  itemText: { flex: 1 },
  itemLabel: { color: "#fff", fontSize: 15, fontWeight: "500" },
  itemSubLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  statsCard: {
     padding: 20,
     backgroundColor: "rgba(255,255,255,0.03)",
     borderRadius: 20,
     marginBottom: 15,
     borderWidth: 1,
     borderColor: "rgba(255,255,255,0.05)",
  },
  statsRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  statsLabel: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginLeft: 8, flex: 1 },
  statsValue: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  progressBarBg: { height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.05)", overflow: "hidden" },
  progressBarFill: { height: '100%', backgroundColor: "#3b82f6", borderRadius: 3 },
  dangerBtn: {
     flexDirection: "row",
     alignItems: "center",
     justifyContent: "center",
     paddingVertical: 16,
     borderRadius: 18,
     backgroundColor: "rgba(239, 68, 68, 0.1)",
     borderWidth: 1,
     borderColor: "rgba(239, 68, 68, 0.2)",
  },
  dangerBtnText: { color: "#fca5a5", fontSize: 14, fontWeight: "bold", marginLeft: 10 },
});
