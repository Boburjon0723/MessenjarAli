import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type ChatHeaderMoreMenuProps = {
  visible: boolean;
  onClose: () => void;
  topOffset?: number;
  muted: boolean;
  summarizing: boolean;
  showSendMali?: boolean;
  onSelect: () => void;
  onToggleMute: () => void;
  onSummarize: () => void;
  onShowProfile: () => void;
  onExport: () => void;
  onClearHistory: () => void;
  onDeleteChat: () => void;
  onSendMali?: () => void;
  labels: {
    select: string;
    mute: string;
    unmute: string;
    aiSummary: string;
    summarizing: string;
    showProfile: string;
    exportHistory: string;
    clearHistory: string;
    deleteChat: string;
    sendMali?: string;
  };
};

export function ChatHeaderMoreMenu({
  visible,
  onClose,
  topOffset = 56,
  muted,
  summarizing,
  showSendMali,
  onSelect,
  onToggleMute,
  onSummarize,
  onShowProfile,
  onExport,
  onClearHistory,
  onDeleteChat,
  onSendMali,
  labels,
}: ChatHeaderMoreMenuProps) {
  const run = (fn: () => void) => {
    onClose();
    setTimeout(fn, 50);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.anchor, { top: topOffset }]} pointerEvents="box-none">
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            <MenuItem label={labels.select} onPress={() => run(onSelect)} />
            <MenuItem
              label={muted ? labels.unmute : labels.mute}
              onPress={() => run(onToggleMute)}
            />
            <MenuItem
              label={summarizing ? labels.summarizing : labels.aiSummary}
              onPress={() => run(onSummarize)}
              disabled={summarizing}
            />
            <MenuItem label={labels.showProfile} onPress={() => run(onShowProfile)} />
            {showSendMali && onSendMali ? (
              <MenuItem
                label={labels.sendMali || "MALI yuborish"}
                onPress={() => run(onSendMali)}
              />
            ) : null}
            <MenuItem label={labels.exportHistory} onPress={() => run(onExport)} />
            <MenuItem label={labels.clearHistory} onPress={() => run(onClearHistory)} />
            <MenuItem
              label={labels.deleteChat}
              onPress={() => run(onDeleteChat)}
              destructive
            />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  label,
  onPress,
  destructive,
  disabled,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text style={[styles.itemText, destructive && styles.itemDanger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  anchor: {
    position: "absolute",
    right: 10,
    left: 0,
    alignItems: "flex-end",
  },
  menu: {
    width: 240,
    borderRadius: 14,
    backgroundColor: "#212121",
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  item: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  itemPressed: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  itemText: {
    color: "#fff",
    fontSize: 15,
  },
  itemDanger: {
    color: "#f87171",
  },
});
