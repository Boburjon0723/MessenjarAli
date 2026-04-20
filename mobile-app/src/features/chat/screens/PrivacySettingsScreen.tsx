import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, ScrollView, Switch } from "react-native";
import { ArrowLeft, Lock, Eye, EyeOff, ShieldCheck, Key, Smartphone } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as SecureStore from 'expo-secure-store';
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthLocale } from "../../auth/locale";

export function PrivacySettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { t } = useAuthLocale();
  const [lastSeen, setLastSeen] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState(true);
  const [hasPasscode, setHasPasscode] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      void (async () => {
        const passcode = await SecureStore.getItemAsync('app_passcode_key');
        setHasPasscode(!!passcode);
      })();
    }, [])
  );

  const toggleAppLock = async () => {
    if (hasPasscode) {
       await SecureStore.deleteItemAsync('app_passcode_key');
       setHasPasscode(false);
    } else {
       navigation.navigate("Passcode", { mode: 'set' });
    }
  };

  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('privTitle')}</Text>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privPrivacy')}</Text>
            <PrivacyToggle 
               icon={<Eye color="#8b5cf6" size={20}/>} 
               label={t('privLastSeen')} 
               subLabel={t('privLastSeenSub')}
               value={lastSeen}
               onToggle={setLastSeen}
            />
            <PrivacyToggle 
               icon={<ShieldCheck color="#10b981" size={20}/>} 
               label={t('privReadReceipts')} 
               subLabel={t('privReadReceiptsSub')}
               value={readReceipts}
               onToggle={setReadReceipts}
            />
            <PrivacyToggle 
               icon={<Lock color="#f59e0b" size={20}/>} 
               label={t('privProfilePhoto')} 
               subLabel={t('privProfilePhotoSub')}
               value={profilePhoto}
               onToggle={setProfilePhoto}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('privSecurity')}</Text>
            <Pressable style={styles.actionItem}>
               <View style={styles.actionIcon}><Key color="#3b82f6" size={20}/></View>
               <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>{t('privChangePass')}</Text>
                  <Text style={styles.actionSubLabel}>{t('privChangePassSub')}</Text>
               </View>
               <Text style={{color: 'rgba(255,255,255,0.2)'}}>{">"}</Text>
            </Pressable>
            <PrivacyToggle 
               icon={<Smartphone color="#3b82f6" size={20}/>} 
               label={t('privAppLock')} 
               subLabel={hasPasscode ? t('privPassSet') : t('privPassNotSet')}
               value={hasPasscode}
               onToggle={toggleAppLock}
            />
            <Pressable style={styles.actionItem}>
               <View style={styles.actionIcon}><ShieldCheck color="#10b981" size={20}/></View>
               <View style={styles.actionText}>
                  <Text style={styles.actionLabel}>{t('priv2FA')}</Text>
                  <Text style={styles.actionSubLabel}>{t('priv2FASub')}</Text>
               </View>
               <Text style={{color: 'rgba(255,255,255,0.2)'}}>{">"}</Text>
            </Pressable>
          </View>

          <View style={styles.infoBox}>
             <Text style={styles.infoText}>
                {t('privInfoText')}
             </Text>
          </View>
        </ScrollView>
      </ChatBackground>
    </View>
  );
}

function PrivacyToggle({ icon, label, subLabel, value, onToggle }: any) {
  return (
    <View style={styles.toggleItem}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSubLabel}>{subLabel}</Text>
      </View>
      <Switch 
         value={value} 
         onValueChange={onToggle}
         trackColor={{ false: "#1e293b", true: "#8b5cf6" }}
      />
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
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    marginBottom: 10,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 18,
    marginBottom: 10,
  },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", marginRight: 12 },
  actionText: { flex: 1 },
  actionLabel: { color: "#fff", fontSize: 15, fontWeight: "500" },
  actionSubLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 2 },
  infoBox: {
     padding: 20,
     backgroundColor: "rgba(255,255,255,0.02)",
     borderWidth: 1,
     borderColor: "rgba(255,255,255,0.05)",
     borderRadius: 15,
     marginTop: 10
  },
  infoText: { color: "rgba(255,255,255,0.4)", fontSize: 12, lineHeight: 18, textAlign: "center" }
});
