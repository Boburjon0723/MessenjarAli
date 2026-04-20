import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Ushbu kod bildirishnomalar app ichidagida xabar va ovoz bilan chiqishini ta'minlaydi
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // Native OS ovozini chalish
    shouldSetBadge: true,
  }),
});

export const setupNotifications = async () => {
  if (Platform.OS === 'android') {
    // Android uchun maxsus kanallar, har biri original bildirishnoma ovozidan foydalanadi
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Asosiy bildirishnomalar',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#38bdf8',
      sound: 'default', // Tizimning o'z ovozi!
    });
    
    await Notifications.setNotificationChannelAsync('wallet', {
      name: 'Hamyon to\'lovlari',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('chat', {
      name: 'Chat xabarlari',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('group', {
      name: 'Guruh va Kanallar',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  // Ruxsat so'rash (iOS va Android13+ uchun)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  return finalStatus === 'granted';
};

// Istalgan joydan chaqirish uchun yordamchi funksiya
// type: 'chat' | 'wallet' | 'group' | 'default'
export const showLocalNotification = async (title: string, body: string, type: string = 'default', data: any = {}) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true, // OS Local Sound!
      data,
    },
    trigger: null, // Darhol chiqishi uchun
  });
};
