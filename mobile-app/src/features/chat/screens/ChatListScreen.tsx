import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  Dimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  Globe,
  User,
  Wallet,
  Users,
  Radio,
  Briefcase,
  LineChart,
  Menu,
  PenSquare,
  Search,
  X,
  MessageSquare,
  Layout,
  Settings,
  HelpCircle,
  Megaphone,
  Contact,
  LogOut,
  Moon,
} from "lucide-react-native";
import { Chat } from "../types";
import { getChatsRequest } from "../service";
import { DEFAULT_PLATFORM_BACKGROUND } from "../../../lib/constants";
import { useAuthStore } from "../../auth/store";

const { width, height } = Dimensions.get("window");

const ICON_SM = 20;
const ICON_MD = 24;

const CAT_INACTIVE = "rgba(255,255,255,0.4)";
const CAT_ACTIVE = "#ffffff";

const CATEGORY_ICONS: {
  id: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { id: "all", Icon: Globe },
  { id: "user", Icon: User },
  { id: "wallet", Icon: Wallet },
  { id: "group", Icon: Users },
  { id: "channel", Icon: Radio },
  { id: "services", Icon: Briefcase },
  { id: "finance", Icon: LineChart },
];

const BOTTOM_TABS: {
  id: "chats" | "wallet" | "services" | "profile";
  label: string;
  icon: (active: boolean) => React.ReactNode;
}[] = [
  {
    id: "chats",
    label: "CHATLAR",
    icon: (active) => <MessageSquare color={active ? "#3b82f6" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
  {
    id: "wallet",
    label: "HAMYON",
    icon: (active) => <Wallet color={active ? "#3b82f6" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
  {
    id: "services",
    label: "XIZMATLAR",
    icon: (active) => <Briefcase color={active ? "#3b82f6" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
  {
    id: "profile",
    label: "PROFIL",
    icon: (active) => <User color={active ? "#3b82f6" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
];

export function ChatListScreen({ navigation }: any) {
  const currentUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isExpert = Boolean((currentUser as { is_expert?: boolean })?.is_expert);

  const [showMenu, setShowMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [bottomTab, setBottomTab] = useState<"chats" | "wallet" | "services" | "profile">("chats");
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    setError(null);
    try {
      const list = await getChatsRequest();
      setChats(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chatlarni yuklab bo'lmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadChats();
    }, [loadChats])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadChats();
  }, [loadChats]);

  const displayedChats = useMemo(() => {
    if (bottomTab !== "chats") return [];
    let list = chats;
    if (activeCategory === "user") list = list.filter((c) => c.type === "private" || !c.type);
    else if (activeCategory === "group") list = list.filter((c) => c.type === "group");
    else if (activeCategory === "channel") list = list.filter((c) => c.type === "channel");

    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(c => c.name.toLowerCase().includes(q));
    return list;
  }, [chats, activeCategory, searchQuery, bottomTab]);

  const handleLogout = async () => {
    await logout();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={{ uri: DEFAULT_PLATFORM_BACKGROUND }} style={styles.backgroundImage}>
        <View style={styles.overlay} />

        {/* Dynamic Drawer Menu */}
        {showMenu && (
          <View style={styles.drawerOverlay}>
            <Pressable style={styles.drawerBackdrop} onPress={() => setShowMenu(false)} />
            <View style={styles.drawerContent}>
              <View style={styles.drawerHeader}>
                <View style={styles.drawerBranding}>
                  <Text style={styles.drawerBrandTitle}>ExpertLine</Text>
                  <Text style={styles.drawerBrandTag}>MUTAXASSISLARNI TOPING</Text>
                </View>
                <Pressable onPress={() => setShowMenu(false)} style={styles.drawerClose}>
                  <X color="#fff" size={20} />
                </Pressable>
              </View>

              <View style={styles.drawerUserInfo}>
                <View style={styles.drawerAvatar}>
                  <Text style={styles.drawerAvatarText}>{currentUser?.name?.[0] || 'U'}</Text>
                </View>
                <View style={styles.drawerUserText}>
                  <Text style={styles.drawerUserName}>{currentUser?.name || 'Foydalanuvchi'}</Text>
                  <Text style={styles.drawerUserHandle}>@{currentUser?.phone?.slice(-4) || 'user'}</Text>
                </View>
              </View>

              <ScrollView style={styles.drawerNav}>
                <DrawerItem icon={<User color="rgba(255,255,255,0.5)" size={22}/>} label="Profil" onPress={() => {setShowMenu(false); setBottomTab("profile");}} />
                <DrawerItem icon={<Wallet color="rgba(255,255,255,0.5)" size={22}/>} label="Hamyon" onPress={() => {setShowMenu(false); setBottomTab("wallet");}} />
                <DrawerItem icon={<HelpCircle color="rgba(255,255,255,0.5)" size={22}/>} label="Yordam" onPress={() => {}} />
                <View style={styles.drawerSeparator} />
                <DrawerItem icon={<Users color="rgba(255,255,255,0.5)" size={22}/>} label="Guruh yaratish" onPress={() => {}} />
                <DrawerItem icon={<Megaphone color="rgba(255,255,255,0.5)" size={22}/>} label="Kanal yaratish" onPress={() => {}} />
                <DrawerItem icon={<Contact color="rgba(255,255,255,0.5)" size={22}/>} label="Kontaktlar" onPress={() => {}} />
                <DrawerItem icon={<Settings color="rgba(255,255,255,0.5)" size={22}/>} label="Sozlamalar" onPress={() => {}} />
              </ScrollView>

              <View style={styles.drawerFooter}>
                <Pressable style={styles.logoutBtn} onPress={handleLogout}>
                  <LogOut color="#fca5a5" size={20} />
                  <Text style={styles.logoutText}>Chiqish</Text>
                </Pressable>
                <Moon color="rgba(255,255,255,0.3)" size={20} />
              </View>
            </View>
          </View>
        )}

        {bottomTab === "chats" ? (
          <View style={styles.header}>
            <View style={styles.topBar}>
              <Pressable style={styles.iconButtonRound} onPress={() => setShowMenu(true)}>
                <Menu color="#fff" size={ICON_MD} />
              </Pressable>
              <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>ExpertLine</Text>
                <Text style={styles.headerSubtitle}>Ekspertlar va mijozlar</Text>
              </View>
              <View style={styles.headerRight}>
                {isExpert && <Pressable style={styles.iconButtonRoundedRect}><Layout color="#fff" size={ICON_SM} /></Pressable>}
                <Pressable style={styles.iconButtonRoundedRect}><PenSquare color="#fff" size={ICON_SM} /></Pressable>
              </View>
            </View>

            <View style={styles.searchContainer}>
              <Search color="rgba(255,255,255,0.3)" size={ICON_SM} style={styles.searchIcon} />
              <TextInput
                placeholder="Qidiruv..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery("")}><X color="#fff" size={16} /></Pressable>}
            </View>

            <View style={styles.categoryRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORY_ICONS.map(({ id, Icon }) => (
                  <Pressable key={id} onPress={() => setActiveCategory(id)} style={[styles.categoryCircle, activeCategory === id ? styles.categoryCircleActive : styles.categoryCircleIdle]}>
                    <Icon size={ICON_MD} color={activeCategory === id ? CAT_ACTIVE : CAT_INACTIVE} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          <View style={styles.altHeader}>
            <Text style={styles.altHeaderTitle}>{bottomTab.toUpperCase()}</Text>
          </View>
        )}

        <FlatList
          data={displayedChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable style={styles.chatItem} onPress={() => navigation.navigate("ChatDetail", { chatId: item.id, name: item.name })}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}><Text style={styles.initialsText}>{item.name[0]}</Text></View>
                <View style={styles.onlineBadge} />
              </View>
              <View style={styles.chatContent}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatName}>{item.name}</Text>
                  <Text style={styles.chatTime}>{item.timestamp}</Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              {item.unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unreadCount}</Text></View>}
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
        />

        <View style={styles.bottomTab}>
          {BOTTOM_TABS.map((tab) => (
            <Pressable key={tab.id} style={styles.tabItem} onPress={() => setBottomTab(tab.id)}>
              {tab.icon(bottomTab === tab.id)}
              <Text style={[styles.tabText, bottomTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>
      </ImageBackground>
    </View>
  );
}

function DrawerItem({ icon, label, onPress }: any) {
  return (
    <Pressable style={styles.drawerItem} onPress={onPress}>
      <View style={styles.drawerItemIcon}>{icon}</View>
      <Text style={styles.drawerItemLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1117" },
  backgroundImage: { flex: 1, width: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15, 23, 42, 0.55)" },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, flexDirection: "row" },
  drawerBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  drawerContent: {
    width: 300,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
    paddingTop: 50,
  },
  drawerHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 30 },
  drawerBranding: { flex: 1 },
  drawerBrandTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  drawerBrandTag: { color: "rgba(255,255,255,0.4)", fontSize: 8, fontWeight: "bold", letterSpacing: 1 },
  drawerClose: { padding: 5 },
  drawerUserInfo: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 30 },
  drawerAvatar: { width: 55, height: 55, borderRadius: 27, backgroundColor: "#3b82f6", justifyContent: "center", alignItems: "center" },
  drawerAvatarText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  drawerUserText: { marginLeft: 15 },
  drawerUserName: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  drawerUserHandle: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  drawerNav: { flex: 1 },
  drawerItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14 },
  drawerItemIcon: { marginRight: 20 },
  drawerItemLabel: { color: "#fff", fontSize: 15, fontWeight: "500" },
  drawerSeparator: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginVertical: 10, marginHorizontal: 20 },
  drawerFooter: { padding: 20, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoutBtn: { flexDirection: "row", alignItems: "center" },
  logoutText: { color: "#fca5a5", marginLeft: 10, fontWeight: "bold" },
  header: { paddingTop: 40, paddingHorizontal: 16, backgroundColor: "rgba(15, 17, 23, 0.8)" },
  altHeader: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 15, backgroundColor: "#0f1117" },
  altHeaderTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  titleContainer: { alignItems: "center" },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { color: "rgba(255,255,255,0.4)", fontSize: 8, letterSpacing: 1 },
  headerRight: { flexDirection: "row", gap: 10 },
  iconButtonRound: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  iconButtonRoundedRect: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 20, paddingHorizontal: 15, height: 44, marginBottom: 15 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: "#fff" },
  categoryRow: { marginBottom: 5 },
  categoryScroll: { paddingBottom: 10 },
  categoryCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 15 },
  categoryCircleActive: { backgroundColor: "#3b82f6" },
  categoryCircleIdle: { backgroundColor: "rgba(255,255,255,0.05)" },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  chatItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(255,255,255,0.05)" },
  avatarContainer: { position: "relative" },
  avatar: { width: 55, height: 55, borderRadius: 27, backgroundColor: "#1e293b", justifyContent: "center", alignItems: "center" },
  initialsText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  onlineBadge: { position: "absolute", bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: "#10b981", borderWidth: 2, borderColor: "#0f172a" },
  chatContent: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  chatName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  chatTime: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  lastMessage: { color: "rgba(255,255,255,0.5)", fontSize: 13 },
  unreadBadge: { backgroundColor: "#3b82f6", borderRadius: 10, minWidth: 20, height: 20, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  bottomTab: { position: "absolute", bottom: 0, width: "100%", height: 80, backgroundColor: "rgba(15, 23, 42, 0.95)", flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingBottom: 15 },
  tabItem: { alignItems: "center" },
  tabText: { color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 4, fontWeight: "bold" },
  tabTextActive: { color: "#3b82f6" },
});

