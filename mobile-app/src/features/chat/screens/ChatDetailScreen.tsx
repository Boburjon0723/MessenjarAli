import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Message } from "../types";

const MOCK_MESSAGES: Message[] = [
  {
    id: "1",
    chatId: "1",
    text: "Salom! Ishlar qalay?",
    senderId: "other",
    timestamp: "10:40",
    status: "read",
  },
  {
    id: "2",
    chatId: "1",
    text: "Yaxshi, rahmat. O'zingda-chi?",
    senderId: "me",
    timestamp: "10:42",
    status: "read",
  },
  {
    id: "3",
    chatId: "1",
    text: "Zo'r! Bugun ko'rishamizmi?",
    senderId: "other",
    timestamp: "10:45",
    status: "read",
  },
];

export function ChatDetailScreen({ route }: any) {
  const { chatId, name } = route.params;
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState("");

  const sendMessage = () => {
    if (inputText.trim() === "") return;

    const newMessage: Message = {
      id: Date.now().toString(),
      chatId,
      text: inputText,
      senderId: "me",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    setMessages([...messages, newMessage]);
    setInputText("");
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === "me";
    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow]}>
        <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
          <Text style={styles.messageText}>{item.text}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Xabar yozing..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  listContent: {
    padding: 15,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 10,
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
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: "#0ea5e9",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 16,
  },
  timestamp: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#0f172a",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    color: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  sendButtonText: {
    color: "#38bdf8",
    fontWeight: "bold",
    fontSize: 16,
  },
});
