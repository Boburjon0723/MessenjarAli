import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Switch,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bell, MessageSquare, Volume2, Vibrate } from "lucide-react-native";
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthLocale } from "../../auth/locale";

export function NotificationSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useAuthLocale();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [previewEnabled, setPreviewEnabled] = useState(true);

  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('settingsNotif')}</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settingsAccount')}</Text>
            
            <NotifToggle
              icon={<Bell color="#3b82f6" size={22} />}
              label={t('notifAll')}
              value={notifEnabled}
              onValueChange={setNotifEnabled}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('notifSettings')}</Text>
            
            <NotifToggle
              icon={<MessageSquare color="#10b981" size={22} />}
              label={t('notifPreview')}
              subLabel={t('notifPreviewSub')}
              value={previewEnabled}
              onValueChange={setPreviewEnabled}
            />
            
            <NotifToggle
              icon={<Volume2 color="#f59e0b" size={22} />}
              label={t('notifSound')}
              value={soundEnabled}
              onValueChange={setSoundEnabled}
            />
            
            <NotifToggle
              icon={<Vibrate color="#ec4899" size={22} />}
              label={t('notifVibrate')}
              value={vibrationEnabled}
              onValueChange={setVibrationEnabled}
            />
          </View>
        </ScrollView>
      </ChatBackground>
    </View>
  );
}

function NotifToggle({ icon, label, subLabel, value, onValueChange }: any) {
  return (
    <View style={styles.item}>
      <View style={styles.itemIconContainer}>{icon}</View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemLabel}>{label}</Text>
        {subLabel && <Text style={styles.itemSubLabel}>{subLabel}</Text>}
      </View>
      <Switch
        trackColor={{ false: "rgba(255,255,255,0.1)", true: "#10b981" }}
        thumbColor={value ? "#fff" : "#f4f3f4"}
        ios_backgroundColor="rgba(255,255,255,0.1)"
        onValueChange={onValueChange}
        value={value}
      />
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
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 20, marginBottom: 10 },
  sectionTitle: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 5,
    textTransform: "uppercase",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  itemTextContainer: { flex: 1 },
  itemLabel: { color: "#fff", fontSize: 16, fontWeight: "500" },
  itemSubLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
});
