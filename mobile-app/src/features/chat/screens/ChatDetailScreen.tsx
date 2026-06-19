import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, ArrowLeft, MoreVertical, Paperclip, Smile, Phone, Video as VideoIcon, Play, Download, X, CloudDownload, Trash2, Forward, CheckCircle, Save, Mic, MicOff, VideoOff, CreditCard } from "lucide-react-native";
import { useAuthLocale } from "../../auth/locale";
import { Message } from "../types";
import { ChatBackground } from "../../../components/ChatBackground";
import { Video, ResizeMode, Audio } from 'expo-av';
import { NativeModules } from 'react-native';

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
} from "../service";
import { readMessagesFromCache, writeMessagesToCache } from "../../../lib/app-cache";
import { downloadAndOpenWithSystemSheet } from "../../../lib/files";
import { useAuthStore } from "../../auth/store";
import { AvatarImage } from "../../../components/AvatarImage";
import { setCurrentChatId, getSocket } from "../../../lib/socket";

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
}

const VideoView = ({ name, isCamOff, isMicMuted }: VideoViewProps) => {
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
             <Text style={styles.callTimerText}>{t('callConnecting')}</Text>
          </View>
        )}
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
                <VideoView name={name} isCamOff={isCamOff} isMicMuted={isMicMuted} />
              </LiveKit.LiveKitRoom>
            </View>
          ) : (
             <View style={styles.remoteVideoPlaceholder}>
                <View style={styles.avatarLargeBox}>
                   <AvatarImage name={name} size={120} />
                </View>
                <Text style={styles.remoteNameText}>{name}</Text>
                <Text style={styles.callTimerText}>{t('callConnecting')}</Text>
             </View>
          )}

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
                 <Phone color="#fff" size={28} style={{ transform: [{ rotate: '135deg' }] }} />
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
                <Pressable onPress={onReject} style={[styles.callBtn, styles.rejectBtn]}>
                   <Phone color="#fff" size={28} style={{ transform: [{ rotate: '135deg' }] }} />
                </Pressable>
                <Pressable onPress={onAccept} style={[styles.callBtn, styles.acceptBtn]}>
                   <Phone color="#fff" size={28} />
                </Pressable>
              </>
            ) : (
              <Pressable onPress={onEnd} style={[styles.callBtn, styles.rejectBtn]}>
                 <Phone color="#fff" size={28} style={{ transform: [{ rotate: '135deg' }] }} />
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
  route: { params?: { chatId?: string; name?: string; avatarUrl?: string | null } };
  navigation: {
    goBack: () => void;
    navigate: (name: string, params?: { chatId: string; name: string; avatarUrl?: string | null }) => void;
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
  const { messages: allMessages, loadMessages: syncMessages, addMessageLocally, updateMessageLocally, isLoadingChats } = useChatStore();
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

  const listRef = useRef<FlatList<Message>>(null);

  const [chatDetails, setChatDetails] = useState<ChatDetailsResponse | null>(null);
  const peerInfo = useMemo(() => {
    if (!chatDetails || !chatDetails.participants) return null;
    return chatDetails.participants.find(p => normalizeUserId(p.id) !== currentUserId);
  }, [chatDetails, currentUserId]);

  const peerSpecialization = peerInfo?.specialization || (peerInfo as any)?.profession || "";

  useEffect(() => {
    getChatDetailsRequest(chatId)
      .then(setChatDetails)
      .catch(console.error);
  }, [chatId]);

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
        
        const mChatId = String(msg.chatId).toLowerCase();
        const sChatId = String(chatId).toLowerCase();

        if (mChatId === sChatId) {
          addMessageLocally(chatId, msg);
          markChatReadRequest(chatId).catch(() => {});
          setTimeout(() => scrollToEnd(), 100);
        }
      };

      socket.on("receive_message", handleReceive);
      socket.on("messages_read", handleMessagesRead);
      socket.on("message_update", handleMessageUpdate);

      socket.on('incoming_call', (data: { from: string; name: string; signal: any; callType: string }) => {
          setCallType(data.callType === 'video' ? 'video' : 'audio');
          setCallerId(data.from);
          setCallStatus('incoming');
          setCallVisible(true);
      });
      socket.on('call_accepted', () => setCallStatus('connected'));
      socket.on('call_rejected', () => setCallVisible(false));
      socket.on('call_ended', () => setCallVisible(false));
      
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
        socket.off("receive_message", handleReceive);
        socket.off("messages_read", handleMessagesRead);
        socket.off("message_update", handleMessageUpdate);
        socket.off('incoming_call');
        socket.off('call_accepted');
        socket.off('call_rejected');
        socket.off('call_ended');
      };
    }, [chatId, syncMessages])
  );

  const [lkToken, setLkToken] = useState<string | null>(null);
  const [lkWsUrl, setLkWsUrl] = useState<string | null>(null);

  const startCall = (type: 'audio' | 'video') => {
    const socket = getSocket();
    if (!socket || !chatId) return;
    setCallType(type);
    setCallStatus('ringing');
    setCallVisible(true);
    const peerId = chatId.replace(currentUserId, '').replace('_', '');
    socket.emit('call_user', { 
        targetUserId: peerId, 
        fromName: useAuthStore.getState().user?.name || 'User',
        callType: type 
    });
  };

  const endCall = () => {
    const socket = getSocket();
    if (socket && chatId) {
        const peerId = chatId.replace(currentUserId, '').replace('_', '');
        socket.emit('end_call', { to: peerId });
    }
    setLkToken(null);
    setCallVisible(false);
  };

  const acceptCall = async () => {
    const socket = getSocket();
    const target = callerId || (peerInfo?.id ? String(peerInfo.id) : "");
    if (socket && target) {
        socket.emit('accept_call', { to: target });
        setCallStatus('connected');
        
        try {
           const username = useAuthStore.getState().user?.name || 'Mijoz';
           const data = await getLiveKitTokenRequest(chatId, username);
           if (data && data.token) {
              setLkToken(data.token);
              setLkWsUrl(data.wsUrl);
              console.log("[LiveKit] Token received:", data.token, "WS:", data.wsUrl);
           }
        } catch (e) {
           console.error("[LiveKit] Token fetch error:", e);
           Alert.alert("Xatolik", "Sessiyaga ulanishda muammo yuz berdi");
        }
    }
  };

  const rejectCall = () => {
    const socket = getSocket();
    const target = callerId || (peerInfo?.id ? String(peerInfo.id) : "");
    if (socket && target) {
        socket.emit('reject_call', { to: target });
    }
    setCallVisible(false);
    setCallerId(null);
  };

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
    try {
      const saved = await sendMessageRequest(chatId, text);
      setInputText("");
      addMessageLocally(chatId, saved);
      setTimeout(scrollToEnd, 120);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('loginErrorGeneric'));
    } finally {
      setSending(false);
    }
  };

  const pickAndSendFile = useCallback(async () => {
    if (!chatId || sending || uploadingFile) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingFile(true);
      setError(null);
      const url = await uploadChatFileRequest(
        asset.uri,
        asset.name ?? "file",
        asset.mimeType ?? "application/octet-stream"
      );
      const typ = messageTypeFromMime(asset.mimeType);
      const saved = await sendMessageRequest(chatId, url, typ);
      addMessageLocally(chatId, saved);
      setTimeout(scrollToEnd, 120);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fayl yuborilmadi");
    } finally {
      setUploadingFile(false);
    }
  }, [chatId, sending, uploadingFile, scrollToEnd]);

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

  const messagesWithHeaders = useMemo(() => {
    const result: any[] = [];
    let lastDateText = "";

    messages.forEach((m) => {
      // Hozircha oddiy 'Bugun' simulyatsiyasi.
      // Real loyihada timestamp dan haqiqiy sana olinadi.
      const dateText = t('msgToday'); 
      
      if (dateText !== lastDateText) {
        result.push({ isDateHeader: true, dateText, id: `header-${dateText}` });
        lastDateText = dateText;
      }
      result.push(m);
    });
    return result;
  }, [messages]);

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

    const isImage = item.messageType === 'image' || item.remoteFileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isVideo = item.messageType === 'video' || item.remoteFileUrl?.match(/\.(mp4|mov|avi|mkv)$/i);
    const isAudio = item.messageType === 'audio' || item.remoteFileUrl?.match(/\.(mp3|wav|ogg|m4a)$/i);
    const isMedia = isImage || isVideo;
    
    const hasRawUrlText = item.text && (item.text === item.remoteFileUrl || item.text.startsWith?.("http"));
    const displayText = hasRawUrlText ? null : item.text;
    const fileName = item.remoteFileUrl ? item.remoteFileUrl.split('/').pop()?.split('?')[0] || t('msgFile') : t('msgFile');

    const bubbleBody = (


      <>
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
        ) : hasAttachment && !isMedia ? (
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
                  setCallType('video');
                  setCallStatus('connected');
                  setCallVisible(true);
                  acceptCall();
               }}
             >
                <VideoIcon color="#fff" size={18} />
                <Text style={styles.payNowBtnText}>SUHBATGA KIRISH</Text>
             </Pressable>
          </View>
        )}


        {(item.messageType === 'consult_panel_invite' || item.type === 'consult_panel_invite' || item.type === 'lesson_start') && item.metadata?.kind !== 'payment_request' && item.metadata?.kind !== 'panel_open' && (
           <Pressable 
             style={styles.joinSessionBtn}
             onPress={() => {
                setCallType('video');
                setCallStatus('connected');
                setCallVisible(true);
                acceptCall();
             }}
           >
             <VideoIcon color="#fff" size={16} />
             <Text style={styles.joinSessionBtnText}>{t('sessionJoin')}</Text>
           </Pressable>
        )}


        <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', marginTop: isMedia && !displayText ? 0 : 2 }}>
           {displayText ? <Text style={[styles.messageText, (hasAttachment && !isMedia) && { marginTop: 8 }]}>{displayText}</Text> : null}
           <View style={[styles.bubbleFooter, displayText ? { marginLeft: 8, marginBottom: 2 } : {}]}>
             <Text style={[styles.timestamp, { color: isMe ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)" }]}>{item.timestamp}</Text>
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
        const options = [t('msgForward'), t('msgSave'), 'Select', t('msgDelete'), t('msgCancel')];
        const destructiveButtonIndex = 3;
        const cancelButtonIndex = 4;

        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
              {
                options,
                cancelButtonIndex,
                destructiveButtonIndex,
                title: t('msgOptions'),
              },
              (buttonIndex) => {
                handleMenuAction(buttonIndex, message);
              }
            );
        } else {
            // Android style simple alert for testing, ideally use a custom modal
            Alert.alert(
                "Message Options",
                "Choose action",
                [
                    { text: "Forward", onPress: () => console.log("Forward") },
                    { text: "Save to Gallery", onPress: () => void openAttachment(message) },
                    { text: "Delete", style: "destructive", onPress: () => console.log("Delete") },
                    { text: "Cancel", style: "cancel" }
                ]
            );
        }
    };

    const handleMenuAction = (index: number, message: Message) => {
        switch (index) {
            case 0: // Forward
                break;
            case 1: // Save
                void openAttachment(message);
                break;
            case 3: // Delete
                break;
        }
    };

    return (
      <View style={[styles.messageRow, isMe ? styles.myMessageRow : styles.otherMessageRow, { marginBottom: isConsecutiveNext ? 2 : 12 }]}>
        <Pressable 
          onLongPress={() => openMessageMenu(item)}
          style={[styles.bubble, isMe ? styles.myBubbleBase : styles.otherBubbleBase, dynamicBubbleStyle]}
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
      <View style={styles.inputArea}>
        <View style={styles.inputGlass}>
          <Pressable
            style={styles.attachmentButton}
            onPress={() => void pickAndSendFile()}
            disabled={busy}
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
              placeholder="Xabar yozing..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!busy}
            />
            <Pressable style={[styles.inputIcon, { marginRight: 4 }]} disabled={busy}>
              <Smile color="rgba(255,255,255,0.55)" size={24} />
            </Pressable>
          </View>
          <Pressable
            style={[styles.sendButton, (!inputText.trim() || busy) && styles.sendButtonDisabled]}
            onPress={() => void sendMessage()}
            disabled={!inputText.trim() || busy}
          >
            {sending ? <ActivityIndicator color="#fff" size="small" /> : <Send color="#fff" size={20} />}
          </Pressable>
        </View>
      </View>
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

          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerTitleRow, pressed && { opacity: 0.88 }]}
            onPress={() =>
              navigation.navigate("ChatPeerInfo", {
                chatId,
                name: title,
                avatarUrl: peerAvatar || null,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Suhbatdosh haqida"
          >
            <AvatarImage uri={peerAvatar || null} name={title} size={40} />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerName} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.headerStatus} numberOfLines={1}>
                {peerSpecialization || "online"}
              </Text>
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable 
              style={styles.iconButton} 
              onPress={() => startCall('audio')}
            >
              <Phone color="#fff" size={20} />
            </Pressable>
            <Pressable 
              style={styles.iconButton}
              onPress={() => {
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
                  // EKSPERT HOLATI: TO'LOV SO'RASH
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
                {!!pendingPayment && (
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



            <Pressable style={styles.iconButton}>
              <MoreVertical color="#fff" size={20} />
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myBubbleBase: {
    backgroundColor: "#3b82f6",
  },
  otherBubbleBase: {
    backgroundColor: "rgba(30, 41, 59, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
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
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 26,
    paddingHorizontal: 10,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
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
    backgroundColor: "rgba(59, 130, 246, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
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
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: '#22c55e',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
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

