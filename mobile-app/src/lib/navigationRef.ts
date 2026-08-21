import { createNavigationContainerRef } from '@react-navigation/native';

type RootStackParamList = {
  ChatDetail: {
    chatId: string;
    name: string;
    avatarUrl?: string | null;
    startCall?: "audio" | "video";
  };
};

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToChatFromNotification(chatId: string, name = 'Chat') {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('ChatDetail', {
    chatId: String(chatId),
    name,
    avatarUrl: null,
  });
}
