import React from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View, Image } from "react-native";
import { Chat } from "../types";

const MOCK_CHATS: Chat[] = [
  {
    id: "1",
    name: "Ali Valiyev",
    lastMessage: "Salom, qachon ko'rishamiz?",
    timestamp: "10:45",
    unreadCount: 2,
    avatarUrl: "https://i.pravatar.cc/150?u=1",
  },
  {
    id: "2",
    name: "Dizayn Guruhi",
    lastMessage: "Yangi maket tayyor!",
    timestamp: "Kecha",
    unreadCount: 0,
    avatarUrl: "https://i.pravatar.cc/150?u=2",
  },
  {
    id: "3",
    name: "Jasur",
    lastMessage: "Raxmat!",
    timestamp: "Dushanba",
    unreadCount: 0,
    avatarUrl: "https://i.pravatar.cc/150?u=3",
  },
];

export function ChatListScreen({ navigation }: any) {
  const renderItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => console.log("Chat selected:", item.id)}
    >
      <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      <div style={styles.content}>
        <div style={styles.header}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.time}>{item.timestamp}</Text>
        </div>
        <div style={styles.footer}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </div>
      </div>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  chatItem: {
    flexDirection: "row",
    padding: 15,
    alignItems: "center",
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#1e293b",
  },
  content: {
    flex: 1,
    marginLeft: 15,
  } as any,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  } as any,
  name: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  time: {
    color: "#94a3b8",
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as any,
  lastMessage: {
    color: "#94a3b8",
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  badge: {
    backgroundColor: "#38bdf8",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: "#1e293b",
    marginLeft: 85,
  },
});
