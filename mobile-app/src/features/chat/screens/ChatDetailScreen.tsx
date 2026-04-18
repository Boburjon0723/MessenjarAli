import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Send, ArrowLeft, MoreVertical, Paperclip, Smile } from "lucide-react-native";
import { Message } from "../types";
import { DEFAULT_PLATFORM_BACKGROUND } from "../../../lib/constants";
import { getMessagesRequest, markChatReadRequest, sendMessageRequest } from "../service";
import { useAuthStore } from "../../auth/store";

const { width } = Dimensions.get("window");

type Props = {
  route: { params?: { chatId?: string; name?: string } };
  navigation: { goBack: () => void };
};

export function ChatDetailScreen({ route, navigation }: Props) {
  const chatId = route.params?.chatId ? String(route.params.chatId) : "";
  const title = route.params?.name ? String(route.params.name) : "Chat";
  const currentUserId = useAuthStore((s) => s.user?.id != null ? String(s.user.id) : "");

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const loadMessages = useCallback(async () => {
    if (!chatId) {
      setLoading(false);
      setError("Chat tanlanmagan");
      return;
    }
    setError(null);
    try {
      const list = await getMessagesRequest(chatId);
      setMessages(list);
      try {
        await markChatReadRequest(chatId);
      } catch {
        /* o'qilgan deb belgilash ixtiyoriy */
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuklashda xatolik");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadMessages();
    }, [loadMessages])
  );

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  const sendMessage = async () => {
    const t = inputText.trim();
    if (!t || !chatId || sending) return;

    setSending(true);
    setError(null);
    try {
      const saved = await sendMessageRequest(chatId, t);
      setInputText("");
      setMessages((prev) => {
        const next = [...prev];
        const idx = next.findIndex((m) => m.id === saved.id);
        if (idx >= 0) {
          next[idx] = saved;
          return next;
        }
        return [...next, saved];
      });
      scrollToEnd();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yuborilmadi");
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = currentUserId !== "" && item.senderId === currentUserId;
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  if (!chatId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerName}>Xato</Text>
        </View>
        <Text style={styles.centerHint}>Chat ID yo‘q</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground source={{ uri: DEFAULT_PLATFORM_BACKGROUND }} style={styles.backgroundImage}>
        <View style={styles.overlay} />

        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.headerStatus}>online</Text>
          </View>
          <Pressable style={styles.iconButton}>
            <MoreVertical color="#fff" size={20} />
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          {loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.hint}>Xabarlar yuklanmoqda...</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToEnd}
              onLayout={scrollToEnd}
              ListEmptyComponent={
                <Text style={styles.emptyList}>Hozircha xabar yo‘q — birinchi bo‘lib yozing</Text>
              }
            />
          )}

          <View style={styles.inputArea}>
            <View style={styles.inputContainer}>
              <Pressable style={styles.inputIcon}>
                <Smile color="rgba(255,255,255,0.4)" size={22} />
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="Xabar yozing..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={inputText}
                onChangeText={setInputText}
                multiline
                editable={!sending}
              />
              <Pressable style={styles.inputIcon}>
                <Paperclip color="rgba(255,255,255,0.4)" size={20} />
              </Pressable>
            </View>
            <Pressable
              style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled]}
              onPress={() => void sendMessage()}
              disabled={!inputText.trim() || sending}
            >
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={20} />}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  flex1: { flex: 1 },
  backgroundImage: {
    flex: 1,
    width: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 16,
    paddingBottom: 15,
    backgroundColor: "rgba(15, 23, 42, 0.88)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 15,
    minWidth: 0,
    maxWidth: width - 120,
  },
  headerName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  headerStatus: {
    color: "#10b981",
    fontSize: 11,
    marginTop: 2,
  },
  iconButton: {
    padding: 5,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(127, 29, 29, 0.45)",
  },
  errorText: {
    color: "#fecaca",
    fontSize: 13,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    color: "rgba(255,255,255,0.45)",
    marginTop: 12,
    fontSize: 14,
  },
  centerHint: {
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 24,
  },
  listContent: {
    padding: 15,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyList: {
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginTop: 32,
    fontSize: 14,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    width: "100%",
  },
  myMessageRow: {
    justifyContent: "flex-end",
  },
  otherMessageRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    paddingBottom: Platform.OS === "ios" ? 28 : 15,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 25,
    paddingHorizontal: 12,
    minHeight: 44,
    maxHeight: 100,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  inputIcon: {
    padding: 5,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(59, 130, 246, 0.35)",
  },
});

