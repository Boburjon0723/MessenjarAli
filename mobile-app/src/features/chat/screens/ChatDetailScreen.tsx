import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Image,
  Modal,
  ActionSheetIOS,
  TouchableWithoutFeedback,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, ArrowLeft, MoreVertical, Paperclip, Smile, Phone, Video as VideoIcon, Play, Download, X, CloudDownload, Trash2, Forward, CheckCircle, Save, Mic, MicOff, VideoOff, CreditCard, Circle, Search, Pin, Copy } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useAuthLocale } from "../../auth/locale";
import { Message } from "../types";
import { ChatBackground } from "../../../components/ChatBackground";
import { Video, ResizeMode, Audio } from 'expo-av';
import { NativeModules } from 'react-native';
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ChatHeaderMoreMenu } from "../components/ChatHeaderMoreMenu";
import { StickerPickerSheet } from "../components/StickerPickerSheet";
import { MentorInviteBar } from "../components/MentorInviteBar";
import { ListingDealBar } from "../components/ListingDealBar";
import type { Sticker } from "../../../lib/sticker-packs";
import { summarizeChat } from "../../../lib/summarize";
import { transferTokens } from "../wallet-service";

// Lazy load LiveKit to prevent crash in Expo Go
let LiveKit: any = null;
let LiveKitClient: any = null;
if (NativeModules.WebRTCModule) {
  try {
    LiveKit = require('@livekit/react-native');
    LiveKitClient = require('livekit-client');
  } catch (e) {
    console.warn("LiveKit could not be loaded:", e);
  }
}
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getMessagesRequest,
  markChatReadRequest,
  messageTypeFromMime,
  normalizeUserId,
  sendMessageRequest,
  uploadChatFileRequest,
  getChatDetailsRequest,
  ChatDetailsResponse,
  getLiveKitTokenRequest,
  mapApiMessageToMessage,
  initiateSessionRequest,
  deleteMessagesRequest,
  clearChatMessagesRequest,
  deleteChatRequest,
  updateChatPrefsRequest,
  sendGroupJoinInviteRequest,
  subscribeToMentorRequest,
  getMentorSubscriptionStatus,
  joinGroupWithSubscriptionRequest,
  ChatDetailsParticipant,
  pinMessageRequest,
  type OutgoingMessageType,
} from "../service";
import { readMessagesFromCache, writeMessagesToCache } from "../../../lib/app-cache";
import { downloadAndOpenWithSystemSheet } from "../../../lib/files";
import { useAuthStore } from "../../auth/store";
import { AvatarImage } from "../../../components/AvatarImage";
import { setCurrentChatId, getSocket } from "../../../lib/socket";
import { decryptMessage } from "../../../lib/e2e-chat";

const VideoPlayerModal = ({ visible, uri, onClose }: { visible: boolean; uri: string | null; onClose: () => void }) => {
  if (!uri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalHeader}>
           <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <X color="#fff" size={28} />
           </Pressable>
        </View>
        <Video
          source={{ uri }}
          style={styles.fullScreenVideo}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
        />
      </View>
    </Modal>
  );
};

const ImageViewerModal = ({ visible, uri, onClose }: { visible: boolean; uri: string | null; onClose: () => void }) => {
  if (!uri) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalHeader}>
           <Pressable onPress={onClose} style={styles.modalCloseBtn}>
              <X color="#fff" size={28} />
           </Pressable>
        </View>
        <Image
          source={{ uri }}
          style={styles.fullScreenImage}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
};

interface VideoViewProps {
  name: string;
  isCamOff: boolean;
  isMicMuted: boolean;
  callTimerLabel?: string;
}

const VideoView = ({ name, isCamOff, isMicMuted, callTimerLabel }: VideoViewProps) => {
  const { t } = useAuthLocale();
  if (!LiveKit || !LiveKitClient) {
    return <View style={styles.remoteVideoPlaceholder}><Text style={{ color: '#fff' }}>Native modules missing</Text></View>;
  }

  // UseTracks returned items are TrackReferenceOrPlaceholder
  const tracks = LiveKit.useTracks([
    { source: LiveKitClient.Track.Source.Camera, withPlaceholder: true },
  ]);

  const remoteTrack = tracks.find((t: any) => !t.participant.isLocal && t.source === LiveKitClient.Track.Source.Camera);
  const localTrack = tracks.find((t: any) => t.participant.isLocal && t.source === LiveKitClient.Track.Source.Camera);

  return (
    <View style={styles.videoGrid}>
      <View style={styles.remoteVideoBox}>
        {remoteTrack && remoteTrack.publication ? (
          <LiveKit.VideoTrack trackRef={remoteTrack as any} style={styles.fullScreenVideo} />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
             <View style={styles.avatarLargeBox}>
                <AvatarImage name={name} size={120} />
             </View>
             <Text style={styles.remoteNameText}>{name}</Text>
             <Text style={styles.callTimerText}>
               {callTimerLabel || t('callConnecting')}
             </Text>
          </View>
        )}
        {!!callTimerLabel && remoteTrack?.publication ? (
          <View style={styles.callTimerBadge}>
            <Text style={styles.callTimerBadgeText}>{callTimerLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.localVideoPreview}>
        {!isCamOff && localTrack && localTrack.publication ? (
          <LiveKit.VideoTrack trackRef={localTrack as any} style={styles.fill} />
        ) : (
          <View style={styles.camOffPlaceholder}>
            <VideoOff color="#fff" size={24} />
          </View>
        )}
      </View>
    </View>
  );
};

const formatCallDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const CallModal = ({ 
  visible, 
  status,
  name,
  callType,
  onAccept,
  onReject,
  onEnd,
  lkToken,
  lkWsUrl
}: { 
  visible: boolean; 
  status: 'ringing' | 'incoming' | 'connected'; 
  name: string;
  callType: 'audio' | 'video';
  onAccept: () => void; 
  onReject: () => void;
  onEnd: () => void;
  lkToken?: string | null;
  lkWsUrl?: string | null;
}) => {
  const { t } = useAuthLocale();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!visible || status !== "connected") {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [visible, status]);

  const timerLabel = formatCallDuration(elapsed);

  if (status === 'connected') {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.fullScreenCallContainer}>
          {lkToken && LiveKit ? (
            <View style={{ flex: 1 }}>
              <LiveKit.LiveKitRoom
                token={lkToken}
                serverUrl={lkWsUrl || "wss://expertline-v36wshsh.livekit.cloud"} 
                connect={true}
                audio={true}
                video={callType === 'video'}
                onError={(e: any) => {
                  console.error("LiveKit Error:", e);
                  Alert.alert(t('loginErrorGeneric'), t('callError'));
                }}
              >
                <VideoView
                  name={name}
                  isCamOff={isCamOff}
                  isMicMuted={isMicMuted}
                  callTimerLabel={timerLabel}
                />
              </LiveKit.LiveKitRoom>
            </View>
          ) : (
             <View style={styles.remoteVideoPlaceholder}>
                <View style={styles.avatarLargeBox}>
                   <AvatarImage name={name} size={120} />
                </View>
                <Text style={styles.remoteNameText}>{name}</Text>
                <Text style={styles.callTimerText}>
                  {lkToken ? timerLabel : t('callConnecting')}
                </Text>
             </View>
          )}

           {!lkToken ? (
             <View style={styles.callTimerTop}>
               <Text style={styles.callTimerBadgeText}>{timerLabel}</Text>
             </View>
           ) : null}

           <View style={styles.callControlsContainer}>
              <Pressable 
                onPress={() => setIsMicMuted(!isMicMuted)} 
                style={[styles.callControlBtn, isMicMuted && styles.controlBtnActive]}
              >
                 {isMicMuted ? <MicOff color="#fff" size={24} /> : <Mic color="#fff" size={24} />}
              </Pressable>

              <Pressable 
                onPress={onEnd} 
                style={[styles.callControlBtn, styles.endCallBtn]}
              >
                 <View style={{ transform: [{ rotate: "135deg" }] }}>
                   <Phone color="#fff" size={28} />
                 </View>
              </Pressable>

              <Pressable 
                onPress={() => setIsCamOff(!isCamOff)} 
                style={[styles.callControlBtn, isCamOff && styles.controlBtnActive]}
              >
                 {isCamOff ? <VideoOff color="#fff" size={24} /> : <VideoIcon color="#fff" size={24} />}
              </Pressable>
           </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.callModalBg}>
         <View style={styles.callInfoContainer}>
            <View style={styles.avatarLargeBoxShadow}>
              <AvatarImage name={name} size={110} />
            </View>
             <Text style={styles.callName}>{name}</Text>
             <Text style={styles.callStatus}>
               {status === 'ringing' ? t('callRinging') : status === 'incoming' ? t('callIncoming') : t('callConnected')}
             </Text>
         </View>
         
         <View style={styles.callActions}>
            {status === 'incoming' ? (
              <>
                <Pressable onPress={onReject} style={[styles.callBtn, styles.rejectBtn]} hitSlop={8}>
                   <View style={styles.callBtnIconWrap}>
                     <View style={{ transform: [{ rotate: "135deg" }] }}>
                       <Phone color="#fff" size={30} strokeWidth={2.5} />
                     </View>
                   </View>
                </Pressable>
                <Pressable onPress={onAccept} style={[styles.callBtn, styles.acceptBtn]} hitSlop={8}>
                   <View style={styles.callBtnIconWrap}>
                     <Phone color="#fff" size={30} strokeWidth={2.5} />
                   </View>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={onEnd} style={[styles.callBtn, styles.rejectBtn]} hitSlop={8}>
                 <View style={styles.callBtnIconWrap}>
                   <View style={{ transform: [{ rotate: "135deg" }] }}>
                     <Phone color="#fff" size={30} strokeWidth={2.5} />
                   </View>
                 </View>
              </Pressable>
            )}
         </View>
      </View>
    </Modal>
  );
};

// Global Audio instance to prevent overlapping
let globalSound: Audio.Sound | null = null;
let globalPlayingUri: string | null = null;
let globalSetPlaying: ((p: boolean) => void) | null = null;

const AudioPlayer = ({ uri, fileName, senderName, isMe }: { uri: string; fileName: string; senderName: string; isMe: boolean }) => {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (globalPlayingUri === uri) {
          globalSetPlaying = null;
      }
    };
  }, [uri]);

  const togglePlay = async () => {
    try {
      // 1. Agar boshqa narsa chalinayotgan bo'lsa uni to'xtatamiz
      if (globalSound && globalPlayingUri !== uri) {
          await globalSound.stopAsync();
          await globalSound.unloadAsync();
          if (globalSetPlaying) globalSetPlaying(false);
          globalSound = null;
          globalPlayingUri = null;
      }

      // 2. Play / Pause mantiqi
      if (globalSound && globalPlayingUri === uri) {
        if (playing) {
          await globalSound.pauseAsync();
          setPlaying(false);
        } else {
          await globalSound.playAsync();
          setPlaying(true);
        }
      } else {
        // Yangi qo'shiqni yuklash
        const { sound } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: true }
        );
        globalSound = sound;
        globalPlayingUri = uri;
        globalSetPlaying = setPlaying;
        setPlaying(true);
        
        sound.setOnPlaybackStatusUpdate((status) => {
           if (status.isLoaded && status.didJustFinish) {
               setPlaying(false);
               globalSound = null;
               globalPlayingUri = null;
           }
        });
      }
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  return (
    <View style={styles.audioPlayerContainer}>
      <Pressable onPress={togglePlay} style={styles.audioPlayBtn}>
         {playing ? <View style={styles.pauseIcon} /> : <Play color="#fff" size={18} fill="#fff" />}
      </Pressable>
      <View style={styles.audioInfo}>
         <Text style={styles.audioFileName} numberOfLines={1}>{fileName}</Text>
         <Text style={styles.audioSenderName}>{senderName}</Text>
      </View>
    </View>
  );
};
import { useChatStore } from "../../../store/chatStore";
import { CachedImage } from "../../../components/CachedImage";

const { width } = Dimensions.get("window");

type Props = {
  route: {
    params?: {
      chatId?: string;
      name?: string;
      avatarUrl?: string | null;
      startCall?: "audio" | "video";
    };
  };
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: object) => void;
    setParams: (params: object) => void;
  };
};

const MediaAttachment = ({ uri, isVideo, onPress, onSave }: { uri: string; isVideo: boolean; onPress: () => void; onSave: () => void }) => {
  const [loading, setLoading] = useState(!isVideo);
  const [isDownloaded, setIsDownloaded] = useState(!isVideo); // Rasmlar avto-download, videolar manual

  const handlePress = () => {
    if (isVideo && !isDownloaded) {
        setIsDownloaded(true);
        return;
    }
    onPress();
  };

  return (
    <View style={styles.mediaWrapper}>
      <Pressable onPress={handlePress} style={styles.mediaContainer}>
        {!isVideo ? (
          <>
            <CachedImage
              uri={uri}
              style={styles.mediaImage}
              resizeMode="cover"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
            {loading && (
              <View style={styles.mediaPlaceholder}>
                <ActivityIndicator color="#38bdf8" />
              </View>
            )}
          </>
        ) : (
          <>
            {isDownloaded ? (
              <Video
                source={{ uri }}
                style={styles.mediaImage}
                resizeMode={ResizeMode.COVER}
                shouldPlay
                isMuted
                isLooping
                onLoadStart={() => setLoading(true)}
                onLoad={() => setLoading(false)}
              />
            ) : (
                <View style={[styles.mediaImage, { backgroundColor: '#1a1a1a' }]}>
                    {/* Video preview / placeholder */}
                    <View style={styles.playIconBoxSmall}>
                        <Play color="#fff" size={24} fill="#fff" />
                    </View>
                </View>
            )}
            
            {/* Cloud Download Badge (MB/Duration) */}
            {!isDownloaded && (
                <View style={styles.videoCloudBadge}>
                    <CloudDownload color="#fff" size={20} />
                    <View style={styles.videoMetaCol}>
                        <Text style={styles.videoMetaText}>0:42</Text>
                        <Text style={styles.videoMetaDetail}>3.2 MB</Text>
                    </View>
                </View>
            )}
          </>
        )}
      </Pressable>
      
      {/* Floating Save/Download Button */}
      <Pressable style={styles.mediaSaveBtn} onPress={onSave}>
         <Download color="#fff" size={18} />
      </Pressable>
      
      {isVideo && isDownloaded && (
        <View style={styles.videoDurationBadge}>
           {loading ? <ActivityIndicator size="small" color="#fff" /> : <Play color="#fff" size={12} fill="#fff" />}
        </View>
      )}
    </View>
  );
};

export function ChatDetailScreen({ route, navigation }: Props) {
  const { t } = useAuthLocale();
  const insets = useSafeAreaInsets();
  const chatId = route.params?.chatId ? String(route.params.chatId) : "";
  const title = route.params?.name ? String(route.params.name) : "Chat";
  const peerAvatar = route.params?.avatarUrl ? String(route.params.avatarUrl) : "";
  const currentUserId = useAuthStore((s) => {
    const u = s.user as { id?: string; _id?: string } | null | undefined;
    return normalizeUserId(u?.id ?? u?._id);
  });
  const isExpert = useMemo(() => useAuthStore.getState().user?.is_expert, []);

  // Global Store integration
  const {
    messages: allMessages,
    chats,
    loadMessages: syncMessages,
    addMessageLocally,
    updateMessageLocally,
    removeMessagesLocally,
    clearMessagesLocally,
    removeChatLocally,
    isLoadingChats,
  } = useChatStore();
  const messages = allMessages[chatId] || [];

  const pendingPayment = useMemo(() => {
    // Oxirgi kelgan to'lov so'rovini topish
    const cid = String(chatId).toLowerCase();
    const uid = String(currentUserId).toLowerCase();
    
    return [...messages].reverse().find(m => {
      const isPeer = String(m.senderId).toLowerCase() !== uid;
      const isPayment = (
        m.metadata?.kind === 'payment_request' || 
        m.metadata?.metadata?.kind === 'payment_request' ||
        m.metadata?.serviceAmountMali ||
        m.metadata?.metadata?.serviceAmountMali ||
        m.messageType === 'consult_panel_invite'
      );
      return isPeer && isPayment;
    });
  }, [messages, currentUserId, chatId]);


  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerLastSeen, setPeerLastSeen] = useState<string | number | Date | null>(null);
  const [forwardVisible, setForwardVisible] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [invitePickerVisible, setInvitePickerVisible] = useState(false);
  const [inviteSendingId, setInviteSendingId] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [chatMuted, setChatMuted] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "text" | "media" | "files">("all");
  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sendMaliVisible, setSendMaliVisible] = useState(false);
  const [sendMaliAmount, setSendMaliAmount] = useState("");
  const [sendMaliPin, setSendMaliPin] = useState("");
  const [sendMaliBusy, setSendMaliBusy] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingEmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTypingHideRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = chatId ? `@expertline_draft_${chatId}` : "";
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);
  const [imageVisible, setImageVisible] = useState(false);
  const [activeMediaUri, setActiveMediaUri] = useState<string | null>(null);
  
  // Call State
  const [callVisible, setCallVisible] = useState(false);
  const [callStatus, setCallStatus] = useState<'ringing' | 'incoming' | 'connected'>('ringing');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callerId, setCallerId] = useState<string | null>(null);
  const callStatusRef = useRef(callStatus);
  const callVisibleRef = useRef(callVisible);
  /** True only while this screen owns an outgoing call (Global handles incoming). */
  const outgoingCallRef = useRef(false);
  callStatusRef.current = callStatus;
  callVisibleRef.current = callVisible;

  const listRef = useRef<FlatList<Message>>(null);
  const joinLiveSessionRef = useRef<(roomId?: string | null) => Promise<void>>(async () => {});

  const [chatDetails, setChatDetails] = useState<ChatDetailsResponse | null>(null);
  const peerInfo = useMemo(() => {
    if (!chatDetails || !chatDetails.participants) return null;
    return chatDetails.participants.find(p => normalizeUserId(p.id) !== currentUserId);
  }, [chatDetails, currentUserId]);

  const peerSpecialization = peerInfo?.specialization || (peerInfo as any)?.profession || "";

  const isListingChat = chatDetails?.chat_type === 'expert_listing' || chatDetails?.chat_type === 'job_listing' ||
    chatDetails?.metadata?.source === 'expert_listing' || chatDetails?.metadata?.source === 'job_listing';
  const isGroupOrChannel =
    String(chatDetails?.type ?? "").toLowerCase() === "group" ||
    String(chatDetails?.type ?? "").toLowerCase() === "channel" ||
    String(chatDetails?.chat_type ?? "").toLowerCase() === "group" ||
    String(chatDetails?.chat_type ?? "").toLowerCase() === "channel";
  const headerSubtitle = useMemo(() => {
    if (peerTyping) return t("typingStatus");
    if (isGroupOrChannel) {
      return peerSpecialization || `${chatDetails?.participants?.length ?? 0} a'zo`;
    }
    if (peerOnline) return "online";
    const raw =
      peerLastSeen ??
      (peerInfo as any)?.last_seen ??
      (peerInfo as any)?.lastSeen ??
      (chatDetails as any)?.last_seen ??
      (chatDetails as any)?.lastSeen ??
      null;
    if (raw != null) {
      const ms = typeof raw === "number" ? raw : new Date(raw).getTime();
      if (Number.isFinite(ms)) {
        const diff = Date.now() - ms;
        if (diff < 60_000) return "yaqinda tarmoqda edi";
        const d = new Date(ms);
        const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        const today = new Date();
        const sameDay =
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate();
        if (sameDay) return `oxirgi marta ${time}`;
        return `oxirgi marta ${d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })} ${time}`;
      }
    }
    return peerSpecialization || "online";
  }, [
    peerTyping,
    isGroupOrChannel,
    peerSpecialization,
    peerOnline,
    peerLastSeen,
    peerInfo,
    chatDetails,
    t,
  ]);
  const isGroupCreator =
    !!chatDetails?.creator_id &&
    normalizeUserId(chatDetails.creator_id) === currentUserId;
  /** Guruh: faqat yaratuvchi-ekspert; shaxsiy: ekspert yoki pending to‘lov */
  const showPayHeaderBtn =
    (isGroupOrChannel && isExpert && isGroupCreator) ||
    (!isGroupOrChannel && !isListingChat && (isExpert || !!pendingPayment));
  /** Faqat 1:1 shaxsiy chat — guruh/kanal/listingda call yo‘q */
  const canShowCalls = !isListingChat && !isGroupOrChannel;
  const composerLocked = isListingChat && !chatDetails?.messaging_unlocked;

  useEffect(() => {
    getChatDetailsRequest(chatId)
      .then((details) => {
        setChatDetails(details);
        if (details.pinnedMessage) {
          setPinnedMessage(mapApiMessageToMessage(details.pinnedMessage));
        } else {
          setPinnedMessage(null);
        }
        const ls =
          (details as any)?.last_seen ??
          (details as any)?.lastSeen ??
          null;
        if (ls != null) setPeerLastSeen(ls);
      })
      .catch(console.error);
  }, [chatId]);

  useEffect(() => {
    setPeerOnline(false);
    setPeerLastSeen(null);
    setPeerTyping(false);
  }, [chatId]);

  useEffect(() => {
    const socket = getSocket();
    const peerId = peerInfo?.id;
    if (!socket || !peerId || isGroupOrChannel) return;

    const handleStatus = (data: {
      userId?: string | number;
      status?: string;
      lastSeen?: string | number | Date;
    }) => {
      if (data?.userId == null) return;
      if (normalizeUserId(String(data.userId)) !== normalizeUserId(peerId)) return;
      setPeerOnline(data.status === "online");
      if (data.lastSeen != null) {
        setPeerLastSeen(data.lastSeen);
      } else if (data.status === "offline") {
        setPeerLastSeen(Date.now());
      }
    };

    socket.on("user_status_change", handleStatus);
    return () => {
      socket.off("user_status_change", handleStatus);
    };
  }, [peerInfo?.id, isGroupOrChannel, chatId]);

  useEffect(() => {
    const showEv = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEv = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEv, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEv, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      syncMessages(chatId);
      markChatReadRequest(chatId).catch(() => {});
      if (chatId) setCurrentChatId(chatId);

      const socket = getSocket();
      if (!socket) return () => { setCurrentChatId(null); };

      socket.emit('join_room', chatId);
      if (chatId && chatId !== chatId.toLowerCase()) {
        socket.emit('join_room', chatId.toLowerCase());
      }
      console.log(`[Socket] Joined rooms: ${chatId} ${chatId !== chatId.toLowerCase() ? '& ' + chatId.toLowerCase() : ''}`);

      const handleMessagesRead = (data: { chatId: string, readerId: string, messageIds: string[] }) => {
        if (String(data.chatId) === String(chatId)) {
          data.messageIds.forEach(id => {
              updateMessageLocally(chatId, id, { status: "read" });
          });
        }
      };
      
      const handleMessageUpdate = (data: { chatId?: string; id?: string; messageId?: string; status?: "read" | "delivered" }) => {
         if (String(data.chatId) === String(chatId)) {
            updateMessageLocally(chatId, data.id || data.messageId || "", { status: data.status });
         }
      };

      const handleReceive = (data: any) => {
        const rawMsg = data.message || data;
        const msg = mapApiMessageToMessage(rawMsg);
        void (async () => {
          const decrypted = await decryptMessage(msg);
          const mChatId = String(decrypted.chatId).toLowerCase();
          const sChatId = String(chatId).toLowerCase();
          if (mChatId === sChatId) {
            addMessageLocally(chatId, decrypted);
            markChatReadRequest(chatId).catch(() => {});
            setTimeout(() => scrollToEnd(), 100);
          }
        })();
      };

      socket.on("receive_message", handleReceive);
      socket.on("messages_read", handleMessagesRead);
      socket.on("message_update", handleMessageUpdate);

      // incoming_call → GlobalCallOverlay (app root). Outgoing only here.
      const onCallAccepted = () => {
        if (!outgoingCallRef.current) return;
        setCallStatus("connected");
        void joinLiveSessionRef.current(chatId);
      };
      const onCallRejected = () => {
        if (!outgoingCallRef.current) return;
        outgoingCallRef.current = false;
        setCallVisible(false);
      };
      const onCallEnded = () => {
        if (!outgoingCallRef.current && !callVisibleRef.current) return;
        if (!outgoingCallRef.current) return;
        outgoingCallRef.current = false;
        setLkToken(null);
        setCallVisible(false);
      };
      socket.on("call_accepted", onCallAccepted);
      socket.on("call_rejected", onCallRejected);
      socket.on("call_ended", onCallEnded);

      const handleTyping = (data: { senderId?: string; roomId?: string } | string) => {
        const sid = typeof data === "string" ? "" : String(data?.senderId || "");
        if (sid && normalizeUserId(sid) === currentUserId) return;
        setPeerTyping(true);
        if (peerTypingHideRef.current) clearTimeout(peerTypingHideRef.current);
        peerTypingHideRef.current = setTimeout(() => setPeerTyping(false), 4000);
      };
      const handleStopTyping = () => setPeerTyping(false);
      socket.on("typing", handleTyping);
      socket.on("stop_typing", handleStopTyping);

      const handleMessagesDeleted = (data: { chatId?: string; messageIds?: string[] }) => {
        if (String(data.chatId) !== String(chatId) || !Array.isArray(data.messageIds)) return;
        removeMessagesLocally(chatId, data.messageIds.map(String));
      };
      socket.on("messages_deleted", handleMessagesDeleted);

      const handleMessagePinned = (data: { chatId?: string; messageId?: string | null }) => {
        if (String(data.chatId) !== String(chatId)) return;
        if (!data.messageId) {
          setPinnedMessage(null);
          return;
        }
        const list = useChatStore.getState().messages[chatId] || [];
        const found = list.find((m) => String(m.id) === String(data.messageId));
        setPinnedMessage(found || null);
      };
      socket.on("message_pinned", handleMessagePinned);

      const handleMessageEdited = (data: {
        chatId?: string;
        roomId?: string;
        messageId?: string;
        content?: string;
      }) => {
        const cid = String(data.chatId || data.roomId || "");
        if (cid !== String(chatId) || !data.messageId || data.content == null) return;
        updateMessageLocally(chatId, String(data.messageId), { text: String(data.content) });
      };
      socket.on("message_edited", handleMessageEdited);
      
      socket.on('service_session_updated', (data: { id: string, status: string, chat_id?: string }) => {
          if (data.status === 'initiated' || data.status === 'ongoing' || data.status === 'completed') {
              const currentMessages = useChatStore.getState().messages[chatId] || [];
              currentMessages.forEach(msg => {
                  if (msg.metadata?.kind === 'payment_request') {
                      updateMessageLocally(chatId, msg.id, { 
                          metadata: { ...msg.metadata, kind: 'panel_open' } 
                      });
                  }
              });
          }
      });

      return () => {
        setCurrentChatId(null);
        setPeerTyping(false);
        try {
          socket.emit("stop_typing", chatId);
        } catch { /* ignore */ }
        socket.off("receive_message", handleReceive);
        socket.off("messages_read", handleMessagesRead);
        socket.off("message_update", handleMessageUpdate);
        socket.off("call_accepted", onCallAccepted);
        socket.off("call_rejected", onCallRejected);
        socket.off("call_ended", onCallEnded);
        socket.off("typing", handleTyping);
        socket.off("stop_typing", handleStopTyping);
        socket.off("messages_deleted", handleMessagesDeleted);
        socket.off("message_pinned", handleMessagePinned);
        socket.off("message_edited", handleMessageEdited);
      };
    }, [chatId, syncMessages, currentUserId, removeMessagesLocally, updateMessageLocally])
  );

  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkWsUrl, setLkWsUrl] = useState<string | null>(null);

  const resolvePeerUserId = useCallback(() => {
    if (peerInfo?.id) return String(peerInfo.id);
    return "";
  }, [peerInfo?.id]);

  const startCall = (type: "audio" | "video") => {
    const socket = getSocket();
    if (!socket || !chatId) return;
    if (isListingChat || isGroupOrChannel) {
      Alert.alert(t("callNotAllowed"), t("callListingRestriction"));
      return;
    }
    const peerId = resolvePeerUserId();
    if (!peerId) {
      Alert.alert(t("loginErrorGeneric"), "Suhbatdosh topilmadi");
      return;
    }
    setCallType(type);
    setCallStatus("ringing");
    setCallVisible(true);
    outgoingCallRef.current = true;
    socket.emit("call_user", {
      targetUserId: peerId,
      chatId,
      fromName: useAuthStore.getState().user?.name || "User",
      signal: { type: "livekit" },
      callType: type,
    });
  };

  const endCall = () => {
    const socket = getSocket();
    const peerId = resolvePeerUserId() || callerId;
    if (socket && peerId) {
      socket.emit("end_call", { to: peerId, chatId });
    }
    outgoingCallRef.current = false;
    setLkToken(null);
    setCallVisible(false);
    setCallerId(null);
  };

  const acceptCall = async () => {
    const socket = getSocket();
    const target = callerId || resolvePeerUserId();
    if (socket && target) {
      socket.emit("accept_call", { to: target, chatId, signal: { type: "livekit" } });
    }
    await joinLiveSession(chatId);
  };

  /** Dars / konsultatsiya xonasiga ulanish — 1:1 qo‘ng‘iroq talab qilmaydi */
  const joinLiveSession = async (roomId?: string | null) => {
    const sessionId = String(roomId || chatId || "").trim();
    if (!sessionId) {
      Alert.alert("Xatolik", "Sessiya ID topilmadi");
      return;
    }
    setCallStatus("connected");
    setCallVisible(true);

    const socket = getSocket();
    if (socket) {
      socket.emit("join_room", sessionId);
      socket.emit("session_join", { sessionId });
    }

    try {
      const username = useAuthStore.getState().user?.name || "Talaba";
      const data = await getLiveKitTokenRequest(sessionId, username);
      if (data?.token) {
        setLkToken(data.token);
        setLkWsUrl(data.wsUrl);
        console.log("[LiveKit] Session token OK:", sessionId);
      } else {
        throw new Error("Token yo'q");
      }
    } catch (e) {
      console.error("[LiveKit] Session join error:", e);
      Alert.alert("Xatolik", "Sessiyaga ulanishda muammo yuz berdi");
      setCallVisible(false);
    }
  };
  joinLiveSessionRef.current = joinLiveSession;

  const rejectCall = () => {
    const socket = getSocket();
    const target = callerId || resolvePeerUserId();
    if (socket && target) {
      socket.emit("reject_call", { to: target, chatId });
    }
    outgoingCallRef.current = false;
    setCallVisible(false);
    setCallerId(null);
  };

  // Peer info / deep-link: startCall param
  useEffect(() => {
    const kind = route.params?.startCall;
    if (!kind || !chatId) return;
    navigation.setParams({ startCall: undefined });
    const tmr = setTimeout(() => startCall(kind), 300);
    return () => clearTimeout(tmr);
  }, [route.params?.startCall, chatId]);

  // Draft (Telegram uslubi)
  useEffect(() => {
    if (!draftKey) return;
    let cancelled = false;
    AsyncStorage.getItem(draftKey)
      .then((v) => {
        if (!cancelled && v) setInputText(v);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  const persistDraft = useCallback(
    (text: string) => {
      if (!draftKey) return;
      if (!text.trim()) {
        AsyncStorage.removeItem(draftKey).catch(() => {});
      } else {
        AsyncStorage.setItem(draftKey, text).catch(() => {});
      }
    },
    [draftKey]
  );

  const emitTypingActivity = useCallback(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;
    if (!typingEmitRef.current) {
      socket.emit("typing", chatId);
      typingEmitRef.current = setTimeout(() => {
        typingEmitRef.current = null;
      }, 4000);
    } else {
      // already emitting within window — refresh stop timer only
    }
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => {
      socket.emit("stop_typing", chatId);
    }, 3000);
  }, [chatId]);

  const onChangeInput = (text: string) => {
    setInputText(text);
    persistDraft(text);
    if (text.trim()) emitTypingActivity();
  };

  const groupInviteCandidates = useMemo(() => {
    const list = chatDetails?.participants ?? [];
    return list.filter((p) => normalizeUserId(p.id) !== currentUserId);
  }, [chatDetails?.participants, currentUserId]);

  const sendGroupInviteToStudent = async (student: ChatDetailsParticipant) => {
    const studentUserId = String(student.id || "").trim();
    if (!studentUserId || !chatId) return;
    setInviteSendingId(studentUserId);
    try {
      const expertName = useAuthStore.getState().user?.name || "Ustoz";
      await sendGroupJoinInviteRequest({
        groupId: chatId,
        studentUserId,
        expertName,
      });
      setInvitePickerVisible(false);
      const name = `${student.name ?? ""} ${student.surname ?? ""}`.trim() || "Talaba";
      Alert.alert("Yuborildi", `Obuna taklifi ${name} shaxsiy chatiga yuborildi.`);
    } catch (e) {
      Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Xatolik");
    } finally {
      setInviteSendingId(null);
    }
  };

  const payAndJoinGroup = async (item: Message) => {
    const meta = item.metadata || {};
    const groupId = meta.groupId != null ? String(meta.groupId) : "";
    const mentorId =
      meta.mentorId != null
        ? String(meta.mentorId)
        : item.senderId
          ? String(item.senderId)
          : "";
    const amount = Number(meta.monthlyAmount) || 100;
    if (!groupId || !mentorId) {
      Alert.alert(t("loginErrorGeneric"), "Taklif ma'lumotlari to'liq emas");
      return;
    }
    try {
      const status = await getMentorSubscriptionStatus(mentorId);
      if (!status.active) {
        await new Promise<void>((resolve, reject) => {
          Alert.alert(
            "Obuna",
            `${amount} MALI — 1 oylik obuna. To'lov qilasizmi?`,
            [
              { text: "Bekor", style: "cancel", onPress: () => reject(new Error("cancel")) },
              {
                text: "Obuna bo'lish va qo'shilish",
                onPress: () => resolve(),
              },
            ]
          );
        }).catch(() => {
          throw new Error("__cancel__");
        });
        await subscribeToMentorRequest(mentorId);
      }
      await joinGroupWithSubscriptionRequest(groupId);
      Alert.alert("Muvaffaqiyatli", "Guruhga qo'shildingiz!");
      navigation.navigate("ChatDetail", {
        chatId: groupId,
        name: String(meta.groupName || "Guruh"),
      });
    } catch (e) {
      if (e instanceof Error && e.message === "__cancel__") return;
      Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Xatolik");
    }
  };

  const exitSelecting = useCallback(() => {
    setIsSelecting(false);
    setSelectedMessageIds([]);
  }, []);

  const toggleMessageSelected = useCallback((messageId: string) => {
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]
    );
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!chatId || selectedMessageIds.length === 0) return;
    Alert.alert(t("msgDelete"), `${selectedMessageIds.length} ${t("chatSelectedCount")}`, [
      { text: t("msgCancel"), style: "cancel" },
      {
        text: t("msgDelete"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteMessagesRequest(chatId, selectedMessageIds);
              removeMessagesLocally(chatId, selectedMessageIds);
              exitSelecting();
            } catch (e) {
              Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Error");
            }
          })();
        },
      },
    ]);
  }, [chatId, selectedMessageIds, t, removeMessagesLocally, exitSelecting]);

  const handleCopySelected = useCallback(async () => {
    if (selectedMessageIds.length === 0) return;
    const texts = messages
      .filter((m) => selectedMessageIds.includes(m.id))
      .map((m) => (m.text || "").trim())
      .filter(Boolean);
    if (texts.length === 0) return;
    try {
      await Clipboard.setStringAsync(texts.join("\n"));
      exitSelecting();
    } catch (e) {
      Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Error");
    }
  }, [messages, selectedMessageIds, exitSelecting, t]);

  const handleForwardSelected = useCallback(() => {
    if (selectedMessageIds.length !== 1) return;
    const msg = messages.find((m) => m.id === selectedMessageIds[0]);
    if (!msg) return;
    setForwardMessage(msg);
    setForwardVisible(true);
    exitSelecting();
  }, [messages, selectedMessageIds, exitSelecting]);

  const handleToggleMute = useCallback(async () => {
    if (!chatId) return;
    try {
      const next = await updateChatPrefsRequest(chatId, { muted: !chatMuted });
      setChatMuted(next.muted);
    } catch (e) {
      Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Error");
    }
  }, [chatId, chatMuted, t]);

  const handleSummarize = useCallback(async () => {
    const textMessages = messages
      .filter((m) => !m.messageType || m.messageType === "text")
      .slice(-50)
      .map((m) => {
        const who =
          normalizeUserId(m.senderId) === currentUserId ? t("msgSenderMe") : title;
        return `${who}: ${m.text || ""}`;
      })
      .join(". ");

    if (!textMessages.trim()) {
      Alert.alert(t("chatSummaryTitle"), t("chatNoMessages"));
      return;
    }

    setIsSummarizing(true);
    try {
      const summary = await summarizeChat(textMessages);
      if (summary === "XIZMAT_BAND") {
        Alert.alert(t("chatSummaryTitle"), t("chatServiceBusy"));
      } else if (summary) {
        Alert.alert(t("chatSummaryTitle"), summary);
      } else {
        Alert.alert(t("chatSummaryTitle"), t("chatSummaryError"));
      }
    } finally {
      setIsSummarizing(false);
    }
  }, [messages, currentUserId, title, t]);

  const handleExportHistory = useCallback(async () => {
    if (messages.length === 0) {
      Alert.alert(t("chatExportHistory"), t("chatNoMessages"));
      return;
    }
    try {
      const textContent = messages
        .map((m) => {
          const who =
            normalizeUserId(m.senderId) === currentUserId ? t("msgSenderMe") : title;
          const body =
            m.messageType && m.messageType !== "text"
              ? `[${m.messageType}] ${m.text || ""}`
              : m.text || "";
          return `[${m.timestamp}] ${who}: ${body}`;
        })
        .join("\n");
      const base = FileSystem.cacheDirectory;
      if (!base) throw new Error("Fayl katalogi mavjud emas");
      const path = `${base}chat_history_${String(chatId).slice(0, 8)}.txt`;
      await FileSystem.writeAsStringAsync(path, textContent);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(t("chatExportHistory"), path);
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: "text/plain",
        dialogTitle: t("chatExportHistory"),
      });
    } catch (e) {
      Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Error");
    }
  }, [messages, chatId, currentUserId, title, t]);

  const handleClearHistory = useCallback(() => {
    if (!chatId) return;
    Alert.alert(t("chatClearHistory"), t("chatConfirmClear"), [
      { text: t("msgCancel"), style: "cancel" },
      {
        text: t("chatClearHistory"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await clearChatMessagesRequest(chatId);
              clearMessagesLocally(chatId);
              exitSelecting();
            } catch (e) {
              Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Error");
            }
          })();
        },
      },
    ]);
  }, [chatId, t, clearMessagesLocally, exitSelecting]);

  const handleDeleteChat = useCallback(() => {
    if (!chatId) return;
    Alert.alert(t("chatDeleteChat"), t("chatConfirmDeleteChat"), [
      { text: t("msgCancel"), style: "cancel" },
      {
        text: t("chatDeleteChat"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await deleteChatRequest(chatId);
              removeChatLocally(chatId);
              navigation.goBack();
            } catch (e) {
              Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Error");
            }
          })();
        },
      },
    ]);
  }, [chatId, t, removeChatLocally, navigation]);

  const openPeerProfile = useCallback(() => {
    navigation.navigate("ChatPeerInfo", {
      chatId,
      name: title,
      avatarUrl: peerAvatar || null,
    });
  }, [navigation, chatId, title, peerAvatar]);

  const handleSendMali = useCallback(async () => {
    const receiverId = peerInfo?.id;
    if (!receiverId) {
      Alert.alert("MALI", "Suhbatdosh topilmadi");
      return;
    }
    const amount = Number(sendMaliAmount);
    const pin = sendMaliPin.trim();
    if (!amount || amount <= 0) {
      Alert.alert("MALI", "Summani kiriting");
      return;
    }
    if (pin.length !== 4) {
      Alert.alert("MALI", "PIN 4 raqam bo'lishi kerak");
      return;
    }
    setSendMaliBusy(true);
    try {
      const res = await transferTokens({
        receiverId: String(receiverId),
        amount,
        pin,
        note: `Chat: ${title}`,
      });
      if (!res.ok) {
        Alert.alert("MALI", res.message || "O'tkazma amalga oshmadi");
        return;
      }
      setSendMaliVisible(false);
      setSendMaliAmount("");
      setSendMaliPin("");
      Alert.alert("MALI", `${amount} MALI yuborildi`);
    } finally {
      setSendMaliBusy(false);
    }
  }, [peerInfo?.id, sendMaliAmount, sendMaliPin, title]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: false });
    });
  }, []);

  /**
   * iOS: klaviatura balandligi = pastki bo‘shliq.
   * Android + softwareKeyboardLayoutMode resize: oyna balandligi qisqaradi — qo‘shimcha keyboard padding kerak emas (yo‘q bo‘lsa pan/resize muammosi).
   */
  const keyboardBottomInset =
    keyboardHeight <= 0
      ? Math.max(insets.bottom, 8)
      : Platform.OS === "android"
        ? 0
        : keyboardHeight;

  useEffect(() => {
    if (keyboardHeight > 0) {
      const t = setTimeout(() => scrollToEnd(), 80);
      return () => clearTimeout(t);
    }
  }, [keyboardHeight, scrollToEnd]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || !chatId || sending || uploadingFile) return;

    setSending(true);
    setError(null);

    if (editingMessage) {
      try {
        const socket = getSocket();
        socket?.emit("edit_message", {
          roomId: chatId,
          messageId: editingMessage.id,
          content: text,
        });
        updateMessageLocally(chatId, editingMessage.id, { text });
        setEditingMessage(null);
        setInputText("");
        if (draftKey) AsyncStorage.removeItem(draftKey).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : t("loginErrorGeneric"));
      } finally {
        setSending(false);
      }
      return;
    }

    const parent = replyTo;
    try {
      const socket = getSocket();
      try {
        socket?.emit("stop_typing", chatId);
      } catch { /* ignore */ }
      const saved = await sendMessageRequest(chatId, text, "text", {
        peerUserId: chatDetails?.type === "group" || chatDetails?.type === "channel" ? undefined : peerInfo?.id,
        parentId: parent?.id || null,
      });
      if (parent && !saved.parentId) {
        saved.parentId = parent.id;
        saved.parentPreview = {
          text: parent.text,
          senderName: parent.senderId === currentUserId ? t("msgSenderMe") : title,
        };
      }
      setInputText("");
      setReplyTo(null);
      if (draftKey) AsyncStorage.removeItem(draftKey).catch(() => {});
      addMessageLocally(chatId, saved);
      setTimeout(scrollToEnd, 120);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loginErrorGeneric'));
    } finally {
      setSending(false);
    }
  };

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    clearRecordingTimer();
    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
    } catch { /* ignore */ }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch { /* ignore */ }
  }, [clearRecordingTimer]);

  const startRecording = useCallback(async () => {
    if (!chatId || sending || uploadingFile || composerLocked || isRecording) return;
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Ruxsat", "Mikrofon ruxsati kerak");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordingSeconds(0);
      clearRecordingTimer();
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      Alert.alert(t("loginErrorGeneric"), e instanceof Error ? e.message : "Yozib bo‘lmadi");
      await cancelRecording();
    }
  }, [chatId, sending, uploadingFile, composerLocked, isRecording, clearRecordingTimer, cancelRecording, t]);

  const sendRecording = useCallback(async () => {
    if (!chatId || !recordingRef.current) return;
    clearRecordingTimer();
    const rec = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingSeconds(0);
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      } catch { /* ignore */ }
      if (!uri) throw new Error("Yozuv fayli topilmadi");
      setUploadingFile(true);
      setError(null);
      const url = await uploadChatFileRequest(uri, `voice_${Date.now()}.m4a`, "audio/m4a");
      const saved = await sendMessageRequest(chatId, url, "voice");
      addMessageLocally(chatId, saved);
      setTimeout(scrollToEnd, 120);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ovoz yuborilmadi");
    } finally {
      setUploadingFile(false);
    }
  }, [chatId, clearRecordingTimer, scrollToEnd]);

  const sendSticker = useCallback(
    async (sticker: Sticker) => {
      if (!chatId || sending || uploadingFile || composerLocked) return;
      setShowStickers(false);
      setSending(true);
      setError(null);
      try {
        const saved = await sendMessageRequest(chatId, sticker.webp, "sticker", {
          metadata: {
            emoji: sticker.emoji,
            stickerCode: sticker.code,
            code: sticker.code,
            url: sticker.webp,
          },
        });
        addMessageLocally(chatId, saved);
        setTimeout(scrollToEnd, 120);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("loginErrorGeneric"));
      } finally {
        setSending(false);
      }
    },
    [chatId, sending, uploadingFile, composerLocked, scrollToEnd, t]
  );

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      const rec = recordingRef.current;
      recordingRef.current = null;
      if (rec) {
        void rec.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const uploadAndSendLocalFile = useCallback(
    async (
      uri: string,
      filename: string,
      mimeType: string,
      forceType?: OutgoingMessageType
    ) => {
      if (!chatId || sending || uploadingFile) return;
      setUploadingFile(true);
      setError(null);
      try {
        const url = await uploadChatFileRequest(uri, filename, mimeType);
        const typ = forceType || messageTypeFromMime(mimeType);
        const saved = await sendMessageRequest(chatId, url, typ);
        addMessageLocally(chatId, saved);
        setTimeout(scrollToEnd, 120);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fayl yuborilmadi");
      } finally {
        setUploadingFile(false);
      }
    },
    [chatId, sending, uploadingFile, scrollToEnd, addMessageLocally]
  );

  const pickGalleryMedia = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Ruxsat", "Galereyaga ruxsat bering");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const mime =
      asset.mimeType ||
      (asset.type === "video" ? "video/mp4" : "image/jpeg");
    const name =
      asset.fileName ||
      (asset.type === "video" ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`);
    await uploadAndSendLocalFile(asset.uri, name, mime);
  }, [uploadAndSendLocalFile]);

  const pickCameraPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Ruxsat", "Kameraga ruxsat bering");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    await uploadAndSendLocalFile(
      asset.uri,
      asset.fileName || `camera_${Date.now()}.jpg`,
      asset.mimeType || "image/jpeg",
      "image"
    );
  }, [uploadAndSendLocalFile]);

  const pickAndSendFile = useCallback(async () => {
    if (!chatId || sending || uploadingFile) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      await uploadAndSendLocalFile(
        asset.uri,
        asset.name ?? "file",
        asset.mimeType ?? "application/octet-stream"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fayl yuborilmadi");
    }
  }, [chatId, sending, uploadingFile, uploadAndSendLocalFile]);

  const pasteClipboardImage = useCallback(async () => {
    try {
      const has = await Clipboard.hasImageAsync();
      if (!has) {
        Alert.alert("Bufer", "Buferda rasm yo'q");
        return;
      }
      const img = await Clipboard.getImageAsync({ format: "png" });
      if (!img?.data) {
        Alert.alert("Bufer", "Rasm o'qilmadi");
        return;
      }
      const base = FileSystem.cacheDirectory;
      if (!base) throw new Error("Kesh yo'q");
      const path = `${base}paste_${Date.now()}.png`;
      const raw = img.data.includes(",") ? img.data.split(",")[1] : img.data;
      await FileSystem.writeAsStringAsync(path, raw, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await uploadAndSendLocalFile(path, `paste_${Date.now()}.png`, "image/png", "image");
    } catch (e) {
      Alert.alert("Bufer", e instanceof Error ? e.message : "Yuborilmadi");
    }
  }, [uploadAndSendLocalFile]);

  const openAttachMenu = useCallback(() => {
    if (sending || uploadingFile || composerLocked) return;
    const labels = [
      "Galereya",
      "Kamera",
      "Fayl",
      "Buferdan rasm",
      t("msgCancel"),
    ];
    const run = (idx: number) => {
      if (idx === 0) void pickGalleryMedia();
      else if (idx === 1) void pickCameraPhoto();
      else if (idx === 2) void pickAndSendFile();
      else if (idx === 3) void pasteClipboardImage();
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: labels,
          cancelButtonIndex: 4,
          title: "Biriktirish",
        },
        (buttonIndex) => {
          if (buttonIndex != null && buttonIndex < 4) run(buttonIndex);
        }
      );
    } else {
      Alert.alert("Biriktirish", undefined, [
        { text: "Galereya", onPress: () => run(0) },
        { text: "Kamera", onPress: () => run(1) },
        { text: "Fayl", onPress: () => run(2) },
        { text: "Buferdan rasm", onPress: () => run(3) },
        { text: t("msgCancel"), style: "cancel" },
      ]);
    }
  }, [
    sending,
    uploadingFile,
    composerLocked,
    pickGalleryMedia,
    pickCameraPhoto,
    pickAndSendFile,
    pasteClipboardImage,
    t,
  ]);

  const copyMessageContent = useCallback(async (message: Message) => {
    try {
      const typ = String(message.messageType || "text").toLowerCase();
      const isImg =
        typ === "image" ||
        !!message.remoteFileUrl?.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
      if (isImg && message.remoteFileUrl) {
        const base = FileSystem.cacheDirectory;
        if (!base) throw new Error("Kesh yo'q");
        const dest = `${base}copy_${Date.now()}.img`;
        const dl = await FileSystem.downloadAsync(message.remoteFileUrl, dest);
        const b64 = await FileSystem.readAsStringAsync(dl.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Clipboard.setImageAsync(b64);
        Alert.alert("Nusxa", "Rasm buferga nusxalandi");
        return;
      }
      const text = (message.text || "").trim();
      if (!text) {
        Alert.alert("Nusxa", "Nusxalanadigan matn yo'q");
        return;
      }
      await Clipboard.setStringAsync(text);
      Alert.alert("Nusxa", "Matn nusxalandi");
    } catch (e) {
      Alert.alert("Nusxa", e instanceof Error ? e.message : "Xato");
    }
  }, []);

  const openVideo = (uri: string) => {
    setActiveMediaUri(uri);
    setPlayerVisible(true);
  };

  const openImage = (uri: string) => {
    setActiveMediaUri(uri);
    setImageVisible(true);
  };

  const openAttachment = useCallback(async (item: Message) => {
    const url = item.remoteFileUrl;
    if (!url) return;
    
    // Media detection
    const isVideo = item.messageType === 'video' || url.match(/\.(mp4|mov|avi|mkv)$/i);
    const isImg = item.messageType === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i);

    if (isVideo) {
       openVideo(url);
       return;
    }
    if (isImg) {
       openImage(url);
       return;
    }

    setOpeningFileId(item.id);
    try {
      await downloadAndOpenWithSystemSheet(url);
    } catch (e) {
      Alert.alert("Fayl", e instanceof Error ? e.message : "Ochib bo‘lmadi");
    } finally {
      setOpeningFileId(null);
    }
  }, []);

  const filteredMessages = useMemo(() => {
    if (!showSearch) return messages;
    const q = searchQuery.trim().toLowerCase();
    const fromMs = searchDateFrom.trim()
      ? Date.parse(searchDateFrom.trim())
      : NaN;
    const toMs = searchDateTo.trim()
      ? Date.parse(searchDateTo.trim()) + 24 * 60 * 60 * 1000 - 1
      : NaN;
    return messages.filter((m) => {
      const typ = String(m.messageType || "").toLowerCase();
      if (searchType === "text") {
        if (typ && typ !== "text") return false;
      } else if (searchType === "media") {
        if (!["image", "video", "voice", "audio"].includes(typ)) return false;
      } else if (searchType === "files") {
        if (typ !== "file") return false;
      }
      if (q && !(m.text || "").toLowerCase().includes(q)) return false;
      if (!Number.isNaN(fromMs) || !Number.isNaN(toMs)) {
        const meta = m.createdAt || m.timestamp;
        const ms = typeof meta === "number" ? meta : Date.parse(String(meta));
        if (!Number.isNaN(ms)) {
          if (!Number.isNaN(fromMs) && ms < fromMs) return false;
          if (!Number.isNaN(toMs) && ms > toMs) return false;
        }
      }
      return true;
    });
  }, [messages, showSearch, searchQuery, searchType, searchDateFrom, searchDateTo]);

  const messagesWithHeaders = useMemo(() => {
    const result: any[] = [];
    let lastDateText = "";

    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    const labelFor = (d: Date) => {
      const now = new Date();
      const yest = new Date();
      yest.setDate(now.getDate() - 1);
      if (dayKey(d) === dayKey(now)) return t("msgToday");
      if (dayKey(d) === dayKey(yest)) return "Kecha";
      return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    };

    filteredMessages.forEach((m) => {
      const raw = m.createdAt;
      const parsed =
        typeof raw === "number"
          ? new Date(raw)
          : raw
            ? new Date(String(raw))
            : null;
      const d = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
      const dateText = labelFor(d);

      if (dateText !== lastDateText) {
        result.push({ isDateHeader: true, dateText, id: `header-${dateText}-${dayKey(d)}` });
        lastDateText = dateText;
      }
      result.push(m);
    });
    return result;
  }, [filteredMessages, t]);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item.isDateHeader) {
      return (
        <View style={styles.dateHeaderContainer}>
          <View style={styles.dateHeaderBg}>
            <Text style={styles.dateHeaderText}>{item.dateText}</Text>
          </View>
        </View>
      );
    }

    const isMe = currentUserId.length > 0 && item.senderId === currentUserId;
    const hasAttachment = Boolean(item.remoteFileUrl);
    const opening = openingFileId === item.id;
    
    // Birlashish logikasi (Grouping)
    const prevItem = index > 0 ? messagesWithHeaders[index - 1] : null;
    const nextItem = index < messagesWithHeaders.length - 1 ? messagesWithHeaders[index + 1] : null;
    
    // Agar xabarlar o'rtasida 10 daqiqadan ko'p vaqt o'tsa yoki boshqa odam yozsa, guruh uziladi
    const isConsecutivePrev = prevItem && !prevItem.isDateHeader && prevItem.senderId === item.senderId;
    const isConsecutiveNext = nextItem && !nextItem.isDateHeader && nextItem.senderId === item.senderId;

    const isSticker =
      item.messageType === "sticker" ||
      !!item.metadata?.stickerCode ||
      !!item.metadata?.emoji ||
      !!item.metadata?.code;
    const isImage =
      !isSticker &&
      (item.messageType === "image" ||
        item.remoteFileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    const isVideo = item.messageType === 'video' || item.remoteFileUrl?.match(/\.(mp4|mov|avi|mkv)$/i);
    const isAudio = item.messageType === 'audio' || item.remoteFileUrl?.match(/\.(mp3|wav|ogg|m4a)$/i);
    const isMedia = isImage || isVideo;
    
    const hasRawUrlText = item.text && (item.text === item.remoteFileUrl || item.text.startsWith?.("http"));
    const isGroupJoinInvite =
      item.messageType === "group_join_invite" || item.metadata?.kind === "group_join";
    const displayText =
      isSticker || isGroupJoinInvite || hasRawUrlText ? null : item.text;
    const fileName = item.remoteFileUrl ? item.remoteFileUrl.split('/').pop()?.split('?')[0] || t('msgFile') : t('msgFile');
    const stickerUri =
      item.remoteFileUrl ||
      (typeof item.metadata?.url === "string" ? item.metadata.url : null) ||
      (typeof item.metadata?.webp === "string" ? item.metadata.webp : null) ||
      (item.text?.startsWith?.("http") ? item.text : null);

    const bubbleBody = (


      <>
        {item.parentId && item.parentPreview ? (
          <View style={[styles.replyQuote, isMe ? styles.replyQuoteMe : styles.replyQuoteOther]}>
            <Text style={styles.replyQuoteName} numberOfLines={1}>
              {item.parentPreview.senderName || t("replyBarTitle")}
            </Text>
            <Text style={styles.replyQuoteText} numberOfLines={2}>
              {item.parentPreview.text || "…"}
            </Text>
          </View>
        ) : null}
        {isSticker && stickerUri ? (
          <View style={styles.stickerWrap}>
            <CachedImage
              uri={String(stickerUri)}
              style={styles.stickerImage}
              resizeMode="contain"
            />
          </View>
        ) : null}
        {hasAttachment && isMedia ? (
           <MediaAttachment 
             uri={item.remoteFileUrl!} 
             isVideo={Boolean(isVideo)} 
             onPress={() => isImage ? openImage(item.remoteFileUrl!) : openVideo(item.remoteFileUrl!)} 
             onSave={() => void openAttachment(item)}
           />
        ) : null}
        
        {hasAttachment && isAudio ? (
           <AudioPlayer 
              uri={item.remoteFileUrl!} 
              fileName={fileName} 
              senderName={isMe ? "Men" : title} 
              isMe={isMe} 
           />
        ) : hasAttachment && !isMedia && !isSticker ? (
          <Pressable onPress={() => void openAttachment(item)} style={styles.fileCard}>
             <View style={styles.fileIconBox}>
                <Paperclip color="#38bdf8" size={24} />
             </View>
             <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">{fileName}</Text>
                <View style={styles.fileMetaRow}>
                   <View style={styles.fileTypeBadge}>
                      <Text style={styles.fileTypeBadgeText}>FAYL</Text>
                   </View>
                   <Text style={[styles.actionText, opening && { opacity: 0.5 }]}>
                      {opening ? t('msgLoading').toUpperCase() : t('msgSave').toUpperCase()}
                   </Text>
                </View>
             </View>
          </Pressable>
        ) : null}

        {/* PAYMENT REQUEST CARD */}
        {(item.metadata?.kind === 'payment_request' || 
          item.metadata?.metadata?.kind === 'payment_request' || 
          (item.messageType === 'consult_panel_invite' && item.metadata?.serviceAmountMali)) && (
          <View style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <View style={styles.paymentIconBox}>
                <CreditCard color="#3b82f6" size={20} />
              </View>
              <Text style={styles.paymentTitle}>Xizmat uchun to'lov</Text>
            </View>
            
            <View style={styles.paymentDivider} />
            
            <View style={styles.paymentAmountBox}>
              <Text style={styles.paymentLabel}>Summa:</Text>
              <Text style={styles.paymentValue}>{(item.metadata?.serviceAmountMali || item.metadata?.metadata?.serviceAmountMali || 0)} MALI</Text>
            </View>


            <Pressable 
              style={styles.payNowBtn}
              onPress={() => {
                 const amount = item.metadata?.serviceAmountMali || 0;
                 Alert.alert(
                   "To'lovni tasdiqlang",
                   `${amount} MALI to'lov qilinsinmi?`,
                   [
                     { text: "Yo'q", style: "cancel" },
                     { 
                       text: "Ha, to'lash", 
                       onPress: async () => {
                         try {
                            await initiateSessionRequest(item.senderId, amount, chatId);
                            Alert.alert("Muvaffaqiyatli", "To'lov qabul qilindi");
                         } catch (e) {
                            Alert.alert("Xatolik", e instanceof Error ? e.message : "To'lovda xato yuz berdi");
                         }
                       }
                     }
                   ]
                 );
              }}
            >
              <CreditCard color="#fff" size={18} />
              <Text style={styles.payNowBtnText}>HOZIR TO'LASH</Text>
            </Pressable>
          </View>
        )}

        {/* MENTOR GROUP JOIN INVITE — talaba shaxsiy chatida */}
        {(item.messageType === "group_join_invite" ||
          item.metadata?.kind === "group_join") && (
          <View style={styles.paymentCard}>
            <Text style={styles.paymentTitle}>
              {String(item.metadata?.groupName || "Guruh")}
            </Text>
            <Text style={[styles.paymentValue, { marginVertical: 8 }]}>
              {Number(item.metadata?.monthlyAmount) || 100} MALI / oy
            </Text>
            {String(item.metadata?.invite_status) === "paid" ? (
              <View style={styles.paidBadge}>
                <CheckCircle color="#4ade80" size={18} />
                <Text style={styles.paidBadgeText}>Tasdiqlandi</Text>
              </View>
            ) : !isMe ? (
              <>
                <Text style={[styles.paymentLabel, { marginBottom: 8 }]}>
                  To'lov kutilmoqda
                </Text>
                <Pressable
                  style={[styles.payNowBtn, { backgroundColor: "#8774e1" }]}
                  onPress={() => void payAndJoinGroup(item)}
                >
                  <CreditCard color="#fff" size={18} />
                  <Text style={styles.payNowBtnText}>Obuna bo'lish va qo'shilish</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.paymentLabel}>Talabaga yuborildi</Text>
            )}
          </View>
        )}

        {/* PAID BADGE */}
        {item.metadata?.kind === 'panel_open' && (
          <View style={styles.paymentCard}>
             <View style={styles.paidBadge}>
                <CheckCircle color="#4ade80" size={18} />
                <Text style={styles.paidBadgeText}>TO'LANGAN</Text>
             </View>
             <Pressable 
               style={[styles.payNowBtn, { marginTop: 12, backgroundColor: '#10b981' }]}
                  onPress={() => {
                  const sid =
                    item.metadata?.sessionId != null
                      ? String(item.metadata.sessionId)
                      : chatId;
                  setCallType("video");
                  void joinLiveSession(sid);
               }}
             >
                <VideoIcon color="#fff" size={18} />
                <Text style={styles.payNowBtnText}>SUHBATGA KIRISH</Text>
             </Pressable>
          </View>
        )}


        {(item.messageType === 'consult_panel_invite' ||
          item.messageType === 'lesson_start' ||
          item.type === 'consult_panel_invite' ||
          item.type === 'lesson_start') &&
          item.metadata?.kind !== 'payment_request' &&
          item.metadata?.kind !== 'panel_open' &&
          item.metadata?.kind !== 'listing_payment_request' &&
          !isExpert && (
           <Pressable 
             style={styles.joinSessionBtn}
             onPress={() => {
                const sid =
                  item.metadata?.sessionId != null
                    ? String(item.metadata.sessionId)
                    : chatId;
                setCallType("video");
                void joinLiveSession(sid);
             }}
           >
             <VideoIcon color="#fff" size={16} />
             <Text style={styles.joinSessionBtnText}>{t('sessionJoin')}</Text>
           </Pressable>
        )}


        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: isMedia && !displayText ? 0 : 2 }}>
           {displayText ? <Text style={[styles.messageText, (hasAttachment && !isMedia) && { marginTop: 8 }]}>{displayText}</Text> : null}
           <View style={[styles.bubbleFooter, displayText ? { marginLeft: 8, marginBottom: 2 } : {}]}>
             <Text style={[styles.timestamp, { color: isMe ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)" }]}>
               {item.e2e ? "🔒 " : ""}{item.timestamp}
             </Text>
             {isMe && (
               <Text
                 style={[
                   styles.readReceipt,
                   item.status === 'read' ? { color: '#fff' } : { color: 'rgba(255,255,255,0.8)' }
                 ]}
               >
                 {item.status === 'read' ? '✓✓' : '✓'}
               </Text>
             )}
           </View>
        </View>
      </>
    );

    const dynamicBubbleStyle = isMe ? {
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
      borderTopRightRadius: isConsecutivePrev ? 6 : 20,
      borderBottomRightRadius: isConsecutiveNext ? 6 : 4,
    } : {
      borderTopRightRadius: 20,
      borderBottomRightRadius: 20,
      borderTopLeftRadius: isConsecutivePrev ? 6 : 20,
      borderBottomLeftRadius: isConsecutiveNext ? 6 : 4,
    };

    const openMessageMenu = (message: Message) => {
        const isOwnText =
          message.senderId === currentUserId &&
          (!message.messageType || message.messageType === "text");

        type MenuAction = "reply" | "forward" | "copy" | "save" | "pin" | "edit" | "delete" | "cancel";
        const actions: MenuAction[] = ["reply", "forward", "copy", "save", "pin"];
        if (isOwnText) actions.push("edit");
        actions.push("delete", "cancel");

        const labels: Record<MenuAction, string> = {
          reply: t("msgReply"),
          forward: t("msgForward"),
          copy: "Nusxa olish",
          save: t("msgSave"),
          pin: "Qadash",
          edit: "Tahrirlash",
          delete: t("msgDelete"),
          cancel: t("msgCancel"),
        };
        const options = actions.map((a) => labels[a]);
        const destructiveButtonIndex = actions.indexOf("delete");
        const cancelButtonIndex = actions.indexOf("cancel");

        const runAction = (action: MenuAction) => {
          switch (action) {
            case "reply":
              setEditingMessage(null);
              setReplyTo(message);
              break;
            case "forward":
              setForwardMessage(message);
              setForwardVisible(true);
              break;
            case "copy":
              void copyMessageContent(message);
              break;
            case "save":
              void openAttachment(message);
              break;
            case "pin":
              void (async () => {
                try {
                  await pinMessageRequest(chatId, message.id);
                  setPinnedMessage(message);
                } catch (e) {
                  Alert.alert(
                    t("loginErrorGeneric"),
                    e instanceof Error ? e.message : "Error"
                  );
                }
              })();
              break;
            case "edit":
              setReplyTo(null);
              setEditingMessage(message);
              setInputText(message.text || "");
              break;
            case "delete":
              Alert.alert(t("msgDelete"), message.text?.slice(0, 80) || "", [
                { text: t("msgCancel"), style: "cancel" },
                {
                  text: t("msgDelete"),
                  style: "destructive",
                  onPress: () => {
                    void (async () => {
                      try {
                        await deleteMessagesRequest(chatId, [message.id]);
                        removeMessagesLocally(chatId, [message.id]);
                      } catch (e) {
                        Alert.alert(
                          t("loginErrorGeneric"),
                          e instanceof Error ? e.message : "Error"
                        );
                      }
                    })();
                  },
                },
              ]);
              break;
            default:
              break;
          }
        };

        if (Platform.OS === "ios") {
            ActionSheetIOS.showActionSheetWithOptions(
              {
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
                title: t("msgOptions"),
              },
              (buttonIndex) => {
                const action = actions[buttonIndex];
                if (action && action !== "cancel") runAction(action);
              }
            );
        } else {
            Alert.alert(
              t("msgOptions"),
              undefined,
              actions.map((action) => ({
                text: labels[action],
                style:
                  action === "cancel"
                    ? ("cancel" as const)
                    : action === "delete"
                      ? ("destructive" as const)
                      : ("default" as const),
                onPress: action === "cancel" ? undefined : () => runAction(action),
              }))
            );
        }
    };

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow, { marginBottom: isConsecutiveNext ? 2 : 12 }]}>
        {isSelecting && (
          <Pressable
            onPress={() => toggleMessageSelected(item.id)}
            style={styles.selectCheckWrap}
            hitSlop={8}
          >
            {selectedMessageIds.includes(item.id) ? (
              <CheckCircle color="#3b82f6" size={22} />
            ) : (
              <Circle color="rgba(255,255,255,0.45)" size={22} />
            )}
          </Pressable>
        )}
        <Pressable 
          onPress={() => {
            if (isSelecting) toggleMessageSelected(item.id);
          }}
          onLongPress={() => {
            if (isSelecting) {
              toggleMessageSelected(item.id);
              return;
            }
            openMessageMenu(item);
          }}
          style={[
            styles.bubble,
            isSticker
              ? styles.stickerBubble
              : isMe
                ? styles.myBubbleBase
                : styles.otherBubbleBase,
            !isSticker && dynamicBubbleStyle,
            isSelecting && selectedMessageIds.includes(item.id) && styles.bubbleSelected,
          ]}
        >
           {bubbleBody}
           {opening && (
             <View style={[styles.mediaPlaceholder, { borderRadius: 14 }]}>
               <ActivityIndicator color="#fff" style={styles.attachmentLoading} />
             </View>
           )}
        </Pressable>
      </View>
    );
  };

  const busy = sending || uploadingFile;

  const renderChatBody = () => (
    <View style={[styles.chatBody, { paddingBottom: keyboardBottomInset }]}>
      {isLoadingChats && messages.length === 0 ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.hint}>Xabarlar yuklanmoqda...</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messagesWithHeaders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          style={styles.flex1}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
          onLayout={scrollToEnd}
          ListEmptyComponent={
            <Text style={styles.emptyList}>Hozircha xabar yo‘q — birinchi bo‘lib yozing</Text>
          }
        />
      )}
      {!isSelecting ? (
      <View style={styles.inputArea}>
        {editingMessage ? (
          <View style={styles.editBar}>
            <View style={styles.editBarAccent} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.editBarLabel}>Tahrirlash</Text>
              <Text style={styles.editBarPreview} numberOfLines={1}>
                {editingMessage.text || "…"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setEditingMessage(null);
                setInputText("");
              }}
              hitSlop={10}
              style={styles.replyBarClose}
            >
              <X color="rgba(255,255,255,0.7)" size={20} />
            </Pressable>
          </View>
        ) : replyTo ? (
          <View style={styles.replyBar}>
            <View style={styles.replyBarAccent} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.replyBarLabel}>{t("replyBarTitle")}</Text>
              <Text style={styles.replyBarPreview} numberOfLines={1}>
                {replyTo.text || "…"}
              </Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10} style={styles.replyBarClose}>
              <X color="rgba(255,255,255,0.7)" size={20} />
            </Pressable>
          </View>
        ) : null}
        {composerLocked ? (
          <View style={styles.composerLockBanner}>
            <Text style={styles.composerLockBannerText}>Xabar yozish ochilmagan</Text>
          </View>
        ) : null}
        {isRecording ? (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTimer}>
              {`${Math.floor(recordingSeconds / 60)
                .toString()
                .padStart(2, "0")}:${(recordingSeconds % 60).toString().padStart(2, "0")}`}
            </Text>
            <Text style={styles.recordingLabel}>Ovoz</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => void cancelRecording()} style={styles.recordingCancelBtn} hitSlop={8}>
              <X color="#f87171" size={22} />
            </Pressable>
            <Pressable
              onPress={() => void sendRecording()}
              style={[styles.sendButton, uploadingFile && styles.sendButtonDisabled]}
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Send color="#fff" size={20} />
              )}
            </Pressable>
          </View>
        ) : (
        <View style={styles.inputGlass}>
          <Pressable
            style={styles.attachmentButton}
            onPress={openAttachMenu}
            disabled={busy || composerLocked}
            hitSlop={8}
          >
            {uploadingFile ? (
              <ActivityIndicator color="rgba(255,255,255,0.7)" size="small" />
            ) : (
              <Paperclip color="rgba(255,255,255,0.7)" size={24} />
            )}
          </Pressable>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={editingMessage ? "Xabarni tahrilang..." : "Xabar yozing..."}
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={inputText}
              onChangeText={onChangeInput}
              multiline
              editable={!busy && !composerLocked}
            />
            <Pressable
              style={[styles.inputIcon, { marginRight: 4 }]}
              disabled={busy || composerLocked}
              onPress={() => setShowStickers(true)}
            >
              <Smile color="rgba(255,255,255,0.55)" size={24} />
            </Pressable>
          </View>
          {inputText.trim() ? (
            <Pressable
              style={[styles.sendButton, busy && styles.sendButtonDisabled]}
              onPress={() => void sendMessage()}
              disabled={busy || composerLocked}
            >
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={20} />}
            </Pressable>
          ) : (
            <Pressable
              style={[styles.sendButton, (busy || composerLocked) && styles.sendButtonDisabled]}
              onPress={() => void startRecording()}
              disabled={busy || composerLocked}
            >
              <Mic color="#fff" size={20} />
            </Pressable>
          )}
        </View>
        )}
      </View>
      ) : null}
    </View>
  );

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
      <ChatBackground isChatWindow={true}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          {isSelecting ? (
            <>
              <Pressable onPress={exitSelecting} style={styles.iconButton}>
                <X color="#fff" size={24} />
              </Pressable>
              <View style={[styles.headerTitleRow, { flex: 1 }]}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {selectedMessageIds.length} {t("chatSelectedCount")}
                </Text>
              </View>
              <Pressable
                style={[styles.iconButton, selectedMessageIds.length === 0 && { opacity: 0.4 }]}
                onPress={() => void handleCopySelected()}
                disabled={selectedMessageIds.length === 0}
              >
                <Copy color="#fff" size={22} />
              </Pressable>
              <Pressable
                style={[
                  styles.iconButton,
                  selectedMessageIds.length !== 1 && { opacity: 0.4 },
                ]}
                onPress={handleForwardSelected}
                disabled={selectedMessageIds.length !== 1}
              >
                <Forward color="#fff" size={22} />
              </Pressable>
              <Pressable
                style={[styles.iconButton, selectedMessageIds.length === 0 && { opacity: 0.4 }]}
                onPress={handleDeleteSelected}
                disabled={selectedMessageIds.length === 0}
              >
                <Trash2 color="#f87171" size={22} />
              </Pressable>
            </>
          ) : (
            <>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerTitleRow, pressed && { opacity: 0.88 }]}
            onPress={openPeerProfile}
            accessibilityRole="button"
            accessibilityLabel="Suhbatdosh haqida"
          >
            <AvatarImage uri={peerAvatar || null} name={title} size={40} />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {title}
              </Text>
              <Text
                style={[
                  styles.headerStatus,
                  (peerTyping || peerOnline) && { color: "#64b5ef" },
                ]}
                numberOfLines={1}
              >
                {headerSubtitle}
              </Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                setShowSearch((v) => {
                  if (v) {
                    setSearchQuery("");
                    setSearchType("all");
                  }
                  return !v;
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Qidiruv"
            >
              <Search color="#fff" size={20} />
            </Pressable>
            {canShowCalls && (
            <>
            <Pressable 
              style={styles.iconButton} 
              onPress={() => startCall('audio')}
            >
              <Phone color="#fff" size={20} />
            </Pressable>
            <Pressable 
              style={styles.iconButton} 
              onPress={() => startCall('video')}
            >
              <VideoIcon color="#fff" size={20} />
            </Pressable>
            </>
            )}
            {showPayHeaderBtn && (
            <Pressable 
              style={styles.iconButton}
              onPress={() => {
                if (isGroupOrChannel) {
                  if (groupInviteCandidates.length === 0) {
                    Alert.alert("Ma'lumot", "Taklif yuborish uchun ishtirokchi yo'q.");
                    return;
                  }
                  setInvitePickerVisible(true);
                  return;
                }
                if (pendingPayment) {
                   // MIJOZ HOLATI: TO'LOV QILISH
                   const amount = (pendingPayment.metadata?.serviceAmountMali || 0);
                   Alert.alert(
                     "To'lov qilish",
                     `${title} sizdan ${amount} MALI so'ramoqda. To'lov qilasizmi?`,
                     [
                       { text: "Bekor qilish", style: "cancel" },
                       { 
                         text: "Ha, to'lash", 
                         onPress: async () => {
                           try {
                              await initiateSessionRequest(pendingPayment.senderId, amount, chatId);
                              Alert.alert("Muvaffaqiyatli", "To'lov qabul qilindi");
                           } catch (e) {
                              Alert.alert("Xatolik", e instanceof Error ? e.message : "Xatolik");
                           }
                         }
                       }
                     ]
                   );
                } else if (isExpert) {
                  // EKSPERT HOLATI: TO'LOV SO'RASH (shaxsiy chat)
                  const promptTitle = "To'lov so'rash";
                  const promptMsg = "Mijozdan qancha xizmat haqi so'ramoqchisiz (MALI)?";
                  
                  const sendRequest = (amount: number) => {
                    const socket = getSocket();
                    if (socket && chatId) {
                      const expertName = useAuthStore.getState().user?.name || "Ekspert";
                      socket.emit('consult_panel_invite', {
                        chatId,
                        expertName,
                        sessionStyle: 'consult',
                        isPaymentRequest: true
                      });
                      Alert.alert("Yuborildi", `Mijozga ${amount} MALI to'lov so'rovi yuborildi.`);
                    }
                  };

                  if (Platform.OS === 'ios') {
                    Alert.prompt(
                      promptTitle,
                      promptMsg,
                      [
                        { text: "Bekor qilish", style: "cancel" },
                        {
                          text: "So'rash",
                          onPress: (val: string | undefined) => {
                            const amount = parseInt(val || "0");
                            if (amount > 0) sendRequest(amount);
                          }
                        }
                      ],
                      'plain-text',
                      '50'
                    );
                  } else {
                    Alert.alert(promptTitle, "Standart narx (50 MALI) yuborilsinmi?", [
                      { text: "Bekor qilish", style: "cancel" },
                      { text: "Yuborish (50 MALI)", onPress: () => sendRequest(50) }
                    ]);
                  }
                } else {
                  Alert.alert("Ma'lumot", "Hozircha sizga to'lov so'rovi kelmagan.");
                }
              }}
            >

              <View>
                <CreditCard color="#fff" size={22} />
                {!!pendingPayment && !isGroupOrChannel && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 10,
                    height: 10,
                    backgroundColor: '#ef4444',
                    borderRadius: 5,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.2)'
                  }} />
                )}
              </View>
            </Pressable>
            )}



            <Pressable
              style={styles.iconButton}
              onPress={() => setShowMoreMenu(true)}
              accessibilityRole="button"
              accessibilityLabel={t("menuMore")}
            >
              <MoreVertical color="#fff" size={20} />
            </Pressable>
          </View>
            </>
          )}
        </View>

        {showSearch ? (
          <View style={styles.searchBar}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Qidiruv..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              <Pressable
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchType("all");
                  setSearchDateFrom("");
                  setSearchDateTo("");
                }}
                hitSlop={10}
                style={styles.searchClose}
              >
                <X color="rgba(255,255,255,0.7)" size={20} />
              </Pressable>
            </View>
            <View style={styles.searchChips}>
              {(
                [
                  ["all", "Barchasi"],
                  ["text", "Matn"],
                  ["media", "Media"],
                  ["files", "Fayl"],
                ] as const
              ).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => setSearchType(key)}
                  style={[
                    styles.searchChip,
                    searchType === key && styles.searchChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.searchChipText,
                      searchType === key && styles.searchChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.searchDateRow}>
              <TextInput
                style={styles.searchDateInput}
                placeholder="Dan (YYYY-MM-DD)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={searchDateFrom}
                onChangeText={setSearchDateFrom}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.searchDateInput}
                placeholder="Gacha (YYYY-MM-DD)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={searchDateTo}
                onChangeText={setSearchDateTo}
                autoCapitalize="none"
              />
            </View>
          </View>
        ) : null}

        {pinnedMessage ? (
          <View style={styles.pinnedBar}>
            <Pin color="#a78bfa" size={16} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.pinnedLabel}>Qadalgan</Text>
              <Text style={styles.pinnedPreview} numberOfLines={1}>
                {pinnedMessage.text || "…"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                void (async () => {
                  try {
                    await pinMessageRequest(chatId, null);
                    setPinnedMessage(null);
                  } catch (e) {
                    Alert.alert(
                      t("loginErrorGeneric"),
                      e instanceof Error ? e.message : "Error"
                    );
                  }
                })();
              }}
              hitSlop={10}
              style={styles.replyBarClose}
            >
              <X color="rgba(255,255,255,0.7)" size={18} />
            </Pressable>
          </View>
        ) : null}

        <ChatHeaderMoreMenu
          visible={showMoreMenu}
          onClose={() => setShowMoreMenu(false)}
          topOffset={insets.top + 52}
          muted={chatMuted}
          summarizing={isSummarizing}
          showSendMali={!isGroupOrChannel && !isListingChat && !!peerInfo?.id}
          onSelect={() => {
            setIsSelecting(true);
            setSelectedMessageIds([]);
          }}
          onToggleMute={() => void handleToggleMute()}
          onSummarize={() => void handleSummarize()}
          onShowProfile={openPeerProfile}
          onExport={() => void handleExportHistory()}
          onClearHistory={handleClearHistory}
          onDeleteChat={handleDeleteChat}
          onSendMali={() => {
            setSendMaliAmount("");
            setSendMaliPin("");
            setSendMaliVisible(true);
          }}
          labels={{
            select: t("chatSelectMessages"),
            mute: t("chatMute"),
            unmute: t("chatUnmute"),
            aiSummary: t("chatAiSummary"),
            summarizing: t("chatSummarizing"),
            showProfile: t("chatShowProfile"),
            exportHistory: t("chatExportHistory"),
            clearHistory: t("chatClearHistory"),
            deleteChat: t("chatDeleteChat"),
            sendMali: "MALI yuborish",
          }}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isExpert && !isGroupOrChannel && !isListingChat ? (
          <MentorInviteBar
            chatId={chatId}
            expertName={
              (useAuthStore.getState().user as { name?: string } | null)?.name || "Ekspert"
            }
          />
        ) : null}

        {isListingChat &&
        (chatDetails?.chat_type === "expert_listing" ||
          chatDetails?.metadata?.source === "expert_listing") ? (
          <ListingDealBar
            chatId={chatId}
            currentUserId={currentUserId}
            isExpertListing
            suggestedAmount={
              Number(
                chatDetails?.metadata?.snapshot?.hourly_rate ??
                  chatDetails?.metadata?.snapshot?.service_price ??
                  100
              ) || 100
            }
          />
        ) : null}

        <View style={styles.flex1}>{renderChatBody()}</View>

        <VideoPlayerModal 
           visible={playerVisible} 
           uri={activeMediaUri} 
           onClose={() => setPlayerVisible(false)} 
        />
        <ImageViewerModal
           visible={imageVisible}
           uri={activeMediaUri}
           onClose={() => setImageVisible(false)}
        />
        <CallModal
          visible={callVisible}
          status={callStatus}
          name={title}
          callType={callType}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
          lkToken={lkToken}
          lkWsUrl={lkWsUrl}
        />
        <StickerPickerSheet
          visible={showStickers}
          onClose={() => setShowStickers(false)}
          onSelect={(sticker) => void sendSticker(sticker)}
        />
        <Modal
          visible={sendMaliVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSendMaliVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.sendMaliOverlay}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSendMaliVisible(false)} />
            <View style={styles.sendMaliCard}>
              <Text style={styles.sendMaliTitle}>MALI yuborish</Text>
              <Text style={styles.sendMaliSub} numberOfLines={1}>
                {title}
              </Text>
              <TextInput
                style={styles.sendMaliInput}
                placeholder="Summa"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="decimal-pad"
                value={sendMaliAmount}
                onChangeText={setSendMaliAmount}
              />
              <TextInput
                style={styles.sendMaliInput}
                placeholder="PIN (4 raqam)"
                placeholderTextColor="rgba(255,255,255,0.35)"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                value={sendMaliPin}
                onChangeText={setSendMaliPin}
              />
              <View style={styles.sendMaliActions}>
                <Pressable
                  style={styles.sendMaliCancel}
                  onPress={() => setSendMaliVisible(false)}
                >
                  <Text style={styles.sendMaliCancelText}>{t("msgCancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.sendMaliOk, sendMaliBusy && { opacity: 0.6 }]}
                  onPress={() => void handleSendMali()}
                  disabled={sendMaliBusy}
                >
                  {sendMaliBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendMaliOkText}>Yuborish</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        <Modal
          visible={forwardVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setForwardVisible(false)}
        >
          <View style={styles.forwardOverlay}>
            <View style={[styles.forwardSheet, { paddingBottom: insets.bottom + 12 }]}>
              <Text style={styles.forwardTitle}>{t("forwardPickChat")}</Text>
              <FlatList
                data={chats.filter((c) => c.id !== chatId)}
                keyExtractor={(c) => c.id}
                style={{ maxHeight: 360 }}
                ListEmptyComponent={
                  <Text style={styles.forwardEmpty}>Chatlar yo‘q</Text>
                }
                renderItem={({ item: c }) => (
                  <Pressable
                    style={styles.forwardRow}
                    onPress={() => {
                      void (async () => {
                        if (!forwardMessage) return;
                        try {
                          const content =
                            forwardMessage.remoteFileUrl ||
                            forwardMessage.text ||
                            "";
                          const rawType = String(forwardMessage.messageType || "text");
                          const typ =
                            rawType === "image" ||
                            rawType === "file" ||
                            rawType === "audio" ||
                            rawType === "video"
                              ? rawType
                              : rawType === "voice"
                                ? "audio"
                                : "text";
                          const saved = await sendMessageRequest(c.id, content, typ);
                          addMessageLocally(c.id, saved);
                          setForwardVisible(false);
                          setForwardMessage(null);
                          Alert.alert(t("paySuccess"), c.name);
                        } catch (e) {
                          Alert.alert(
                            t("loginErrorGeneric"),
                            e instanceof Error ? e.message : "Error"
                          );
                        }
                      })();
                    }}
                  >
                    <AvatarImage uri={c.avatarUrl || null} name={c.name} size={40} />
                    <Text style={styles.forwardName} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </Pressable>
                )}
              />
              <Pressable
                style={styles.forwardCancel}
                onPress={() => {
                  setForwardVisible(false);
                  setForwardMessage(null);
                }}
              >
                <Text style={styles.forwardCancelText}>{t("msgCancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          visible={invitePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setInvitePickerVisible(false)}
        >
          <View style={styles.forwardOverlay}>
            <View style={[styles.forwardSheet, { paddingBottom: insets.bottom + 12 }]}>
              <Text style={styles.forwardTitle}>Talabaga obuna taklifi</Text>
              <Text style={[styles.paymentLabel, { marginBottom: 12 }]}>
                Taklif talabaning shaxsiy chatiga yuboriladi
              </Text>
              <FlatList
                data={groupInviteCandidates}
                keyExtractor={(p) => String(p.id)}
                style={{ maxHeight: 360 }}
                ListEmptyComponent={
                  <Text style={styles.forwardEmpty}>Ishtirokchilar yo‘q</Text>
                }
                renderItem={({ item: p }) => {
                  const name =
                    `${p.name ?? ""} ${p.surname ?? ""}`.trim() || "Foydalanuvchi";
                  const busy = inviteSendingId === String(p.id);
                  return (
                    <Pressable
                      style={styles.forwardRow}
                      disabled={!!inviteSendingId}
                      onPress={() => void sendGroupInviteToStudent(p)}
                    >
                      <AvatarImage uri={p.avatar || null} name={name} size={40} />
                      <Text style={styles.forwardName} numberOfLines={1}>
                        {name}
                      </Text>
                      {busy ? (
                        <ActivityIndicator color="#8774e1" size="small" />
                      ) : (
                        <CreditCard color="#8774e1" size={20} />
                      )}
                    </Pressable>
                  );
                }}
              />
              <Pressable
                style={styles.forwardCancel}
                onPress={() => setInvitePickerVisible(false)}
              >
                <Text style={styles.forwardCancelText}>{t("msgCancel")}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </ChatBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  flex1: { flex: 1 },
  chatBody: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.14)",
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
    minWidth: 0,
    maxWidth: width - 100,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
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
    paddingBottom: 24,
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
    alignItems: "flex-end",
  },
  selectCheckWrap: {
    marginRight: 8,
    marginBottom: 4,
    justifyContent: "center",
  },
  bubbleSelected: {
    opacity: 0.92,
    borderWidth: 1.5,
    borderColor: "rgba(59,130,246,0.65)",
  },
  myMessageRow: {
    justifyContent: "flex-end",
  },
  otherMessageRow: {
    justifyContent: "flex-start",
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderBg: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateHeaderText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  myBubbleBase: {
    backgroundColor: "#2b5278",
    borderBottomRightRadius: 4,
  },
  otherBubbleBase: {
    backgroundColor: "#182533",
    borderBottomLeftRadius: 4,
    borderWidth: 0,
  },
  messageText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 20,
  },
  attachmentHint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 6,
  },
  attachmentLoading: {
    paddingVertical: 8,
  },
  bubbleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  mediaWrapper: {
    width: width * 0.65,
    aspectRatio: 3 / 4,
    marginBottom: 6,
    position: 'relative',
  },
  stickerWrap: {
    width: 112,
    height: 112,
    marginBottom: 2,
  },
  stickerImage: {
    width: 112,
    height: 112,
  },
  stickerBubble: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: 140,
    borderRadius: 0,
  },
  callTimerBadge: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  callTimerBadgeText: {
    color: "#fff",
    fontSize: 15,
    fontVariant: ["tabular-nums"],
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  callTimerTop: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  mediaContainer: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  mediaSaveBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 10,
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBg: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  modalCloseBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  fullScreenVideo: {
    width: '100%',
    height: Dimensions.get('window').height * 0.8,
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  videoCloudBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 18,
    gap: 8,
  },
  videoMetaCol: {
    justifyContent: 'center',
  },
  videoMetaText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  videoMetaDetail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
  },
  playIconBoxSmall: {
     position: 'absolute',
     top: '50%',
     left: '50%',
     marginTop: -25,
     marginLeft: -25,
     width: 50,
     height: 50,
     borderRadius: 25,
     backgroundColor: 'rgba(0,0,0,0.4)',
     justifyContent: 'center',
     alignItems: 'center',
     borderWidth: 1,
     borderColor: 'rgba(255,255,255,0.2)',
  },
  audioPlayerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    padding: 10,
    borderRadius: 16,
    minWidth: 220,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  audioPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pauseIcon: {
    width: 14,
    height: 14,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: '#fff',
  },
  audioInfo: {
    flex: 1,
  },
  audioFileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  audioSenderName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaVideoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 1)',
  },
  playIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 200,
  },
  fileIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fileName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileTypeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileTypeBadgeText: {
    color: '#ccc',
    fontSize: 9,
    fontWeight: 'bold',
  },
  actionText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  timestamp: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 10,
  },
  readReceipt: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  inputArea: {
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: "transparent",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  composerLockBanner: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    backgroundColor: "rgba(251, 191, 36, 0.12)",
  },
  composerLockBannerText: {
    color: "rgba(253, 230, 138, 0.95)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  sendMaliOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sendMaliCard: {
    backgroundColor: "#1e1e2e",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  sendMaliTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sendMaliSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    marginBottom: 14,
  },
  sendMaliInput: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 16,
    marginBottom: 10,
  },
  sendMaliActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  sendMaliCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  sendMaliCancelText: { color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  sendMaliOk: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#8774e1",
    alignItems: "center",
  },
  sendMaliOkText: { color: "#fff", fontWeight: "700" },
  replyBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(23, 33, 43, 0.95)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 8,
  },
  replyBarAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: "#64b5ef",
  },
  replyBarLabel: {
    color: "#64b5ef",
    fontSize: 12,
    fontWeight: "600",
  },
  replyBarPreview: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },
  replyBarClose: {
    padding: 4,
  },
  editBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(23, 33, 43, 0.95)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 8,
  },
  editBarAccent: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
    backgroundColor: "#fbbf24",
  },
  editBarLabel: {
    color: "#fbbf24",
    fontSize: 12,
    fontWeight: "600",
  },
  editBarPreview: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },
  searchBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(23, 33, 43, 0.92)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    gap: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 15,
  },
  searchChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  searchChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  searchDateRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchDateInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: "#fff",
    fontSize: 12,
  },
  searchChipActive: {
    backgroundColor: "rgba(135, 116, 225, 0.45)",
  },
  searchChipText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "600",
  },
  searchChipTextActive: {
    color: "#fff",
  },
  searchClose: {
    padding: 4,
  },
  pinnedBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(88, 28, 135, 0.35)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(167, 139, 250, 0.35)",
  },
  pinnedLabel: {
    color: "#a78bfa",
    fontSize: 11,
    fontWeight: "700",
  },
  pinnedPreview: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 1,
  },
  recordingBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(23, 33, 43, 0.95)",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
  },
  recordingTimer: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  recordingLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
  },
  recordingCancelBtn: {
    padding: 6,
    marginRight: 4,
  },
  replyQuote: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 6,
    borderRadius: 4,
  },
  replyQuoteMe: {
    borderLeftColor: "rgba(255,255,255,0.85)",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  replyQuoteOther: {
    borderLeftColor: "#64b5ef",
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  replyQuoteName: {
    color: "#64b5ef",
    fontSize: 12,
    fontWeight: "700",
  },
  replyQuoteText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  forwardOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  forwardSheet: {
    backgroundColor: "#17212b",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  forwardTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },
  forwardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  forwardName: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  forwardEmpty: {
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    paddingVertical: 24,
  },
  forwardCancel: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  forwardCancelText: {
    color: "#64b5ef",
    fontSize: 16,
    fontWeight: "600",
  },
  /** Pastki qator — fon rasmi ChatBackground orqali ko‘rinadi (shisha, blur effektiga yaqin) */
  inputGlass: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#17212b",
    borderRadius: 22,
    paddingHorizontal: 10,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 0,
    overflow: "hidden",
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
  attachmentButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#5288c1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0,
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  callModalBg: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 100,
  },
  callInfoContainer: {
    alignItems: 'center',
  },
  callName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 20,
  },
  callStatus: {
    color: '#38bdf8',
    fontSize: 18,
    marginTop: 10,
  },
  callActions: {
    flexDirection: 'row',
    gap: 40,
  },
  callBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
    elevation: 4,
  },
  callBtnIconWrap: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  joinSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
    alignSelf: 'flex-start',
  },
  joinSessionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  // --- PAYMENT CARD STYLES ---
  paymentCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    width: width * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  paymentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 12,
  },
  paymentAmountBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 10,
    borderRadius: 12,
  },
  paymentLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentValue: {
    color: '#38bdf8',
    fontSize: 18,
    fontWeight: '900',
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  payNowBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    gap: 6,
  },
  paidBadgeText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '700',
  },
  fullScreenCallContainer: {

    flex: 1,
    backgroundColor: '#0f172a',
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLargeBox: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  remoteNameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
  },
  callTimerText: {
    color: '#38bdf8',
    fontSize: 16,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  localVideoPreview: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camOffPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  callControlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 60,
  },
  callControlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#ef4444',
  },
  endCallBtn: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarLargeBoxShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  videoGrid: {
    flex: 1,
    width: '100%',
  },
  remoteVideoBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fill: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});

