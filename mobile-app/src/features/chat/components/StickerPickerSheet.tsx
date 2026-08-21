import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import {
  STICKER_CATEGORIES,
  type Sticker,
} from "../../../lib/sticker-packs";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (sticker: Sticker) => void;
};

function thumbUrl(webp: string): string {
  return webp.replace(/\/512\.(?:png|webp)(\?|#|$)/i, "/128.png$1");
}

export function StickerPickerSheet({ visible, onClose, onSelect }: Props) {
  const insets = useSafeAreaInsets();
  const [categoryId, setCategoryId] = useState(STICKER_CATEGORIES[0]?.id || "smileys");
  const [search, setSearch] = useState("");

  const stickers = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return STICKER_CATEGORIES.flatMap((c) => c.stickers).filter(
        (s) => s.emoji.includes(search) || s.code.toLowerCase().includes(q)
      );
    }
    const cat = STICKER_CATEGORIES.find((c) => c.id === categoryId) || STICKER_CATEGORIES[0];
    return cat?.stickers || [];
  }, [categoryId, search]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Stickerlar</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X color="#aaa" size={22} />
          </Pressable>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Qidirish..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
        {!search.trim() ? (
          <View style={styles.cats}>
            {STICKER_CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[styles.catBtn, categoryId === c.id && styles.catBtnActive]}
              >
                <Text style={styles.catIcon}>{c.icon}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <FlatList
          data={stickers}
          keyExtractor={(item) => item.code}
          numColumns={6}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <Pressable
              style={styles.cell}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Image source={{ uri: thumbUrl(item.webp) }} style={styles.thumb} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "#212121",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "52%",
    paddingTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: { color: "#fff", fontSize: 16, fontWeight: "600" },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 14,
  },
  cats: { flexDirection: "row", paddingHorizontal: 8, marginBottom: 6, gap: 4 },
  catBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catBtnActive: { backgroundColor: "rgba(135,116,225,0.25)" },
  catIcon: { fontSize: 18 },
  grid: { paddingHorizontal: 8, paddingBottom: 8 },
  cell: {
    flexGrow: 1,
    flexBasis: "16.66%",
    maxWidth: "16.66%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  thumb: { width: 40, height: 40 },
});
