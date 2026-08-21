import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  NativeModules,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Phone, Mic, MicOff, Video as VideoIcon, VideoOff } from "lucide-react-native";
import { useAuthLocale } from "../../auth/locale";
import { useAuthStore } from "../../auth/store";
import { AvatarImage } from "../../../components/AvatarImage";
import { getSocket } from "../../../lib/socket";
import { getLiveKitTokenRequest } from "../service";
import { navigationRef } from "../../../lib/navigationRef";

let LiveKit: any = null;
if (NativeModules.WebRTCModule) {
  try {
    LiveKit = require("@livekit/react-native");
  } catch (e) {
    console.warn("LiveKit could not be loaded in GlobalCallOverlay:", e);
  }
}

type IncomingPayload = {
  from: string;
  name?: string;
  fromName?: string;
  signal?: unknown;
  callType?: string;
  chatId?: string;
  callId?: string;
};

type CallUiStatus = "incoming" | "connected";

function formatCallDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * App-root incoming call UI. ChatDetail keeps outgoing CallModal;
 * incoming_call is handled only here to avoid duplicate handlers.
 */
export function GlobalCallOverlay() {
  const { t } = useAuthLocale();
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<CallUiStatus>("incoming");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [peerName, setPeerName] = useState("");
  const [peerId, setPeerId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkWsUrl, setLkWsUrl] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const activeRef = useRef(false);
  const statusRef = useRef(status);
  const chatIdRef = useRef(chatId);
  const peerIdRef = useRef(peerId);
  statusRef.current = status;
  chatIdRef.current = chatId;
  peerIdRef.current = peerId;

  const reset = useCallback(() => {
    activeRef.current = false;
    setVisible(false);
    setStatus("incoming");
    setPeerId(null);
    setChatId(null);
    setLkToken(null);
    setLkWsUrl(null);
    setIsMicMuted(false);
    setIsCamOff(false);
    setElapsed(0);
  }, []);

  const joinLive = useCallback(
    async (roomId: string | null | undefined) => {
      const sessionId = String(roomId || "").trim();
      if (!sessionId) {
        Alert.alert(t("loginErrorGeneric"), "Sessiya ID topilmadi");
        return;
      }
      setStatus("connected");
      setVisible(true);
      const socket = getSocket();
      if (socket) {
        socket.emit("join_room", sessionId);
        socket.emit("session_join", { sessionId });
      }
      try {
        const username = useAuthStore.getState().user?.name || "User";
        const data = await getLiveKitTokenRequest(sessionId, username);
        if (data?.token) {
          setLkToken(data.token);
          setLkWsUrl(data.wsUrl);
        } else {
          throw new Error("Token yo'q");
        }
      } catch (e) {
        console.error("[GlobalCall] LiveKit join error:", e);
        Alert.alert(t("loginErrorGeneric"), t("callError"));
        reset();
      }
    },
    [reset, t]
  );

  const joinLiveRef = useRef(joinLive);
  const resetRef = useRef(reset);
  joinLiveRef.current = joinLive;
  resetRef.current = reset;

  useEffect(() => {
    if (!user) {
      resetRef.current();
      return;
    }

    let cancelled = false;
    let sock: ReturnType<typeof getSocket> = null;

    const onIncoming = (data: IncomingPayload) => {
      if (activeRef.current) return;
      activeRef.current = true;
      const name = data.fromName || data.name || "User";
      setPeerName(name);
      setPeerId(String(data.from));
      setChatId(data.chatId ? String(data.chatId) : null);
      setCallType(data.callType === "video" ? "video" : "audio");
      setStatus("incoming");
      setLkToken(null);
      setVisible(true);
    };

    const onAccepted = () => {
      if (!activeRef.current || statusRef.current !== "incoming") return;
      void joinLiveRef.current(chatIdRef.current);
    };

    const onRejectedOrEnded = () => {
      if (!activeRef.current) return;
      resetRef.current();
    };

    const attach = () => {
      const socket = getSocket();
      if (!socket || cancelled) return;
      if (sock === socket) return;
      if (sock) {
        sock.off("incoming_call", onIncoming);
        sock.off("call_accepted", onAccepted);
        sock.off("call_rejected", onRejectedOrEnded);
        sock.off("call_ended", onRejectedOrEnded);
      }
      socket.on("incoming_call", onIncoming);
      socket.on("call_accepted", onAccepted);
      socket.on("call_rejected", onRejectedOrEnded);
      socket.on("call_ended", onRejectedOrEnded);
      sock = socket;
    };

    attach();
    const poll = setInterval(attach, 2000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (sock) {
        sock.off("incoming_call", onIncoming);
        sock.off("call_accepted", onAccepted);
        sock.off("call_rejected", onRejectedOrEnded);
        sock.off("call_ended", onRejectedOrEnded);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!visible || status !== "connected") {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [visible, status]);

  const acceptCall = async () => {
    const socket = getSocket();
    const to = peerIdRef.current;
    const room = chatIdRef.current;
    if (socket && to) {
      socket.emit("accept_call", {
        to,
        chatId: room,
        signal: { type: "livekit" },
      });
    }
    if (room && navigationRef.isReady()) {
      try {
        navigationRef.navigate("ChatDetail", {
          chatId: String(room),
          name: peerName || "Chat",
          avatarUrl: null,
        });
      } catch {
        /* optional */
      }
    }
    await joinLive(room);
  };

  const rejectCall = () => {
    const socket = getSocket();
    if (socket && peerIdRef.current) {
      socket.emit("reject_call", { to: peerIdRef.current, chatId: chatIdRef.current });
    }
    reset();
  };

  const endCall = () => {
    const socket = getSocket();
    if (socket && peerIdRef.current) {
      socket.emit("end_call", { to: peerIdRef.current, chatId: chatIdRef.current });
    }
    reset();
  };

  if (!visible) return null;

  const timerLabel = formatCallDuration(elapsed);

  if (status === "connected") {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={endCall}>
        <View style={styles.fullScreen}>
          {lkToken && LiveKit ? (
            <LiveKit.LiveKitRoom
              token={lkToken}
              serverUrl={lkWsUrl || "wss://expertline-v36wshsh.livekit.cloud"}
              connect
              audio
              video={callType === "video"}
              onError={(e: unknown) => {
                console.error("LiveKit Error:", e);
                Alert.alert(t("loginErrorGeneric"), t("callError"));
              }}
            >
              <View style={styles.connectedInner}>
                <View style={styles.avatarWrap}>
                  <AvatarImage name={peerName} size={120} />
                </View>
                <Text style={styles.name}>{peerName}</Text>
                <Text style={styles.timer}>{timerLabel}</Text>
              </View>
            </LiveKit.LiveKitRoom>
          ) : (
            <View style={styles.connectedInner}>
              <View style={styles.avatarWrap}>
                <AvatarImage name={peerName} size={120} />
              </View>
              <Text style={styles.name}>{peerName}</Text>
              <Text style={styles.timer}>{lkToken ? timerLabel : t("callConnecting")}</Text>
            </View>
          )}

          <View style={styles.controls}>
            <Pressable
              onPress={() => setIsMicMuted((v) => !v)}
              style={[styles.ctrlBtn, isMicMuted && styles.ctrlActive]}
            >
              {isMicMuted ? <MicOff color="#fff" size={24} /> : <Mic color="#fff" size={24} />}
            </Pressable>
            <Pressable onPress={endCall} style={[styles.ctrlBtn, styles.endBtn]}>
              <View style={{ transform: [{ rotate: "135deg" }] }}>
                <Phone color="#fff" size={28} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => setIsCamOff((v) => !v)}
              style={[styles.ctrlBtn, isCamOff && styles.ctrlActive]}
            >
              {isCamOff ? <VideoOff color="#fff" size={24} /> : <VideoIcon color="#fff" size={24} />}
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={rejectCall}>
      <View style={styles.ringBg}>
        <View style={styles.info}>
          <View style={styles.avatarShadow}>
            <AvatarImage name={peerName} size={110} />
          </View>
          <Text style={styles.name}>{peerName}</Text>
          <Text style={styles.status}>{t("callIncoming")}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable onPress={rejectCall} style={[styles.callBtn, styles.reject]} hitSlop={8}>
            <View style={{ transform: [{ rotate: "135deg" }] }}>
              <Phone color="#fff" size={30} strokeWidth={2.5} />
            </View>
          </Pressable>
          <Pressable onPress={() => void acceptCall()} style={[styles.callBtn, styles.accept]} hitSlop={8}>
            <Phone color="#fff" size={30} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "space-between",
    paddingBottom: 48,
  },
  connectedInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    marginBottom: 16,
  },
  avatarShadow: {
    shadowColor: "#38bdf8",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  name: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 12,
  },
  timer: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    marginTop: 8,
  },
  status: {
    color: "#38bdf8",
    fontSize: 18,
    marginTop: 10,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 28,
    paddingHorizontal: 24,
  },
  ctrlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  ctrlActive: {
    backgroundColor: "rgba(239,68,68,0.45)",
  },
  endBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#ef4444",
  },
  ringBg: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 100,
  },
  info: {
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 40,
  },
  callBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  accept: {
    backgroundColor: "#22c55e",
  },
  reject: {
    backgroundColor: "#ef4444",
  },
});
