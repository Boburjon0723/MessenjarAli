import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  X,
  MessageCircle,
  Phone,
  Link2,
  Mic,
  Users,
  Pencil,
  Trash2,
  ShieldAlert,
  Bell,
  BellOff,
  UserPlus,
  LogOut,
  Search,
  Copy,
  Check,
  Camera,
  ChevronLeft,
  ExternalLink,
} from "lucide-react-native";
import { ChatBackground } from "../../../components/ChatBackground";
import { AvatarImage } from "../../../components/AvatarImage";
import { useChatStore } from "../../../store/chatStore";
import {
  ChatDetailsParticipant,
  ChatDetailsResponse,
  ChatSharedItem,
  ChatSharedKind,
  ContactRow,
  addContactRequest,
  blockUserRequest,
  buildGroupInviteLink,
  createOrOpenPrivateChat,
  deleteChatRequest,
  deleteContactRequest,
  getChatDetailsRequest,
  getChatSharedRequest,
  getChatStatsRequest,
  getContactsRequest,
  getFullUrl,
  getUserByIdRequest,
  leaveGroupRequest,
  normalizeUserId,
  sendGroupJoinInviteRequest,
  unblockUserRequest,
  updateChatPrefsRequest,
  updateContactRequest,
  updateGroupChatRequest,
  uploadChatFileRequest,
} from "../service";
import { useAuthStore } from "../../auth/store";

type Props = {
  route: {
    params?: {
      chatId?: string;
      name?: string;
      avatarUrl?: string | null;
    };
  };
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: object) => void;
    popToTop?: () => void;
  };
};

type MediaTab = "photos" | "videos" | "files" | "links" | "voice";
type PrivateSharedView = "main" | "links" | "voice" | "groups";

function extractFirstUrl(text: string): string | null {
  const m = String(text || "").match(/https?:\/\/[^\s<>"']+/i);
  return m ? m[0] : null;
}

function formatShortTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPeerInfoScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const chatId = route.params?.chatId ? String(route.params.chatId) : "";
  const fallbackName = route.params?.name ? String(route.params.name) : "";
  const fallbackAvatar = route.params?.avatarUrl ? String(route.params.avatarUrl) : "";

  const selfId = useAuthStore((s) => {
    const u = s.user as { id?: string; _id?: string } | null | undefined;
    return normalizeUserId(u?.id ?? u?._id);
  });
  const isExpert = !!useAuthStore.getState().user?.is_expert;
  const expertName = useAuthStore.getState().user?.name || "Ustoz";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ChatDetailsResponse | null>(null);
  const [muted, setMuted] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [mediaTab, setMediaTab] = useState<MediaTab>("photos");
  const [mediaItems, setMediaItems] = useState<ChatSharedItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [inviteModal, setInviteModal] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [memberMenu, setMemberMenu] = useState<ChatDetailsParticipant | null>(null);

  // Private peer
  const [stats, setStats] = useState({ linksCount: 0, voiceCount: 0, commonGroupsCount: 0 });
  const [isBlocked, setIsBlocked] = useState(false);
  const [peerInContacts, setPeerInContacts] = useState(false);
  const [sharedView, setSharedView] = useState<PrivateSharedView>("main");
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedItems, setSharedItems] = useState<ChatSharedItem[]>([]);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", surname: "" });

  const load = useCallback(async () => {
    if (!chatId) {
      setLoading(false);
      setError("Chat topilmadi");
      return;
    }
    setError(null);
    try {
      const d = await getChatDetailsRequest(chatId);
      setDetails(d);
      setNameDraft(d?.name || fallbackName || "");
      const fromList = useChatStore.getState().chats.find((c) => String(c.id) === String(chatId));
      if (fromList?.muted != null) setMuted(!!fromList.muted);

      const chatType = String(d?.type ?? "private").toLowerCase();
      const group = chatType === "group" || chatType === "channel";
      if (!group) {
        const parts = d?.participants ?? [];
        const other =
          parts.find((p) => normalizeUserId(p.id) !== selfId) ?? parts[0] ?? null;
        const peerId = other?.id ? String(other.id) : "";
        if (peerId) {
          const [user, contactList, chatStats] = await Promise.all([
            getUserByIdRequest(peerId),
            getContactsRequest(),
            getChatStatsRequest(chatId),
          ]);
          if (user) {
            setIsBlocked(!!user.blockedByMe);
            setEditForm({
              name: user.name || other?.name || "",
              surname: user.surname || other?.surname || "",
            });
          }
          setPeerInContacts(contactList.some((c) => normalizeUserId(c.id) === normalizeUserId(peerId)));
          setStats(chatStats);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }, [chatId, fallbackName, selfId]);

  useEffect(() => {
    void load();
  }, [load]);

  const participants = details?.participants ?? [];
  const chatType = String(details?.type ?? "private").toLowerCase();
  const isChannel = chatType === "channel";
  const isGroup = chatType === "group" || isChannel;
  const isCreator =
    !!details?.creator_id && normalizeUserId(details.creator_id) === selfId;
  const canSendPaidInvite = isGroup && isCreator && isExpert && !isChannel;
  const roomKindLabel = isChannel ? "Kanal" : "Guruh";
  const membersLabel = isChannel ? "obunachi" : "a'zo";
  const aboutTitle = isChannel ? "Kanal haqida" : "Guruh haqida";
  const leaveLabel = isChannel ? "Kanalni tark etish" : "Guruhdan chiqish";
  const deleteLabel = isChannel ? "Kanalni o'chirish" : "Guruhni o'chirish";

  const peer: ChatDetailsParticipant | null = (() => {
    if (!participants.length || isGroup) return null;
    const other = participants.find((p) => normalizeUserId(p.id) !== selfId);
    return other ?? participants[0];
  })();

  const displayName = (() => {
    if (isGroup) return details?.name || fallbackName || roomKindLabel;
    if (peer) {
      const n = `${peer.name ?? ""} ${peer.surname ?? ""}`.trim();
      return n || fallbackName || "Foydalanuvchi";
    }
    return fallbackName || "Chat";
  })();

  const avatarRawForImage = isGroup
    ? details?.avatar_url ?? null
    : peer?.avatar ?? (fallbackAvatar ? fallbackAvatar : null);

  const phone = !isGroup && peer?.phone ? String(peer.phone) : null;
  const inviteLink = chatId ? buildGroupInviteLink(chatId) : "";

  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return participants;
    return participants.filter((m) =>
      `${m.name || ""} ${m.surname || ""}`.toLowerCase().includes(q)
    );
  }, [participants, memberSearch]);

  const loadMediaTab = useCallback(
    async (kind: ChatSharedKind) => {
      if (!chatId) return;
      setMediaLoading(true);
      try {
        const items = await getChatSharedRequest(chatId, kind);
        setMediaItems(items);
      } catch {
        setMediaItems([]);
      } finally {
        setMediaLoading(false);
      }
    },
    [chatId]
  );

  useEffect(() => {
    if (!isGroup || !chatId || loading) return;
    void loadMediaTab(mediaTab);
  }, [isGroup, chatId, mediaTab, loading, loadMediaTab]);

  const loadPrivateShared = useCallback(
    async (kind: "links" | "voice" | "groups") => {
      if (!chatId) return;
      setSharedLoading(true);
      try {
        const items = await getChatSharedRequest(chatId, kind);
        setSharedItems(items);
      } catch {
        setSharedItems([]);
      } finally {
        setSharedLoading(false);
      }
    },
    [chatId]
  );

  const openPrivateShared = (kind: "links" | "voice" | "groups") => {
    setSharedView(kind);
    void loadPrivateShared(kind);
  };

  const glassBtn = (icon: React.ReactNode, label: string, onPress: () => void) => (
    <Pressable style={styles.quickBtn} onPress={onPress}>
      {icon}
      <Text style={styles.quickBtnText}>{label}</Text>
    </Pressable>
  );

  const goMessagesRoot = () => {
    if (typeof navigation.popToTop === "function") {
      navigation.popToTop();
    } else {
      navigation.navigate("Messages");
    }
  };

  const saveGroupName = async () => {
    const name = nameDraft.trim();
    if (!chatId || !name || name === (details?.name || "")) {
      setEditingName(false);
      return;
    }
    try {
      await updateGroupChatRequest(chatId, { name });
      setDetails((prev) => (prev ? { ...prev, name } : prev));
      setEditingName(false);
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Nom yangilanmadi");
    }
  };

  const changeGroupAvatar = async () => {
    if (!isCreator || !chatId) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Ruxsat", "Galereyaga ruxsat kerak");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    setUploadingAvatar(true);
    try {
      const url = await uploadChatFileRequest(
        asset.uri,
        asset.fileName || "avatar.jpg",
        asset.mimeType || "image/jpeg"
      );
      await updateGroupChatRequest(chatId, { avatar_url: url });
      setDetails((prev) => (prev ? { ...prev, avatar_url: url } : prev));
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Rasm yuklanmadi");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const toggleMute = async () => {
    if (!chatId) return;
    try {
      const next = await updateChatPrefsRequest(chatId, { muted: !muted });
      setMuted(next.muted);
      useChatStore.getState().updateChatLocally(chatId, { muted: next.muted });
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Sozlama saqlanmadi");
    }
  };

  const copyInvite = async () => {
    try {
      await Clipboard.setStringAsync(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      Alert.alert("Havola", inviteLink);
    }
  };

  const leaveGroup = () => {
    Alert.alert(leaveLabel, `${roomKindLabel}dan chiqasizmi?`, [
      { text: "Bekor", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActionBusy(true);
            try {
              await leaveGroupRequest(chatId);
              goMessagesRoot();
            } catch (e) {
              Alert.alert("Xatolik", e instanceof Error ? e.message : "Xato");
            } finally {
              setActionBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const deleteGroup = () => {
    Alert.alert(deleteLabel, `${roomKindLabel} butunlay o'chiriladi. Davom etasizmi?`, [
      { text: "Bekor", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActionBusy(true);
            try {
              await deleteChatRequest(chatId);
              goMessagesRoot();
            } catch (e) {
              Alert.alert("Xatolik", e instanceof Error ? e.message : "Xato");
            } finally {
              setActionBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const openInviteModal = async () => {
    setInviteModal(true);
    setContactsLoading(true);
    try {
      const list = await getContactsRequest();
      const inGroup = new Set(participants.map((p) => normalizeUserId(p.id)));
      setContacts(list.filter((c) => !inGroup.has(normalizeUserId(c.id))));
    } finally {
      setContactsLoading(false);
    }
  };

  const sendInviteToUser = async (userId: string, label: string) => {
    setInviteBusyId(userId);
    try {
      await sendGroupJoinInviteRequest({
        groupId: chatId,
        studentUserId: userId,
        expertName,
      });
      setInviteModal(false);
      setMemberMenu(null);
      Alert.alert("Yuborildi", `Obuna taklifi ${label} shaxsiy chatiga yuborildi.`);
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Taklif yuborilmadi");
    } finally {
      setInviteBusyId(null);
    }
  };

  const openMemberChat = async (member: ChatDetailsParticipant) => {
    setMemberMenu(null);
    if (normalizeUserId(member.id) === selfId) return;
    try {
      const opened = await createOrOpenPrivateChat(String(member.id));
      navigation.navigate("ChatDetail", {
        chatId: opened.chatId,
        name: opened.name,
        avatarUrl: opened.avatarUrl,
      });
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Chat ochilmadi");
    }
  };

  const handleBlockToggle = () => {
    if (!peer?.id) return;
    const nextBlocked = !isBlocked;
    Alert.alert(
      nextBlocked ? "Bloklash" : "Blokdan chiqarish",
      nextBlocked
        ? "Bu foydalanuvchini bloklaysizmi?"
        : "Blokdan chiqarasizmi?",
      [
        { text: "Bekor", style: "cancel" },
        {
          text: nextBlocked ? "Bloklash" : "Chiqarish",
          style: nextBlocked ? "destructive" : "default",
          onPress: () => {
            void (async () => {
              setActionBusy(true);
              try {
                if (nextBlocked) await blockUserRequest(String(peer.id));
                else await unblockUserRequest(String(peer.id));
                setIsBlocked(nextBlocked);
              } catch (e) {
                Alert.alert("Xatolik", e instanceof Error ? e.message : "Xato");
              } finally {
                setActionBusy(false);
              }
            })();
          },
        },
      ]
    );
  };

  const handleAddContact = () => {
    if (!peer?.id) return;
    void (async () => {
      setActionBusy(true);
      try {
        await addContactRequest(
          String(peer.id),
          peer.name || displayName,
          peer.surname || ""
        );
        setPeerInContacts(true);
        Alert.alert("OK", "Kontakt qo'shildi");
      } catch (e) {
        Alert.alert("Xatolik", e instanceof Error ? e.message : "Qo'shilmadi");
      } finally {
        setActionBusy(false);
      }
    })();
  };

  const handleDeleteContact = () => {
    if (!peer?.id) return;
    Alert.alert("Kontaktni o'chirish", "Kontakt o'chiriladi (chat qoladi).", [
      { text: "Bekor", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setActionBusy(true);
            try {
              await deleteContactRequest(String(peer.id));
              setPeerInContacts(false);
              setIsEditingContact(false);
            } catch (e) {
              Alert.alert("Xatolik", e instanceof Error ? e.message : "Xato");
            } finally {
              setActionBusy(false);
            }
          })();
        },
      },
    ]);
  };

  const handleSaveContactEdit = async () => {
    if (!peer?.id) return;
    setActionBusy(true);
    try {
      await updateContactRequest({
        contactUserId: String(peer.id),
        name: editForm.name.trim(),
        surname: editForm.surname.trim(),
      });
      setIsEditingContact(false);
      Alert.alert("OK", "Saqlandi");
    } catch (e) {
      Alert.alert("Xatolik", e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setActionBusy(false);
    }
  };

  const renderMediaList = (
    items: ChatSharedItem[],
    kind: ChatSharedKind | PrivateSharedView,
    loadingFlag: boolean
  ) => {
    if (loadingFlag) {
      return (
        <View style={styles.mediaCenter}>
          <ActivityIndicator color="#8774e1" />
        </View>
      );
    }
    if (items.length === 0) {
      return <Text style={styles.emptyMedia}>Hozircha kontent yo'q</Text>;
    }

    if (kind === "photos" || kind === "videos") {
      return (
        <View style={styles.mediaGrid}>
          {items.map((item) => {
            const uri = getFullUrl(item.url || item.content || "") || null;
            return (
              <Pressable
                key={item.id}
                style={styles.mediaThumb}
                onPress={() => {
                  if (uri) void Linking.openURL(uri);
                }}
              >
                {uri && kind === "photos" ? (
                  <Image source={{ uri }} style={styles.mediaThumbImg} />
                ) : (
                  <View style={styles.mediaThumbFallback}>
                    <Text style={styles.mediaThumbLabel} numberOfLines={2}>
                      {kind === "videos" ? "Video" : item.content || "Media"}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      );
    }

    return items.map((item) => {
      if (kind === "groups") {
        return (
          <Pressable
            key={item.id}
            style={styles.sharedRow}
            onPress={() =>
              navigation.navigate("ChatDetail", {
                chatId: item.id,
                name: item.name || "Guruh",
                avatarUrl: item.avatar,
              })
            }
          >
            <AvatarImage uri={item.avatar || null} name={item.name || "G"} size={40} />
            <Text style={styles.sharedTitle} numberOfLines={1}>
              {item.name || "Guruh"}
            </Text>
          </Pressable>
        );
      }

      const url =
        kind === "links"
          ? extractFirstUrl(item.content || "") || item.url || null
          : item.url || null;

      return (
        <Pressable
          key={item.id}
          style={styles.sharedRow}
          onPress={() => {
            if (url) void Linking.openURL(url);
          }}
        >
          {kind === "links" ? (
            <Link2 color="#8774e1" size={20} />
          ) : kind === "voice" ? (
            <Mic color="#8774e1" size={20} />
          ) : (
            <Link2 color="#8774e1" size={20} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.sharedTitle} numberOfLines={1}>
              {kind === "voice"
                ? "Ovozli xabar"
                : kind === "files"
                  ? item.content || url || "Fayl"
                  : url || item.content || "Havola"}
            </Text>
            {item.created_at ? (
              <Text style={styles.sharedSub}>{formatShortTime(item.created_at)}</Text>
            ) : null}
          </View>
          {url ? <ExternalLink color="rgba(255,255,255,0.4)" size={16} /> : null}
        </Pressable>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ChatBackground>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.topTitle}>{isGroup ? aboutTitle : "Profil"}</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={12}>
              <X color="#fff" size={26} />
            </Pressable>
          </View>
          <View style={styles.center}>
            <ActivityIndicator color="#38bdf8" size="large" />
          </View>
        </ChatBackground>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.root}>
        <ChatBackground>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={12}>
              <X color="#fff" size={26} />
            </Pressable>
          </View>
          <View style={styles.center}>
            <Text style={styles.err}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => void load()}>
              <Text style={styles.retryText}>Qayta urinish</Text>
            </Pressable>
          </View>
        </ChatBackground>
      </View>
    );
  }

  /* ——— GROUP (web GroupInfoPanel) ——— */
  if (isGroup) {
    const mediaTabs: { key: MediaTab; label: string }[] = [
      { key: "photos", label: "Rasmlar" },
      { key: "videos", label: "Videolar" },
      { key: "files", label: "Fayllar" },
      { key: "links", label: "Havolalar" },
      { key: "voice", label: "Ovozli" },
    ];

    return (
      <View style={styles.root}>
        <ChatBackground>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.topTitle}>{aboutTitle}</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={12}>
              <X color="#fff" size={26} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Pressable
                onPress={() => (isCreator ? void changeGroupAvatar() : undefined)}
                style={styles.avatarRing}
                disabled={!isCreator || uploadingAvatar}
              >
                <AvatarImage uri={avatarRawForImage} name={displayName} size={112} />
                {isCreator ? (
                  <View style={styles.camBadge}>
                    {uploadingAvatar ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Camera color="#fff" size={16} />
                    )}
                  </View>
                ) : null}
              </Pressable>

              {isCreator && editingName ? (
                <TextInput
                  style={styles.nameInput}
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  onBlur={() => void saveGroupName()}
                  onSubmitEditing={() => void saveGroupName()}
                  autoFocus
                  placeholderTextColor="rgba(255,255,255,0.4)"
                />
              ) : (
                <Pressable
                  onPress={() => {
                    if (!isCreator) return;
                    setNameDraft(displayName);
                    setEditingName(true);
                  }}
                >
                  <Text style={styles.name}>{displayName}</Text>
                </Pressable>
              )}
              <Text style={styles.statusMuted}>{participants.length} ta {membersLabel}</Text>
            </View>

            <View style={styles.sectionGap} />

            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Taklif havolasi</Text>
              <Pressable style={styles.listRow} onPress={() => void copyInvite()}>
                <Link2 color="#8774e1" size={20} />
                <Text style={[styles.listText, { color: "#8774e1" }]} numberOfLines={1}>
                  {inviteLink}
                </Text>
                {copiedLink ? (
                  <Check color="#4ade80" size={18} />
                ) : (
                  <Copy color="rgba(255,255,255,0.45)" size={18} />
                )}
              </Pressable>
            </View>

            <View style={styles.sectionGap} />

            <View style={styles.card}>
              <Pressable style={styles.actionRow} onPress={() => void toggleMute()}>
                {muted ? (
                  <Bell color="rgba(255,255,255,0.7)" size={20} />
                ) : (
                  <BellOff color="rgba(255,255,255,0.7)" size={20} />
                )}
                <Text style={styles.actionLabel}>
                  {muted ? "Ovozni yoqish" : "Bildirishnomani o'chirish"}
                </Text>
              </Pressable>

              {canSendPaidInvite ? (
                <>
                  <View style={styles.sep} />
                  <Pressable style={styles.actionRow} onPress={() => void openInviteModal()}>
                    <UserPlus color="#8774e1" size={20} />
                    <Text style={[styles.actionLabel, { color: "#8774e1" }]}>
                      Guruhga taklif
                    </Text>
                  </Pressable>
                </>
              ) : null}

              <View style={styles.sep} />
              <Pressable style={styles.actionRow} disabled={actionBusy} onPress={leaveGroup}>
                <LogOut color="#e53935" size={20} />
                <Text style={[styles.actionLabel, { color: "#e53935" }]}>{leaveLabel}</Text>
              </Pressable>

              {isCreator ? (
                <>
                  <View style={styles.sep} />
                  <Pressable style={styles.actionRow} disabled={actionBusy} onPress={deleteGroup}>
                    <Trash2 color="#e53935" size={20} />
                    <Text style={[styles.actionLabel, { color: "#e53935" }]}>
                      {deleteLabel}
                    </Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <View style={styles.sectionGap} />

            <View style={styles.card}>
              <View style={styles.membersHeader}>
                <Text style={styles.sectionLabel}>{participants.length} ta {membersLabel}</Text>
                <Pressable
                  onPress={() => setShowMemberSearch((v) => !v)}
                  hitSlop={10}
                  style={{ padding: 4 }}
                >
                  <Search color="rgba(255,255,255,0.5)" size={18} />
                </Pressable>
              </View>
              {showMemberSearch ? (
                <TextInput
                  style={styles.searchInput}
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Qidirish..."
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
              ) : null}

              {filteredMembers.map((member) => {
                const name =
                  `${member.name ?? ""} ${member.surname ?? ""}`.trim() || "User";
                const isCreatorMember =
                  details?.creator_id != null &&
                  normalizeUserId(member.id) === normalizeUserId(details.creator_id);
                const isMe = normalizeUserId(member.id) === selfId;
                return (
                  <Pressable
                    key={String(member.id)}
                    style={styles.memberRow}
                    onPress={() => setMemberMenu(member)}
                    onLongPress={() => setMemberMenu(member)}
                  >
                    <AvatarImage uri={member.avatar || null} name={name} size={48} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {name}
                        {isMe ? " (Siz)" : ""}
                      </Text>
                      <Text
                        style={[styles.memberSub, isCreatorMember && { color: "#8774e1" }]}
                      >
                        {isCreatorMember ? "Yaratuvchi" : "a'zo"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {filteredMembers.length === 0 ? (
                <Text style={styles.emptyMembers}>
                  {memberSearch ? "Topilmadi" : "A'zolar yo'q"}
                </Text>
              ) : null}
            </View>

            <View style={styles.sectionGap} />

            <View style={styles.card}>
              <View style={styles.mediaTabs}>
                {mediaTabs.map((tab) => (
                  <Pressable
                    key={tab.key}
                    style={styles.mediaTab}
                    onPress={() => setMediaTab(tab.key)}
                  >
                    <Text
                      style={[
                        styles.mediaTabText,
                        mediaTab === tab.key && styles.mediaTabTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {mediaTab === tab.key ? <View style={styles.mediaTabUnderline} /> : null}
                  </Pressable>
                ))}
              </View>
              {renderMediaList(mediaItems, mediaTab, mediaLoading)}
            </View>
          </ScrollView>

          <Modal
            visible={inviteModal}
            transparent
            animationType="slide"
            onRequestClose={() => setInviteModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 12 }]}>
                <Text style={styles.modalTitle}>Guruhga taklif</Text>
                <Text style={styles.modalHint}>
                  Taklif kontaktning shaxsiy chatiga yuboriladi
                </Text>
                {contactsLoading ? (
                  <ActivityIndicator color="#8774e1" style={{ marginVertical: 24 }} />
                ) : (
                  <FlatList
                    data={contacts}
                    keyExtractor={(c) => c.id}
                    style={{ maxHeight: 360 }}
                    ListEmptyComponent={
                      <Text style={styles.emptyMembers}>Mavjud kontakt yo'q</Text>
                    }
                    renderItem={({ item: c }) => (
                      <Pressable
                        style={styles.memberRow}
                        disabled={!!inviteBusyId}
                        onPress={() => void sendInviteToUser(c.id, c.name)}
                      >
                        <AvatarImage uri={c.avatar || null} name={c.name} size={44} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>{c.name}</Text>
                          {c.phone ? <Text style={styles.memberSub}>{c.phone}</Text> : null}
                        </View>
                        {inviteBusyId === c.id ? (
                          <ActivityIndicator color="#8774e1" />
                        ) : (
                          <UserPlus color="#8774e1" size={20} />
                        )}
                      </Pressable>
                    )}
                  />
                )}
                <Pressable style={styles.modalCancel} onPress={() => setInviteModal(false)}>
                  <Text style={styles.modalCancelText}>Bekor qilish</Text>
                </Pressable>
              </View>
            </View>
          </Modal>

          <Modal
            visible={!!memberMenu}
            transparent
            animationType="fade"
            onRequestClose={() => setMemberMenu(null)}
          >
            <Pressable style={styles.modalOverlay} onPress={() => setMemberMenu(null)}>
              <View style={[styles.memberMenuSheet, { paddingBottom: insets.bottom + 8 }]}>
                <Text style={styles.modalTitle}>
                  {memberMenu
                    ? `${memberMenu.name ?? ""} ${memberMenu.surname ?? ""}`.trim() || "A'zo"
                    : ""}
                </Text>
                {memberMenu && normalizeUserId(memberMenu.id) !== selfId ? (
                  <>
                    <Pressable
                      style={styles.actionRow}
                      onPress={() => void openMemberChat(memberMenu)}
                    >
                      <MessageCircle color="#fff" size={20} />
                      <Text style={styles.actionLabel}>Shaxsiy chat</Text>
                    </Pressable>
                    {canSendPaidInvite ? (
                      <Pressable
                        style={styles.actionRow}
                        onPress={() => {
                          const m = memberMenu;
                          const label =
                            `${m.name ?? ""} ${m.surname ?? ""}`.trim() || "Talaba";
                          void sendInviteToUser(String(m.id), label);
                        }}
                      >
                        <UserPlus color="#8774e1" size={20} />
                        <Text style={[styles.actionLabel, { color: "#8774e1" }]}>
                          Obuna taklifi yuborish
                        </Text>
                      </Pressable>
                    ) : null}
                    {/* Phase 3.4/3.5: backendda creator uchun removeParticipant HTTP yo‘q
                        (faqat leave self: POST /api/chats/:id/leave). Kick API qo‘shilganda shu yerga. */}
                  </>
                ) : (
                  <Text style={styles.memberSub}>Bu sizning profilingiz</Text>
                )}
                <Pressable style={styles.modalCancel} onPress={() => setMemberMenu(null)}>
                  <Text style={styles.modalCancelText}>Yopish</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </ChatBackground>
      </View>
    );
  }

  /* ——— PRIVATE shared sub-views ——— */
  if (sharedView !== "main") {
    const title =
      sharedView === "links"
        ? "Havolalar"
        : sharedView === "voice"
          ? "Ovozli xabarlar"
          : "Umumiy guruhlar";
    return (
      <View style={styles.root}>
        <ChatBackground>
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => setSharedView("main")}
              style={styles.closeBtn}
              hitSlop={12}
            >
              <ChevronLeft color="#fff" size={26} />
            </Pressable>
            <Text style={[styles.topTitle, { flex: 1 }]}>{title}</Text>
            <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={12}>
              <X color="#fff" size={26} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>{renderMediaList(sharedItems, sharedView, sharedLoading)}</View>
          </ScrollView>
        </ChatBackground>
      </View>
    );
  }

  /* ——— PRIVATE peer ——— */
  const handle = (() => {
    if (phone) return `@${phone.replace(/\D/g, "").slice(-4)}`;
    if (peer?.id) return `@user_${String(peer.id).slice(0, 8)}`;
    return "@user";
  })();

  const statusLine =
    peer?.specialization || peer?.profession || "Oxirgi faollik: yaqinda";

  return (
    <View style={styles.root}>
      <ChatBackground>
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={12}>
            <X color="#fff" size={26} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.avatarRing}>
              <AvatarImage uri={avatarRawForImage} name={displayName} size={112} />
            </View>
            {isEditingContact ? (
              <View style={styles.editBox}>
                <TextInput
                  style={styles.editInput}
                  value={editForm.name}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, name: v }))}
                  placeholder="Ism"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
                <TextInput
                  style={styles.editInput}
                  value={editForm.surname}
                  onChangeText={(v) => setEditForm((f) => ({ ...f, surname: v }))}
                  placeholder="Familiya"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />
                <View style={styles.editActions}>
                  <Pressable onPress={() => setIsEditingContact(false)}>
                    <Text style={styles.editCancel}>Bekor</Text>
                  </Pressable>
                  <Pressable onPress={() => void handleSaveContactEdit()} disabled={actionBusy}>
                    <Text style={styles.editSave}>Saqlash</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.handle}>{handle}</Text>
              </>
            )}
            <Text style={styles.status}>{statusLine}</Text>
          </View>

          <View style={styles.quickRow}>
            {glassBtn(<MessageCircle color="#fff" size={22} />, "Suhbat", () =>
              navigation.goBack()
            )}
            {glassBtn(<Phone color="#fff" size={22} />, "Qo‘ng‘iroq", () => {
              navigation.navigate("ChatDetail", {
                chatId,
                name: displayName,
                avatarUrl: avatarRawForImage,
                startCall: "audio",
              });
            })}
            {glassBtn(
              muted ? <Bell color="#fff" size={22} /> : <BellOff color="#fff" size={22} />,
              muted ? "Ovoz" : "Mute",
              () => void toggleMute()
            )}
          </View>

          {!peerInContacts ? (
            <View style={[styles.card, { marginTop: 14 }]}>
              <Pressable
                style={styles.actionRow}
                disabled={actionBusy}
                onPress={handleAddContact}
              >
                <UserPlus color="#8774e1" size={20} />
                <Text style={[styles.actionLabel, { color: "#8774e1" }]}>
                  Kontaktga qo‘shish
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.card}>
            {phone ? (
              <View style={styles.row}>
                <Text style={styles.rowMain}>{phone}</Text>
                <Text style={styles.rowSub}>Telefon raqami</Text>
              </View>
            ) : (
              <View style={styles.row}>
                <Text style={styles.rowMuted}>Telefon API orqali yo‘q</Text>
                <Text style={styles.rowSub}>Telefon raqami</Text>
              </View>
            )}

            {(peer?.specialization || peer?.profession) && (
              <>
                <View style={styles.sep} />
                <View style={styles.row}>
                  <Text style={styles.rowMain}>{peer.specialization || peer.profession}</Text>
                  <Text style={styles.rowSub}>Mutaxassisligi</Text>
                </View>
              </>
            )}

            <View style={styles.sep} />
            <Pressable style={styles.listRow} onPress={() => openPrivateShared("links")}>
              <Link2 color="rgba(255,255,255,0.85)" size={20} />
              <Text style={styles.listText}>Umumiy havolalar</Text>
              <Text style={styles.listMeta}>{stats.linksCount}</Text>
            </Pressable>
            <Pressable style={styles.listRow} onPress={() => openPrivateShared("voice")}>
              <Mic color="rgba(255,255,255,0.85)" size={20} />
              <Text style={styles.listText}>Ovozli xabarlar</Text>
              <Text style={styles.listMeta}>{stats.voiceCount}</Text>
            </Pressable>
            <Pressable style={styles.listRow} onPress={() => openPrivateShared("groups")}>
              <Users color="rgba(255,255,255,0.85)" size={20} />
              <Text style={styles.listText}>Umumiy guruhlar</Text>
              <Text style={styles.listMeta}>{stats.commonGroupsCount}</Text>
            </Pressable>
          </View>

          <View style={[styles.card, { marginTop: 14 }]}>
            {peerInContacts ? (
              <>
                <Pressable
                  style={styles.actionRow}
                  onPress={() => {
                    setEditForm({
                      name: peer?.name || "",
                      surname: peer?.surname || "",
                    });
                    setIsEditingContact(true);
                  }}
                >
                  <Pencil color="rgba(255,255,255,0.9)" size={20} />
                  <Text style={styles.actionLabel}>Kontaktni tahrirlash</Text>
                </Pressable>
                <View style={styles.sep} />
                <Pressable
                  style={styles.actionRow}
                  disabled={actionBusy}
                  onPress={handleDeleteContact}
                >
                  <Trash2 color="rgba(248,113,113,0.95)" size={20} />
                  <Text style={[styles.actionLabel, { color: "#fca5a5" }]}>
                    Kontaktni o‘chirish
                  </Text>
                </Pressable>
                <View style={styles.sep} />
              </>
            ) : null}
            <Pressable
              style={styles.actionRow}
              disabled={actionBusy}
              onPress={handleBlockToggle}
            >
              <ShieldAlert color="rgba(248,113,113,0.95)" size={20} />
              <Text style={[styles.actionLabel, { color: "#fca5a5" }]}>
                {isBlocked ? "Blokdan chiqarish" : "Bloklash"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </ChatBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  topTitle: { color: "#fff", fontSize: 16, fontWeight: "600", marginLeft: 8 },
  closeBtn: { padding: 8 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  err: { color: "#fca5a5", textAlign: "center", marginBottom: 12 },
  retry: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  retryText: { color: "#fff", fontWeight: "600" },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  hero: { alignItems: "center", paddingHorizontal: 20, paddingTop: 16 },
  avatarRing: {
    padding: 3,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: "rgba(135, 116, 225, 0.85)",
    marginBottom: 16,
    position: "relative",
  },
  camBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  nameInput: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#8774e1",
    minWidth: 180,
    paddingVertical: 6,
  },
  handle: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 15,
    marginTop: 6,
  },
  status: {
    color: "#38bdf8",
    fontSize: 14,
    marginTop: 10,
  },
  statusMuted: {
    color: "#aaaaaa",
    fontSize: 14,
    marginTop: 6,
  },
  editBox: { width: "80%", gap: 8, marginTop: 4 },
  editInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 15,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  editCancel: { color: "rgba(255,255,255,0.45)", fontSize: 14 },
  editSave: { color: "#8774e1", fontSize: 14, fontWeight: "600" },
  sectionGap: { height: 10, backgroundColor: "transparent" },
  sectionLabel: {
    color: "#aaaaaa",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 22,
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    gap: 8,
  },
  quickBtnText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  row: { padding: 16 },
  rowMain: { color: "#fff", fontSize: 17, fontWeight: "600" },
  rowSub: { color: "#38bdf8", fontSize: 12, marginTop: 6, fontWeight: "500" },
  rowMuted: { color: "rgba(255,255,255,0.45)", fontSize: 15 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.1)" },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  listText: { flex: 1, color: "rgba(255,255,255,0.92)", fontSize: 15 },
  listMeta: { color: "rgba(255,255,255,0.35)", fontSize: 14 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  actionLabel: { color: "rgba(255,255,255,0.92)", fontSize: 15 },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 12,
  },
  searchInput: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  memberName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  memberSub: { color: "#aaaaaa", fontSize: 13, marginTop: 2 },
  emptyMembers: {
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    paddingVertical: 20,
    fontSize: 14,
  },
  mediaTabs: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  mediaTab: { flex: 1, alignItems: "center", paddingVertical: 12, position: "relative" },
  mediaTabText: { color: "#aaaaaa", fontSize: 12 },
  mediaTabTextActive: { color: "#8774e1", fontWeight: "600" },
  mediaTabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: "#8774e1",
    borderRadius: 1,
  },
  emptyMedia: {
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    paddingVertical: 36,
    fontSize: 14,
  },
  mediaCenter: { paddingVertical: 36, alignItems: "center" },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
  },
  mediaThumb: {
    width: "33.33%",
    aspectRatio: 1,
    padding: 2,
  },
  mediaThumbImg: { width: "100%", height: "100%", borderRadius: 4 },
  mediaThumbFallback: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  mediaThumbLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center" },
  sharedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  sharedTitle: { color: "rgba(255,255,255,0.9)", fontSize: 14 },
  sharedSub: { color: "#aaaaaa", fontSize: 12, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#212121",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  memberMenuSheet: {
    backgroundColor: "#212121",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  modalHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  modalCancel: {
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: { color: "#8774e1", fontSize: 16, fontWeight: "600" },
});
