import React, { useCallback } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, User, Bell, Lock, Palette, Globe, Shield, Info, LogOut, LifeBuoy } from "lucide-react-native";
import { ChatBackground } from "../../../components/ChatBackground";
import { AvatarImage } from "../../../components/AvatarImage";
import { useAuthStore } from "../../auth/store";
import { fetchProfileRequest } from "../../auth/profileApi";
import { AuthUser } from "../../auth/types";
import { useAuthLocale } from "../../auth/locale";

export function SettingsScreen({ navigation, isTab }: any) {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user) as AuthUser | null;
  const logout = useAuthStore((s) => s.logout);
  const patchUser = useAuthStore((s) => s.patchUser);
  const { t } = useAuthLocale();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        try {
          const p = await fetchProfileRequest();
          if (!cancelled) await patchUser(p);
        } catch {
          /* tarmoq / 401 — joriy user bilan davom etamiz */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [patchUser])
  );

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ChatBackground>
        <View style={[styles.header, !isTab ? { paddingTop: insets.top + 8 } : { paddingTop: 12 }]}>
          {!isTab && (
            <Pressable onPress={() => navigation?.goBack()} style={styles.backButton}>
              <ArrowLeft color="#fff" size={24} />
            </Pressable>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* User Profile Summary */}
          <Pressable style={styles.profileCard} onPress={() => navigation.navigate("Profile")}>
            <View style={styles.avatarBorder}>
              <AvatarImage
                uri={currentUser?.avatar ?? currentUser?.avatar_url}
                name={currentUser?.name || "U"}
                size={70}
              />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{currentUser?.name || 'Foydalanuvchi'}</Text>
              <Text style={styles.userPhone}>{currentUser?.phone || '+998 00 000 00 00'}</Text>
              <Text style={styles.viewProfile}>{t('settingsProfile')}</Text>
            </View>
            <ArrowLeft color="rgba(255,255,255,0.2)" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
          </Pressable>

          {/* Settings Groups */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settingsAccount')}</Text>
            <SettingItem icon={<User color="#3b82f6" size={22}/>} label={t('settingsProfile')} onPress={() => navigation.navigate("Profile")} />
            <SettingItem icon={<Bell color="#10b981" size={22}/>} label={t('settingsNotif')} onPress={() => navigation.navigate("NotificationSettings")} />
            <SettingItem icon={<Lock color="#f59e0b" size={22}/>} label={t('settingsPrivacy')} onPress={() => navigation.navigate("PrivacySettings")} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settingsApp')}</Text>
            <Pressable
              style={styles.item}
              onPress={() => navigation.navigate("ThemeDesign")}
            >
              <View style={styles.itemIconContainer}>
                <Palette color="#8b5cf6" size={22} />
              </View>
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemLabel}>{t('settingsTheme')}</Text>
                <Text style={styles.itemSubLabel}>Fon, xiralik, oboylar</Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.2)" }}>{">"}</Text>
            </Pressable>
            <SettingItem 
              icon={<Globe color="#0ea5e9" size={22}/>} 
              label={t('settingsLang')} 
              subLabel={t('settingsLang')} 
              onPress={() => navigation.navigate("LanguageSettings")} 
            />
            <SettingItem 
              icon={<Shield color="#ec4899" size={22}/>} 
              label={t('settingsData')} 
              onPress={() => navigation.navigate("DataStorageSettings")} 
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settingsOther')}</Text>
            <SettingItem 
              icon={<LifeBuoy color="#3b82f6" size={22}/>} 
              label="Support (Yordam)" 
              onPress={() => navigation.navigate("Support")} 
            />
            <SettingItem 
              icon={<Info color="#94a3b8" size={22}/>} 
              label={t('settingsAbout')} 
              onPress={() => navigation.navigate("AboutApp")} 
            />
            <Pressable style={styles.logoutItem} onPress={handleLogout}>
               <View style={styles.itemIconContainer}><LogOut color="#fca5a5" size={22}/></View>
               <Text style={styles.logoutLabel}>{t('settingsLogout')}</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
             <Text style={styles.versionText}>ExpertLine Mobile v1.2.0</Text>
          </View>
        </ScrollView>
      </ChatBackground>
    </View>
  );
}

function SettingItem({ icon, label, subLabel, onPress }: any) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: "rgba(255,255,255,0.1)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  content: { flex: 1 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarBorder: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(56, 189, 248, 0.5)",
  },
  profileInfo: { marginLeft: 18, flex: 1 },
  userName: { color: "#fff", fontSize: 22, fontWeight: "800" },
  userPhone: { color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 4, fontWeight: "600" },
  viewProfile: { color: "#38bdf8", fontSize: 11, marginTop: 8, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 },
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

