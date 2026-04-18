import React from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  StatusBar,
} from "react-native";
import { ArrowLeft, User, Bell, Lock, Palette, Globe, Shield, Info, LogOut } from "lucide-react-native";
import { DEFAULT_PLATFORM_BACKGROUND } from "../../../lib/constants";
import { useAuthStore } from "../../auth/store";

export function SettingsScreen({ navigation }: any) {
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={{ uri: DEFAULT_PLATFORM_BACKGROUND }} style={styles.backgroundImage}>
        <View style={styles.overlay} />

        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Sozlamalar</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Summary */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{currentUser?.name?.[0] || 'U'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{currentUser?.name || 'Foydalanuvchi'}</Text>
              <Text style={styles.userPhone}>{currentUser?.phone || '+998 00 000 00 00'}</Text>
            </View>
            <Pressable style={styles.editBtn} onPress={() => {}}>
               <Text style={styles.editBtnText}>Tahrirlash</Text>
            </Pressable>
          </View>

          {/* Settings Groups */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AKKAUNT</Text>
            <SettingItem icon={<User color="#3b82f6" size={22}/>} label="Profil ma'lumotlari" />
            <SettingItem icon={<Bell color="#10b981" size={22}/>} label="Bildirishnomalar" />
            <SettingItem icon={<Lock color="#f59e0b" size={22}/>} label="Maxfiylik va xavfsizlik" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ILOVA SOZLAMALARI</Text>
            <SettingItem icon={<Palette color="#8b5cf6" size={22}/>} label="Mavzu va dizayn" />
            <SettingItem icon={<Globe color="#0ea5e9" size={22}/>} label="Til" subLabel="O'zbekcha" />
            <SettingItem icon={<Shield color="#ec4899" size={22}/>} label="Ma'lumotlar va xotira" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BOSHQALAR</Text>
            <SettingItem icon={<Info color="#94a3b8" size={22}/>} label="Ilova haqida" />
            <Pressable style={styles.logoutItem} onPress={handleLogout}>
               <View style={styles.itemIconContainer}><LogOut color="#fca5a5" size={22}/></View>
               <Text style={styles.logoutLabel}>Tizimdan chiqish</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
             <Text style={styles.versionText}>ExpertLine Mobile v1.2.0</Text>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

function SettingItem({ icon, label, subLabel }: any) {
  return (
    <Pressable style={styles.item}>
      <View style={styles.itemIconContainer}>{icon}</View>
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemLabel}>{label}</Text>
        {subLabel && <Text style={styles.itemSubLabel}>{subLabel}</Text>}
      </View>
      <View style={styles.arrowContainer}>
        <Text style={{color: 'rgba(255,255,255,0.2)'}}>{">"}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  backgroundImage: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.7)" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(15, 23, 42, 0.8)"
  },
  backButton: { padding: 5, marginRight: 15 },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  content: { flex: 1 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    margin: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  profileInfo: { marginLeft: 15, flex: 1 },
  userName: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  userPhone: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 },
  editBtn: { backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  editBtnText: { color: "#3b82f6", fontSize: 12, fontWeight: "bold" },
  section: { marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: { color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: "bold", letterSpacing: 1, marginBottom: 10, marginLeft: 5 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    marginBottom: 8
  },
  itemIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  itemTextContainer: { flex: 1 },
  itemLabel: { color: "#fff", fontSize: 15, fontWeight: "500" },
  itemSubLabel: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  arrowContainer: { marginLeft: 10 },
  logoutItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 15,
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderRadius: 16,
    marginBottom: 20
  },
  logoutLabel: { color: "#fca5a5", fontSize: 15, fontWeight: "bold" },
  footer: { alignItems: "center", paddingVertical: 30 },
  versionText: { color: "rgba(255,255,255,0.2)", fontSize: 11 },
});

