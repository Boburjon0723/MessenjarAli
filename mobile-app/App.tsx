import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NativeModules } from 'react-native';

// Safe register globals
if (NativeModules.WebRTCModule) {
  try {
    const { registerGlobals } = require("@livekit/react-native-webrtc");
    registerGlobals();
  } catch (e) {
    console.warn("WebRTC registration failed:", e);
  }
}
import { AuthLocaleProvider } from "./src/features/auth/locale";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { RegisterScreen } from "./src/features/auth/screens/RegisterScreen";
import { PasscodeScreen } from "./src/features/auth/screens/PasscodeScreen";
import { ChatListScreen } from "./src/features/chat/screens/ChatListScreen";
import { ChatDetailScreen } from "./src/features/chat/screens/ChatDetailScreen";
import { SettingsScreen } from "./src/features/chat/screens/SettingsScreen";
import { ThemeDesignScreen } from "./src/features/dashboard/screens/ThemeDesignScreen";

import { ChatPeerInfoScreen } from "./src/features/chat/screens/ChatPeerInfoScreen";
import { ProfileScreen } from "./src/features/dashboard/screens/ProfileScreen";
import { WalletScreen } from "./src/features/dashboard/screens/WalletScreen";
import { LanguageSettingsScreen } from "./src/features/chat/screens/LanguageSettingsScreen";
import { DataStorageSettingsScreen } from "./src/features/chat/screens/DataStorageSettingsScreen";
import { PrivacySettingsScreen } from "./src/features/chat/screens/PrivacySettingsScreen";
import { NotificationSettingsScreen } from "./src/features/chat/screens/NotificationSettingsScreen";
import { AboutAppScreen } from "./src/features/chat/screens/AboutAppScreen";
import { SupportScreen } from "./src/features/chat/screens/SupportScreen";
import { JobListScreen } from "./src/features/jobs/screens/JobListScreen";
import { ExpertDetailScreen } from "./src/features/dashboard/screens/ExpertDetailScreen";
import { ExpenseTrackerScreen } from "./src/features/finance/ExpenseTrackerScreen";
import { setupNotifications } from "./src/lib/notifications";
import * as Notifications from 'expo-notifications';
import { navigationRef, navigateToChatFromNotification } from "./src/lib/navigationRef";
import { GlobalCallOverlay } from "./src/features/chat/components/GlobalCallOverlay";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Messages: undefined;
  ChatDetail: { chatId: string; name: string; avatarUrl?: string | null; startCall?: "audio" | "video" };
  ChatPeerInfo: { chatId: string; name: string; avatarUrl?: string | null };
  Settings: undefined;
  ThemeDesign: undefined;
  Profile: undefined;
  Wallet: undefined;
  LanguageSettings: undefined;
  DataStorageSettings: undefined;
  PrivacySettings: undefined;
  NotificationSettings: undefined;
  AboutApp: undefined;
  Support: undefined;
  Jobs: undefined;
  JobDetail: { jobId: number };
  ExpertDetail: { expertId: string; fallbackData?: any };
  Passcode: { mode: 'set' | 'unlock'; onSuccess?: () => void };
  Finance: undefined;
};





const Stack = createNativeStackNavigator<RootStackParamList>();

import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

export default function App() {
  const appState = React.useRef(AppState.currentState);
  const lockTriggered = React.useRef(false);

  React.useEffect(() => {
    setupNotifications();

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown> | undefined;
      const chatId =
        (data?.chatId as string | undefined) ??
        (data?.chat_id as string | undefined) ??
        (typeof data?.data === 'object' && data?.data != null
          ? ((data.data as Record<string, unknown>).chatId as string | undefined)
          : undefined);
      if (chatId) {
        navigateToChatFromNotification(String(chatId));
      }
    });

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Ilova fondan qaytganda agar parol bo'lsa qulflash
        const passcode = await SecureStore.getItemAsync('app_passcode_key');
        if (passcode && !lockTriggered.current) {
           // Biz bu yerda navigation elementini olishimiz qiyinligi sababli, 
           // odatda birinchi ekranni "AuthCheck" yoki "Passcode" qilish tavsiya etiladi.
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      sub.remove();
      subscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
    <AuthLocaleProvider>
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#050505" }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Messages" component={ChatListScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
        <Stack.Screen
          name="ChatPeerInfo"
          component={ChatPeerInfoScreen}
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ThemeDesign" component={ThemeDesignScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
        <Stack.Screen name="DataStorageSettings" component={DataStorageSettingsScreen} />
        <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="AboutApp" component={AboutAppScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="Jobs" component={JobListScreen} />
        <Stack.Screen name="Finance" component={ExpenseTrackerScreen} />
        <Stack.Screen name="ExpertDetail" component={ExpertDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Passcode" component={PasscodeScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />




      </Stack.Navigator>
      <GlobalCallOverlay />
    </NavigationContainer>
    </AuthLocaleProvider>
    </SafeAreaProvider>
  );
}
