import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  Wallet,
  HelpCircle,
  Users,
  Megaphone,
  Contact,
  Settings,
  Moon,
  Briefcase,
  LineChart,
  Bookmark,
  ClipboardList,
} from "lucide-react-native";
import { AvatarImage } from "../../../components/AvatarImage";
import { useAuthStore } from "../../auth/store";
import { useAuthLocale } from "../../auth/locale";

export type MessagesMenuDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenWallet: () => void;
  onOpenExperts: () => void;
  onOpenJobs: () => void;
  onOpenFinance: () => void;
  onOpenSavedMessages: () => void;
  onSupport: () => void;
  onCreateGroup: () => void;
  onCreateChannel: () => void;
  onOpenContacts: () => void;
  onOpenSettings: () => void;
};

const ICON = 22;
const iconColor = "#aaaaaa";

export function MessagesMenuDrawer({
  visible,
  onClose,
  onOpenProfile,
  onOpenWallet,
  onOpenExperts,
  onOpenJobs,
  onOpenFinance,
  onOpenSavedMessages,
  onSupport,
  onCreateGroup,
  onCreateChannel,
  onOpenContacts,
  onOpenSettings,
}: MessagesMenuDrawerProps) {
  const insets = useSafeAreaInsets();
  const { t } = useAuthLocale();
  const user = useAuthStore((s) => s.user) as {
    name?: string;
    username?: string;
    avatar?: string | null;
    avatar_url?: string | null;
    is_expert?: boolean;
  } | null;

  const displayName = user?.name || "User";
  const username = user?.username ? `@${user.username}` : "";
  const avatar = user?.avatar || user?.avatar_url || null;

  const item = (
    icon: React.ReactNode,
    label: string,
    onPress: () => void,
    opts?: { accent?: boolean }
  ) => (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => {
        onClose();
        // slight delay so drawer closes before navigate
        setTimeout(onPress, 40);
      }}
    >
      {icon}
      <Text style={[styles.itemText, opts?.accent && { color: "#8774e1" }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.drawer, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.drawerHeader}>
            <Text style={styles.brand}>ExpertLine</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
              <X color="#aaaaaa" size={22} />
            </Pressable>
          </View>

          <Pressable style={styles.profileRow} onPress={() => { onClose(); setTimeout(onOpenProfile, 40); }}>
            <AvatarImage uri={avatar} name={displayName} size={64} />
            <View style={styles.profileText}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              {username ? (
                <Text style={styles.profileUser} numberOfLines={1}>
                  {username}
                </Text>
              ) : null}
            </View>
          </Pressable>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {item(<Wallet color={iconColor} size={ICON} />, t("tabWallet"), onOpenWallet)}
            {item(<Briefcase color={iconColor} size={ICON} />, t("tabServices"), onOpenExperts)}
            {item(<ClipboardList color={iconColor} size={ICON} />, t("menuJobs"), onOpenJobs)}
            {item(<LineChart color={iconColor} size={ICON} />, t("menuFinance"), onOpenFinance)}
            {item(
              <Bookmark color={iconColor} size={ICON} fill={iconColor} />,
              t("savedMessages"),
              onOpenSavedMessages
            )}
            {item(<HelpCircle color={iconColor} size={ICON} />, t("supportHelp"), onSupport)}

            <View style={styles.divider} />

            {item(<Users color={iconColor} size={ICON} />, t("menuNewGroup"), onCreateGroup)}
            {item(<Megaphone color={iconColor} size={ICON} />, t("menuNewChannel"), onCreateChannel)}
            {item(<Contact color={iconColor} size={ICON} />, t("tabContacts"), onOpenContacts)}
            {item(<Settings color={iconColor} size={ICON} />, t("settingsTitle"), onOpenSettings)}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.version}>v 1.2.0</Text>
            <Moon color="#aaaaaa" size={16} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    width: 300,
    maxWidth: "86%",
    height: "100%",
    backgroundColor: "#212121",
    zIndex: 2,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  brand: { color: "#fff", fontSize: 20, fontWeight: "500" },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  profileText: { flex: 1, minWidth: 0 },
  profileName: { color: "#fff", fontSize: 16, fontWeight: "500" },
  profileUser: { color: "#aaaaaa", fontSize: 14, marginTop: 2 },
  scroll: { flex: 1, paddingVertical: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemPressed: { backgroundColor: "rgba(255,255,255,0.06)" },
  itemText: { color: "#fff", fontSize: 16 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: 8,
    marginHorizontal: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  version: { color: "#aaaaaa", fontSize: 13 },
});

export default MessagesMenuDrawer;
