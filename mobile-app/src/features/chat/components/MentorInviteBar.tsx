import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from "react-native";
import { Users } from "lucide-react-native";
import { useAuthStore } from "../../auth/store";
import {
  getExpertGroupsRequest,
  getMentorInviteEligibilityRequest,
  sendMentorGroupInviteInPrivateChat,
} from "../service";

type Props = {
  chatId: string;
  expertName: string;
};

/** Web `MentorGroupInviteBar` — ekspert shaxsiy chatida guruhga taklif */
export function MentorInviteBar({ chatId, expertName }: Props) {
  const user = useAuthStore((s) => s.user) as { id?: string } | null;
  const expertId = user?.id ? String(user.id) : "";
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [show, setShow] = useState(true);
  const [reinvite, setReinvite] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!chatId || !expertId) return;
    try {
      const [g, elig] = await Promise.all([
        getExpertGroupsRequest(expertId),
        getMentorInviteEligibilityRequest(chatId),
      ]);
      setGroups(g);
      if (g.length && !selectedId) setSelectedId(g[0].id);
      setShow(elig.showInviteBar);
      setReinvite(!!elig.canReinviteViaListing);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [chatId, expertId, selectedId]);

  useEffect(() => {
    void refresh();
  }, [chatId, expertId]);

  if (loading || !show || groups.length === 0) return null;

  const send = async () => {
    if (!selectedId) return;
    setSending(true);
    setStatus(null);
    try {
      await sendMentorGroupInviteInPrivateChat({
        chatId,
        groupId: selectedId,
        expertName,
      });
      setStatus("Taklif yuborildi");
      void refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Xato");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Users color="#8774e1" size={16} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {groups.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => setSelectedId(g.id)}
            style={[styles.chip, selectedId === g.id && styles.chipActive]}
          >
            <Text style={styles.chipText} numberOfLines={1}>
              {g.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable
        style={[styles.btn, sending && { opacity: 0.6 }]}
        onPress={() => void send()}
        disabled={sending}
      >
        {sending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.btnText}>{reinvite ? "Qayta" : "Taklif"}</Text>
        )}
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 10,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(135,116,225,0.25)",
    backgroundColor: "rgba(135,116,225,0.1)",
    flexWrap: "wrap",
  },
  chips: { flexGrow: 1, flexShrink: 1, maxHeight: 36 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginRight: 6,
    maxWidth: 140,
  },
  chipActive: {
    backgroundColor: "rgba(135,116,225,0.35)",
    borderWidth: 1,
    borderColor: "rgba(135,116,225,0.5)",
  },
  chipText: { color: "#fff", fontSize: 12 },
  btn: {
    backgroundColor: "#8774e1",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 64,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  status: { width: "100%", color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },
});
