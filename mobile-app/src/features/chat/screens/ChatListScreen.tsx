import React, { useCallback, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  ActionSheetIOS,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { User, Wallet, Briefcase, MessageSquare, Search, Users } from "lucide-react-native";
import { Chat } from "../types";
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthStore } from "../../auth/store";
import { WalletView, ServicesView, ContactsView } from "./DashboardViews";
import {
  CHAT_CATEGORY_ITEMS,
  HEADER_RIGHT_ACTIONS,
  getMenuIcon,
  getVisibleComposeMenuItems,
  type ComposeActionId,
} from "../chat-shell-menu";
import { AvatarImage } from "../../../components/AvatarImage";
import { getSocket, chatMetadataMap } from "../../../lib/socket";
import { E2E_PLACEHOLDER, isE2eEnvelope } from "../../../lib/e2e-envelope";
import { decryptListPreview } from "../../../lib/e2e-chat";
import PagerView from "react-native-pager-view";
import { useChatStore } from "../../../store/chatStore";
import { useAuthLocale } from "../../auth/locale";

const ICON_MD = 24;

function categoryMatchesChat(categoryId: string, chat: Chat): boolean {
  if (categoryId === "all") return true;
  const t = (chat.type || "").toLowerCase();
  switch (categoryId) {
    case "user":
      return !t || t === "private" || t === "user" || t === "direct";
    case "wallet":
      return t === "wallet";
    case "group":
      return t === "group";
    case "channel":
      return t === "channel";
    case "services":
      return t === "services";
    case "finance":
      return t === "finance";
    default:
      return true;
  }
}

const BOTTOM_TABS: {
  id: "chats" | "contacts" | "wallet" | "services" | "profile";
  label: string;
  icon: (active: boolean) => React.ReactNode;
}[] = [
  {
    id: "chats",
    label: "CHATLAR",
    icon: (active) => <MessageSquare color={active ? "#fff" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
  {
    id: "contacts",
    label: "KONTAKTLAR",
    icon: (active) => <Users color={active ? "#fff" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
  {
    id: "wallet",
    label: "HAMYON",
    icon: (active) => <Wallet color={active ? "#fff" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
  {
    id: "services",
    label: "XIZMATLAR",
    icon: (active) => <Briefcase color={active ? "#fff" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
  {
    id: "profile",
    label: "PROFIL",
    icon: (active) => <User color={active ? "#fff" : "rgba(255,255,255,0.4)"} size={ICON_MD} />,
  },
];

export function ChatListScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((s) => s.user);
  const [bottomTab, setBottomTab] = useState<"chats" | "contacts" | "wallet" | "services">("chats");
  
  // Use global store
  const { chats, loadChats, isLoadingChats, updateChatLocally } = useChatStore();
  const { t } = useAuthLocale();
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Gorizontal surish rejimi: qidiruv bo‘sh bo‘lganda kategoriya sahifalari */
  const useCategoryPager = searchQuery.trim().length === 0;
  const [pageIndex, setPageIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const categoryNavScrollRef = useRef<ScrollView>(null);
  const chipLayoutsRef = useRef<Array<{ x: number; width: number }>>([]);
  const [categoryStripWidth, setCategoryStripWidth] = useState(0);
  const [categoryContentWidth, setCategoryContentWidth] = useState(0);

  const isExpert =
    (currentUser as { isExpert?: boolean; role?: string } | null)?.isExpert === true ||
    (currentUser as { role?: string } | null)?.role === "expert";

  const chatsForCategory = useCallback((catId: string) => {
    if (catId === "all") return chats;
    return chats.filter((c) => categoryMatchesChat(catId, c));
  }, [chats]);

  const searchFilteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.lastMessage || "").toLowerCase().includes(q)
    );
  }, [chats, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadChats().then(() => {
          // Barcha chatlar xonalarga kirish (join)
          const socket = getSocket();
          if (socket) {
            chats.forEach((c) => {
              socket.emit("join_room", c.id);
              chatMetadataMap.set(String(c.id), { name: c.name, type: c.type || 'private' });
            });
          }
      });
    }, [loadChats, chats.length])
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceive = (data: any) => {
      const msg = data.message || data;
      const chatId = msg.chatId || msg.chat_id;
      if (!chatId) return;

      const chat = chats.find(c => String(c.id) === String(chatId));
      if (chat) {
          let text = msg.text || msg.content || "📎 Rasm/Fayl";
          if (isE2eEnvelope(msg.metadata)) {
            text = E2E_PLACEHOLDER;
            void decryptListPreview(String(msg.content || ""), msg.metadata, E2E_PLACEHOLDER).then((plain) => {
              updateChatLocally(chatId, { lastMessage: plain });
            });
          } else if (text === "📎 Fayl" || text === "📎 Rasm/Fayl") text = t('msgFile');
          else if (text === "📷 Rasm") text = t('msgPhoto');
          else if (text === "🎤 Ovozli xabar") text = t('msgVoice');

          updateChatLocally(chatId, {
              lastMessage: text,
              unreadCount: (chat.unreadCount || 0) + 1
          });
      } else {
          loadChats();
      }
    };

    socket.on("receive_message", handleReceive);
    return () => {
      socket.off("receive_message", handleReceive);
    };
  }, [loadChats]);

  const goToCategoryPage = useCallback((index: number) => {
    const safe = Math.max(0, Math.min(CHAT_CATEGORY_ITEMS.length - 1, index));
    setPageIndex(safe);
    pagerRef.current?.setPage(safe);
  }, []);

  const scrollCategoryNavToIndex = useCallback(
    (index: number) => {
      const scroll = categoryNavScrollRef.current;
      const chip = chipLayoutsRef.current[index];
      const vw = categoryStripWidth;
      if (!scroll || !chip || vw <= 0) return;
      const center = chip.x + chip.width / 2;
      let targetX = center - vw / 2;
      const maxX = Math.max(0, categoryContentWidth - vw);
      targetX = Math.max(0, Math.min(maxX, targetX));
      scroll.scrollTo({ x: targetX, animated: true });
    },
    [categoryStripWidth, categoryContentWidth]
  );

  useLayoutEffect(() => {
    if (!useCategoryPager) return;
    let inner: number | undefined;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => scrollCategoryNavToIndex(pageIndex));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner !== undefined) cancelAnimationFrame(inner);
    };
  }, [pageIndex, useCategoryPager, scrollCategoryNavToIndex, categoryStripWidth, categoryContentWidth]);

  const onComposeAction = useCallback(
    (actionId: ComposeActionId) => {
      switch (actionId) {
        case "new_contact":
          setBottomTab("contacts");
          return;
        case "new_group":
        case "new_channel":
        case "bulk_select":
          Alert.alert(t("composeChatTitle"), t("composeChatDesc"));
          return;
        default:
          return;
      }
    },
    [t]
  );

  const onHeaderAction = useCallback(
    (id: string) => {
      if (id === "compose") {
        const items = getVisibleComposeMenuItems({ isExpert });
        if (items.length === 0) return;

        const cancelLabel = t("msgCancel");

        if (Platform.OS === "ios") {
          const options = [...items.map((item) => t(item.titleKey)), cancelLabel];
          const cancelButtonIndex = options.length - 1;
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options,
              cancelButtonIndex,
              title: t("composeChatTitle"),
            },
            (buttonIndex) => {
              if (buttonIndex === cancelButtonIndex || buttonIndex < 0) return;
              const chosen = items[buttonIndex];
              if (chosen) onComposeAction(chosen.id);
            }
          );
          return;
        }

        Alert.alert(
          t("composeChatTitle"),
          t("composeChatDesc"),
          [
            ...items.map((item) => ({
              text: t(item.titleKey),
              onPress: () => onComposeAction(item.id),
            })),
            { text: cancelLabel, style: "cancel" as const },
          ]
        );
        return;
      }
      if (id === "expert_tools") {
        Alert.alert(t("expertPanelTitle"), t("expertPanelDesc"));
      }
    },
    [isExpert, onComposeAction, t]
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />
      <ChatBackground>
        <View
          style={[styles.mainContent, bottomTab !== "chats" && { paddingTop: insets.top + 8 }]}
        >
          {bottomTab === "chats" ? (
            <View style={styles.chatsTab}>
              <View style={[styles.chatsTop, { paddingTop: insets.top + 10 }]}>
                <View style={styles.searchRow}>
                  <View style={styles.searchBox}>
                    <Search color="rgba(255,255,255,0.45)" size={18} />
                    <TextInput
                      placeholder={t('searchPlaceholder')}
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      style={styles.searchInput}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      returnKeyType="search"
                    />
                  </View>
                  {HEADER_RIGHT_ACTIONS.filter((a) => a.visible({ isExpert })).map((action) => {
                    const Icon = getMenuIcon(action.icon);
                    return (
                      <Pressable
                        key={action.id}
                        onPress={() => onHeaderAction(action.id)}
                        style={styles.headerIconBtn}
                        accessibilityLabel={action.accessibilityLabel}
                      >
                        <Icon color="#fff" size={22} />
                      </Pressable>
                    );
                  })}
                </View>
                {useCategoryPager ? (
                  <ScrollView
                    ref={categoryNavScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    bounces={Platform.OS === "ios"}
                    directionalLockEnabled
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.categoryScroll}
                    style={styles.categoryStrip}
                    onLayout={(e) => setCategoryStripWidth(e.nativeEvent.layout.width)}
                    onContentSizeChange={(w) => setCategoryContentWidth(w)}
                  >
                    {CHAT_CATEGORY_ITEMS.map((cat, idx) => {
                      const active = pageIndex === idx;
                      const CatIcon = getMenuIcon(cat.icon);
                      return (
                        <Pressable
                          key={cat.id}
                          onLayout={(e) => {
                            const { x, width } = e.nativeEvent.layout;
                            chipLayoutsRef.current[idx] = { x, width };
                          }}
                          onPress={() => goToCategoryPage(idx)}
                          style={[styles.categoryChip, active && styles.categoryChipActive]}
                        >
                          <CatIcon color={active ? "#0f172a" : "rgba(255,255,255,0.85)"} size={14} />
                          <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>
                            {t(`cat${cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}` as any)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </View>

              {isLoadingChats && chats.length === 0 ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator color="#fff" size="large" />
                </View>
              ) : useCategoryPager ? (
                <PagerView
                  ref={pagerRef}
                  style={styles.pager}
                  initialPage={0}
                  onPageSelected={(e) => setPageIndex(e.nativeEvent.position)}
                >
                  {CHAT_CATEGORY_ITEMS.map((cat) => (
                    <View key={cat.id} style={styles.pagerPage} collapsable={false}>
                      <FlatList
                        style={styles.chatList}
                        nestedScrollEnabled
                        data={chatsForCategory(cat.id)}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                          <Pressable
                            style={styles.chatItem}
                            onPress={() =>
                              navigation.navigate("ChatDetail", {
                                chatId: item.id,
                                name: item.name,
                                avatarUrl: item.avatarUrl ?? null,
                              })
                            }
                          >
                            <AvatarImage uri={item.avatarUrl} name={item.name} size={50} />
                            <View style={styles.chatInfo}>
                              <View style={styles.chatInfoHeader}>
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                  <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                                  {item.type === 'group' && <Text style={styles.chatTypeLabel}>{t('chatGroupLabel')}</Text>}
                                  {item.type === 'channel' && <Text style={styles.chatTypeLabel}>{t('chatChannelLabel')}</Text>}
                                </View>
                                {item.unreadCount > 0 && (
                                  <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.chatMsg} numberOfLines={1}>
                                {item.lastMessage === "Xabarlar yo'q" ? t('msgNoMessages') : 
                                 item.lastMessage === "📷 Rasm" ? t('msgPhoto') :
                                 item.lastMessage === "🎤 Ovozli xabar" ? t('msgVoice') :
                                 (item.lastMessage === "📎 Fayl" || item.lastMessage === "📎 Rasm/Fayl") ? t('msgFile') :
                                 item.lastMessage}
                              </Text>
                            </View>
                          </Pressable>
                        )}
                        contentContainerStyle={styles.listPadding}
                        refreshControl={
                          <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => {
                              setRefreshing(true);
                              loadChats();
                            }}
                          />
                        }
                        ListEmptyComponent={
                          <Text style={styles.emptyList}>{t('searchNoResult')}</Text>
                        }
                      />
                    </View>
                  ))}
                </PagerView>
              ) : (
                <FlatList
                  style={styles.chatList}
                  nestedScrollEnabled
                  data={searchFilteredChats}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.chatItem}
                      onPress={() =>
                        navigation.navigate("ChatDetail", {
                          chatId: item.id,
                          name: item.name,
                          avatarUrl: item.avatarUrl ?? null,
                        })
                      }
                    >
                      <AvatarImage uri={item.avatarUrl} name={item.name} size={50} />
                      <View style={styles.chatInfo}>
                        <View style={styles.chatInfoHeader}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                            {item.type === 'group' && <Text style={styles.chatTypeLabel}>{t('chatGroupLabel')}</Text>}
                            {item.type === 'channel' && <Text style={styles.chatTypeLabel}>{t('chatChannelLabel')}</Text>}
                          </View>
                          {item.unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.chatMsg} numberOfLines={1}>
                          {item.lastMessage === "Xabarlar yo'q" ? t('msgNoMessages') : 
                           item.lastMessage === "📷 Rasm" ? t('msgPhoto') :
                           item.lastMessage === "🎤 Ovozli xabar" ? t('msgVoice') :
                           (item.lastMessage === "📎 Fayl" || item.lastMessage === "📎 Rasm/Fayl") ? t('msgFile') :
                           item.lastMessage}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  contentContainerStyle={styles.listPadding}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => {
                        setRefreshing(true);
                        loadChats();
                      }}
                    />
                  }
                  ListEmptyComponent={
                    <Text style={styles.emptyList}>{t('searchNoResult')}</Text>
                  }
                />
              )}
            </View>
          ) : bottomTab === "contacts" ? (
            <ContactsView navigation={navigation} />
          ) : bottomTab === "wallet" ? (
            <WalletView />
          ) : (
            <ServicesView navigation={navigation} />
          )}
        </View>

        {/* Floating Glass Bottom Tab */}
        <View style={styles.tabWrapper}>
          <View style={styles.glassTab}>
            {BOTTOM_TABS.map((tab) => {
              const active = tab.id !== "profile" && bottomTab === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  style={styles.tabItem}
                  onPress={() => {
                    if (tab.id === "profile") {
                      navigation.navigate("Settings");
                      return;
                    }
                    setBottomTab(tab.id);
                  }}
                >
                  {tab.icon(active)}
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {t(`tab${tab.id.charAt(0).toUpperCase() + tab.id.slice(1)}` as any)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ChatBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  mainContent: { flex: 1 },
  chatsTab: { flex: 1 },
  chatsTop: { paddingHorizontal: 16, paddingBottom: 8 },
  /** Gorizontal kategoriya — faqat shu qator yon suriladi; ro‘yxat bilan aralashmasin */
  categoryStrip: { flexGrow: 0 },
  pager: { flex: 1 },
  pagerPage: { flex: 1 },
  chatList: { flex: 1 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 0,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryScroll: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.95)",
  },
  categoryChipText: { color: "rgba(255,255,255,0.9)", fontSize: 12, fontWeight: "600" },
  categoryChipTextActive: { color: "#0f172a" },
  loadingBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyList: { textAlign: "center", color: "rgba(255,255,255,0.45)", marginTop: 24, fontSize: 15 },
  listPadding: { paddingHorizontal: 12, paddingBottom: 120 },
  chatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 0,
    marginBottom: 0,
    borderWidth: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  chatInfo: { marginLeft: 15, flex: 1 },
  chatInfoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  chatName: { color: "#fff", fontSize: 16, fontWeight: "bold", maxWidth: "80%" },
  chatTypeLabel: { color: "#38bdf8", fontSize: 10, marginLeft: 6, fontWeight: "bold", backgroundColor: "rgba(56, 189, 248, 0.15)", paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 },
  unreadBadge: { backgroundColor: "#5288c1", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: "center" },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  chatMsg: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 },

  tabWrapper: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    height: 80,
    zIndex: 1000
  },
  glassTab: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderRadius: 30, // 4 tomonlama 25% (visual)
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.15)", // Oqish shaffof
  },
  tabItem: { alignItems: "center", justifyContent: "center" },
  tabText: { color: "rgba(255,255,255,0.4)", fontSize: 8, fontWeight: "bold", marginTop: 4 },
  tabTextActive: { color: "#fff" },
});
