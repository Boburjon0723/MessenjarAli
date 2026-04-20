import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "app_ui_language";

export type AppLanguage = "uz" | "ru" | "en";

export const LANGUAGE_META: {
  code: AppLanguage;
  label: string;
  native: string;
}[] = [
  { code: "uz", label: "Oʻzbekcha", native: "Oʻzbek tili" },
  { code: "ru", label: "Русский", native: "Русский язык" },
  { code: "en", label: "English", native: "English" },
];

type Dict = {
  /** Login */
  loginTagline: string;
  loginTitlePrefix: string;
  loginTitleSuffix: string;
  loginSubtitle: string;
  loginCardTitle: string;
  loginCardSubtitle: string;
  loginLabelPhone: string;
  loginLabelPassword: string;
  loginPlaceholderPhone: string;
  loginPlaceholderPassword: string;
  loginRemember: string;
  loginForgot: string;
  loginSubmit: string;
  loginFooterQuestion: string;
  loginFooterRegister: string;
  loginErrorGeneric: string;
  /** Register */
  regTagline: string;
  regTitlePrefix: string;
  regTitleSuffix: string;
  regSubtitle: string;
  regCardTitle: string;
  regCardSubtitle: string;
  regPlaceholderName: string;
  regPlaceholderSurname: string;
  regLabelAge: string;
  regPlaceholderAge: string;
  regLabelPhone: string;
  regPlaceholderPhone: string;
  regLabelPassword: string;
  regPlaceholderConfirm: string;
  regBtnSubmit: string;
  regFooterQuestion: string;
  regFooterLogin: string;
  regSuccess: string;
  regShowPassword: string;
  regHidePassword: string;
  /** Picker */
  pickerTitle: string;
  pickerClose: string;
  /** Settings */
  settingsTitle: string;
  settingsAccount: string;
  settingsProfile: string;
  settingsNotif: string;
  settingsPrivacy: string;
  settingsApp: string;
  settingsTheme: string;
  settingsLang: string;
  settingsData: string;
  settingsOther: string;
  settingsAbout: string;
  settingsLogout: string;
  /** Language Screen */
  langTitle: string;
  langSection: string;
  langInfo: string;
  /** Data & Storage */
  dataTitle: string;
  dataNetwork: string;
  dataAutoDown: string;
  dataAutoDownSub: string;
  dataGallery: string;
  dataGallerySub: string;
  dataStorage: string;
  dataUsage: string;
  dataClear: string;
  /** Privacy */
  privTitle: string;
  privPrivacy: string;
  privLastSeen: string;
  privLastSeenSub: string;
  privReadReceipts: string;
  privReadReceiptsSub: string;
  privProfilePhoto: string;
  privProfilePhotoSub: string;
  privSecurity: string;
  privAppLock: string;
  privPassSet: string;
  privPassNotSet: string;
  privChangePass: string;
  privChangePassSub: string;
  priv2FA: string;
  priv2FASub: string;
  privInfoText: string;
  /** Theme */
  themeTitle: string;
  themeBlurSection: string;
  themePanelBlur: string;
  themeWallBlur: string;
  themeDark: string;
  themeWallSection: string;
  themeUpload: string;
  /** Dashboard / Wallet */
  dashWallet: string;
  dashTotalBalance: string;
  dashLocked: string;
  dashFill: string;
  dashSend: string;
  dashBuy: string;
  dashHistory: string;
  dashRecent: string;
  dashNoTxs: string;
  dashSearchPlaceholder: string;
  dashSearchHint: string;
  dashNoExperts: string;
  dashPrice: string;
  dashBook: string;
  dashMenu: string;
  /** Chat List & Tabs */
  tabChats: string;
  tabWallet: string;
  tabServices: string;
  tabProfile: string;
  catAll: string;
  catUser: string;
  catGroup: string;
  catChannel: string;
  catFinance: string;
  searchPlaceholder: string;
  searchNoResult: string;
  chatGroupLabel: string;
  chatChannelLabel: string;
  composeChatTitle: string;
  composeChatDesc: string;
  expertPanelTitle: string;
  expertPanelDesc: string;
  msgPhoto: string;
  msgVoice: string;
  msgFile: string;
  msgNoMessages: string;
  msgUser: string;
  notifAll: string;
  notifSettings: string;
  notifPreview: string;
  notifPreviewSub: string;
  notifSound: string;
  notifVibrate: string;
  aboutFull: string;
  supportHelp: string;
  supportTg: string;
  supportCall: string;
  callConnecting: string;
  callRinging: string;
  callIncoming: string;
  callConnected: string;
  callError: string;
  paymentAction: string;
  paymentOngoing: string;
  msgToday: string;
  msgSenderMe: string;
  msgLoading: string;
  msgLoaded: string;
  payConfirm: string;
  payDesc: string;
  payYes: string;
  payNo: string;
  paySuccess: string;
  paySuccessSub: string;
  sessionJoin: string;
  msgOptions: string;
  msgForward: string;
  msgSave: string;
  msgDelete: string;
  msgCancel: string;
  menuNewContact: string;
  menuNewGroup: string;
  menuNewChannel: string;
  menuSelect: string;
  tabContacts: string;
  msgNoContacts: string;
  chatSendMessage: string;
  callAccept: string;
  expertStatus: string;
  expertVerified: string;
  expertPending: string;
};

const DICTS: Record<AppLanguage, Dict> = {
  uz: {
    loginTagline: "MALI PLATFORM",
    loginTitlePrefix: "Tizimga",
    loginTitleSuffix: "Kirish",
    loginSubtitle: "Xavfsiz va tezkor muloqot platformasiga xush kelibsiz.",
    loginCardTitle: "Xush kelibsiz",
    loginCardSubtitle: "Davom etish uchun ma'lumotlarni kiriting",
    loginLabelPhone: "TELEFON RAQAM",
    loginLabelPassword: "PAROL",
    loginPlaceholderPhone: "90 123 45 67",
    loginPlaceholderPassword: "••••••••",
    loginRemember: "Eslab qolish",
    loginForgot: "Parolni unutdingizmi?",
    loginSubmit: "KIRISH",
    loginFooterQuestion: "Hisobingiz yo'qmi?",
    loginFooterRegister: "Ro'yxatdan o'tish",
    loginErrorGeneric: "Xatolik yuz berdi",
    regTagline: "MALI PLATFORM",
    regTitlePrefix: "Hisob",
    regTitleSuffix: "Yaratish",
    regSubtitle: "Platformada ro'yxatdan o'ting va muloqotni boshlang.",
    regCardTitle: "Ro'yxatdan o'tish",
    regCardSubtitle: "Shaxsiy ma'lumotlaringizni kiriting",
    regPlaceholderName: "Ism",
    regPlaceholderSurname: "Familiya",
    regLabelAge: "Yosh",
    regPlaceholderAge: "24",
    regLabelPhone: "Telefon raqam",
    regPlaceholderPhone: "90 123 45 67",
    regLabelPassword: "Parol",
    regPlaceholderConfirm: "Parolni tasdiqlash",
    regBtnSubmit: "Ro'yxatdan o'tish",
    regFooterQuestion: "Allaqachon hisobingiz bormi?",
    regFooterLogin: "Kirish",
    regSuccess: "Muvaffaqiyatli! Yo'naltirilmoqda...",
    regShowPassword: "Ko'rsatish",
    regHidePassword: "Yashirish",
    pickerTitle: "Interfeys tili",
    pickerClose: "Yopish",
    settingsTitle: "Sozlamalar",
    settingsAccount: "AKKAUNT",
    settingsProfile: "Profil ma'lumotlari",
    settingsNotif: "Bildirishnomalar",
    settingsPrivacy: "Maxfiylik va xavfsizlik",
    settingsApp: "ILOVA SOZLAMALARI",
    settingsTheme: "Mavzu va dizayn",
    settingsLang: "Til",
    settingsData: "Ma'lumotlar va xotira",
    settingsOther: "BOSHQALAR",
    settingsAbout: "Ilova haqida",
    settingsLogout: "Tizimdan chiqish",
    langTitle: "Til",
    langSection: "ILOVA TILI",
    langInfo: "Ilova tilini o'zgartirish tizimning barcha matnlariga ta'sir qiladi.",
    dataTitle: "Ma'lumotlar va xotira",
    dataNetwork: "TARMOQDAN FOYDALANISH",
    dataAutoDown: "Avtomatik yuklab olish",
    dataAutoDownSub: "Media fayllarni avtomatik saqlash",
    dataGallery: "Galereyaga saqlash",
    dataGallerySub: "Rasmlarni telefon xotirasiga yozish",
    dataStorage: "XOTIRA",
    dataUsage: "Ilova egallagan joy",
    dataClear: "Keshni tozalash",
    privTitle: "Maxfiylik va xavfsizlik",
    privPrivacy: "MAXFIYLIK",
    privLastSeen: "Oxirgi ko'rilgan",
    privLastSeenSub: "Online vaqtini ko'rsatish",
    privReadReceipts: "O'qilganlik (✓✓)",
    privReadReceiptsSub: "Xabarlar o'qilganini bildirish",
    privProfilePhoto: "Profil rasmi",
    privProfilePhotoSub: "Hamma ko'ra olishi",
    privSecurity: "XAVFSIZLIK",
    privAppLock: "Ekran paroli",
    privPassSet: "Ilova qulflangan",
    privPassNotSet: "Parol o'rnatilmagan",
    privChangePass: "Parolni o'zgartirish",
    privChangePassSub: "Akkaunt xavfsizligini oshirish",
    priv2FA: "Ikki bosqichli tekshiruv",
    priv2FASub: "Qo'shimcha himoya qatlami",
    privInfoText: "Ushbu sozlamalar sizning shaxsiy ma'lumotlaringiz boshqalar tomonidan qanday ko'rinishini belgilaydi.",
    themeTitle: "Mavzu va dizayn",
    themeBlurSection: "Xiralik sozlamalari",
    themePanelBlur: "PANEL XIRALIGI",
    themeWallBlur: "FON RASM XIRALIGI",
    themeDark: "Qorong'u mavzu",
    themeWallSection: "Fon rasmini almashtirish",
    themeUpload: "YUKLASH",
    dashWallet: "Hamyon",
    dashTotalBalance: "UMUMIY BALANS",
    dashLocked: "Muzlatilgan",
    dashFill: "TO'LDIRISH",
    dashSend: "YUBORISH",
    dashBuy: "SOTIB OLISH",
    dashHistory: "TARIX",
    dashRecent: "OXIRGI AMALLAR",
    dashNoTxs: "Tranzaksiyalar mavjud emas",
    dashSearchPlaceholder: "Mutaxassis qidirish...",
    dashSearchHint: "Mutaxassis topish uchun ism yoki profillarni yozing.",
    dashNoExperts: "Mutaxassis topilmadi",
    dashPrice: "NARX",
    dashBook: "BAND QILISH",
    dashMenu: "MENYU",
    tabChats: "CHATLAR",
    tabWallet: "HAMYON",
    tabServices: "XIZMATLAR",
    tabProfile: "PROFIL",
    catAll: "Hammasi",
    catUser: "Shaxsiy",
    catGroup: "Guruh",
    catChannel: "Kanal",
    catFinance: "Moliya",
    searchPlaceholder: "Qidiruv...",
    searchNoResult: "Natija topilmadi",
    chatGroupLabel: "Guruh",
    chatChannelLabel: "Kanal",
    composeChatTitle: "Yangi chat",
    composeChatDesc: "Kontaktlar va yangi suhbat tez orada qo'shiladi.",
    expertPanelTitle: "Ekspert paneli",
    expertPanelDesc: "Tez orada.",
    msgPhoto: "📷 Rasm",
    msgVoice: "🎤 Ovozli xabar",
    msgFile: "📎 Fayl",
    msgNoMessages: "Xabarlar yo'q",
    msgUser: "Foydalanuvchi",
    notifAll: "Barcha bildirishnomalar",
    notifSettings: "Xabar sozlamalari",
    notifPreview: "Xabar prevyusi",
    notifPreviewSub: "Xabarni bildirishnomada ko'rsatish",
    notifSound: "Ovozli bildirishnoma",
    notifVibrate: "Vibratsiya",
    aboutFull: "ExpertLine — bu mutaxassislar va mijozlarni real vaqt rejimida bog'lovchi innovatsion platformadir. Ilova orqali siz: \n\n• Turli soha mutaxassislari bilan video-aloqa (LiveKit) orqali maslahat olishingiz;\n• Xavfsiz chat tizimidan foydalangan holda muloqot qilishingiz;\n• MALI raqamli valyutasi orqali xizmatlar uchun tezkor to'lovlarni amalga oshirishingiz;\n• O'z hamyoningizni boshqarishingiz va tranzaksiyalar tarixini kuzatishingiz mumkin.\n\nBizning maqsadimiz — masofaviy xizmat ko'rsatishni xavfsiz va qulay qilishdir.",
    supportHelp: "Yordam markazi",
    supportTg: "Telegram orqali bog'lanish",
    supportCall: "Qo'ng'iroq qilish",
    callConnecting: "Ulanish...",
    callRinging: "Qo'ng'iroq qilinmoqda...",
    callIncoming: "Kiruvchi qo'ng'iroq",
    callConnected: "Ulandi",
    callError: "Aloqada xatolik",
    paymentAction: "To'lov qilish",
    paymentOngoing: "Sessiya boshlangan",
    msgToday: "Bugun",
    msgSenderMe: "Men",
    msgLoading: "Yuklanmoqda...",
    msgLoaded: "Yuklangan",
    payConfirm: "To'lovni tasdiqlang",
    payDesc: "miqdorida xizmat haqqini to'laysizmi? Pul uchrashuv yakunlanguncha muzlatib qo'yiladi.",
    payYes: "Ha, to'lash",
    payNo: "Yo'q",
    paySuccess: "Muvaffaqiyatli",
    paySuccessSub: "To'lov amalga oshirildi. Endi sessiyaga qo'shilishingiz mumkin.",
    sessionJoin: "Sessiyaga ulanish",
    msgOptions: "Xabar sozlamalari",
    msgForward: "Boshqaga yuborish",
    msgSave: "Galereyaga saqlash",
    msgDelete: "O'chirish",
    msgCancel: "Bekor qilish",
    menuNewContact: "Kontakt yaratish",
    menuNewGroup: "Guruh yaratish",
    menuNewChannel: "Kanal yaratish",
    menuSelect: "Xabarlarni belgilash",
    tabContacts: "KONTAKTLAR",
    msgNoContacts: "Kontaktlar topilmadi",
    chatSendMessage: "Xabar yuborish",
    callAccept: "Qo'ng'iroq",
    expertStatus: "Mutaxassislik holati",
    expertVerified: "Tasdiqlangan",
    expertPending: "Kutilmoqda",
  },
  ru: {
    loginTagline: "MALI PLATFORM",
    loginTitlePrefix: "Вход в",
    loginTitleSuffix: "систему",
    loginSubtitle: "Безопасная и быстрая платформа для общения.",
    loginCardTitle: "Добро пожаловать",
    loginCardSubtitle: "Введите данные для продолжения",
    loginLabelPhone: "ТЕЛЕФОН",
    loginLabelPassword: "ПАРОЛЬ",
    loginPlaceholderPhone: "90 123 45 67",
    loginPlaceholderPassword: "••••••••",
    loginRemember: "Запомнить меня",
    loginForgot: "Забыли пароль?",
    loginSubmit: "ВОЙТИ",
    loginFooterQuestion: "Нет аккаунта?",
    loginFooterRegister: "Регистрация",
    loginErrorGeneric: "Произошла ошибка",
    regTagline: "MALI PLATFORM",
    regTitlePrefix: "Создать",
    regTitleSuffix: "аккаунт",
    regSubtitle: "Зарегистрируйтесь и начните общение.",
    regCardTitle: "Регистрация",
    regCardSubtitle: "Введите личные данные",
    regPlaceholderName: "Имя",
    regPlaceholderSurname: "Фамилия",
    regLabelAge: "Возраст",
    regPlaceholderAge: "24",
    regLabelPhone: "Телефон",
    regPlaceholderPhone: "90 123 45 67",
    regLabelPassword: "Пароль",
    regPlaceholderConfirm: "Подтвердите пароль",
    regBtnSubmit: "Зарегистрироваться",
    regFooterQuestion: "Уже есть аккаунт?",
    regFooterLogin: "Войти",
    regSuccess: "Успешно! Перенаправление...",
    regShowPassword: "Показать",
    regHidePassword: "Скрыть",
    pickerTitle: "Язык интерфейса",
    pickerClose: "Закрыть",
    settingsTitle: "Настройки",
    settingsAccount: "АККАУНТ",
    settingsProfile: "Информация профиля",
    settingsNotif: "Уведомления",
    settingsPrivacy: "Конфиденциальность и безопасность",
    settingsApp: "НАСТРОЙКИ ПРИЛОЖЕНИЯ",
    settingsTheme: "Тема и дизайн",
    settingsLang: "Язык",
    settingsData: "Данные и память",
    settingsOther: "ПРОЧЕЕ",
    settingsAbout: "О приложении",
    settingsLogout: "Выйти из системы",
    langTitle: "Язык",
    langSection: "ЯЗЫК ПРИЛОЖЕНИЯ",
    langInfo: "Изменение языка приложения повлияет на все тексты системы.",
    dataTitle: "Данные и память",
    dataNetwork: "ИСПОЛЬЗОВАНИЕ СЕТИ",
    dataAutoDown: "Автоматическая загрузка",
    dataAutoDownSub: "Автоматическое сохранение медиафайлов",
    dataGallery: "Сохранить в галерею",
    dataGallerySub: "Сохранять фотографии в память телефона",
    dataStorage: "ПАМЯТЬ",
    dataUsage: "Место, занимаемое приложением",
    dataClear: "Очистить кэш",
    privTitle: "Конфиденциальность и безопасность",
    privPrivacy: "КОНФИДЕНЦИАЛЬНОСТЬ",
    privLastSeen: "Последнее посещение",
    privLastSeenSub: "Показывать время онлайн",
    privReadReceipts: "Отчеты о прочтении (✓✓)",
    privReadReceiptsSub: "Уведомлять о прочтении сообщений",
    privProfilePhoto: "Фото профиля",
    privProfilePhotoSub: "Видимость для всех",
    privSecurity: "БЕЗОПАСНОСТЬ",
    privAppLock: "Пароль экрана",
    privPassSet: "Приложение заблокировано",
    privPassNotSet: "Пароль не установлен",
    privChangePass: "Изменить пароль",
    privChangePassSub: "Повысить безопасность аккаунта",
    priv2FA: "Двухфакторная проверка",
    priv2FASub: "Дополнительный уровень защиты",
    privInfoText: "Эти настройки определяют, как ваши личные данные видны другим.",
    themeTitle: "Тема и дизайн",
    themeBlurSection: "Настройки размытия",
    themePanelBlur: "РАЗМЫТИЕ ПАНЕЛИ",
    themeWallBlur: "РАЗМЫТИЕ ОБОЕВ",
    themeDark: "Темная тема",
    themeWallSection: "Смена обоев",
    themeUpload: "ЗАГРУЗИТЬ",
    dashWallet: "Кошелек",
    dashTotalBalance: "ОБЩИЙ БАЛАНС",
    dashLocked: "Заморожено",
    dashFill: "ПОПОЛНИТЬ",
    dashSend: "ОТПРАВИТЬ",
    dashBuy: "КУПИТЬ",
    dashHistory: "ИСТОРИЯ",
    dashRecent: "ПОСЛЕДНИЕ ОПЕРАЦИИ",
    dashNoTxs: "Транзакции отсутствуют",
    dashSearchPlaceholder: "Поиск специалиста...",
    dashSearchHint: "Введите имя или профиль, чтобы найти специалиста.",
    dashNoExperts: "Специалист не найден",
    dashPrice: "ЦЕНА",
    dashBook: "ЗАБРОНИРОВАТЬ",
    dashMenu: "МЕНЮ",
    tabChats: "ЧАТЫ",
    tabWallet: "КОШЕЛЕК",
    tabServices: "УСЛУГИ",
    tabProfile: "ПРОФИЛЬ",
    catAll: "Все",
    catUser: "Личные",
    catGroup: "Группы",
    catChannel: "Каналы",
    catFinance: "Финансы",
    searchPlaceholder: "Поиск...",
    searchNoResult: "Результатов не найдено",
    chatGroupLabel: "Группа",
    chatChannelLabel: "Канал",
    composeChatTitle: "Новый чат",
    composeChatDesc: "Контакты и новые беседы появятся в ближайшее время.",
    expertPanelTitle: "Панель эксперта",
    expertPanelDesc: "Скоро в приложении.",
    msgPhoto: "📷 Фото",
    msgVoice: "🎤 Голосовое сообщение",
    msgFile: "📎 Файл",
    msgNoMessages: "Сообщений нет",
    msgUser: "Пользователь",
    notifAll: "Все уведомления",
    notifSettings: "Настройки сообщений",
    notifPreview: "Предпросмотр",
    notifPreviewSub: "Показывать текст в уведомлении",
    notifSound: "Звук",
    notifVibrate: "Вибрация",
    aboutFull: "ExpertLine — это инновационная платформа, соединяющая экспертов и клиентов в режиме реального времени. С помощью приложения вы можете: \n\n• Получать консультации специалистов через видеосвязь (LiveKit);\n• Общаться в безопасном чате;\n• Совершать мгновенные платежи за услуги в цифровой валюте MALI;\n• Управлять своим кошельком и отслеживать историю транзакций.\n\nНаша цель — сделать дистанционные услуги безопасными и доступными.",
    supportHelp: "Центр поддержки",
    supportTg: "Связаться через Telegram",
    supportCall: "Позвонить нам",
    callConnecting: "Подключение...",
    callRinging: "Идет звонок...",
    callIncoming: "Входящий звонок",
    callConnected: "Подключено",
    callError: "Ошибка связи",
    paymentAction: "Оплатить",
    paymentOngoing: "Сессия началась",
    msgToday: "Сегодня",
    msgSenderMe: "Я",
    msgLoading: "Загрузка...",
    msgLoaded: "Загружено",
    payConfirm: "Подтвердите оплату",
    payDesc: "вы хотите оплатить за услугу? Сумма будет заморожена до конца встречи.",
    payYes: "Да, оплатить",
    payNo: "Нет",
    paySuccess: "Успешно",
    paySuccessSub: "Оплата прошла. Теперь вы можете присоединиться к сессии.",
    sessionJoin: "Присоединиться",
    msgOptions: "Опции сообщения",
    msgForward: "Переслать",
    msgSave: "Сохранить в галерею",
    msgDelete: "Удалить",
    msgCancel: "Отмена",
    menuNewContact: "Создать контакт",
    menuNewGroup: "Создать группу",
    menuNewChannel: "Создать канал",
    menuSelect: "Выбрать чаты",
    tabContacts: "КОНТАКТЫ",
    msgNoContacts: "Контакты не найдены",
    chatSendMessage: "Отправить сообщение",
    callAccept: "Позвонить",
    expertStatus: "Статус специалиста",
    expertVerified: "Подтвержден",
    expertPending: "В ожидании",
  },
  en: {
    loginTagline: "MALI PLATFORM",
    loginTitlePrefix: "Sign",
    loginTitleSuffix: "In",
    loginSubtitle: "Welcome to a secure, fast communication platform.",
    loginCardTitle: "Welcome",
    loginCardSubtitle: "Enter your details to continue",
    loginLabelPhone: "PHONE",
    loginLabelPassword: "PASSWORD",
    loginPlaceholderPhone: "90 123 45 67",
    loginPlaceholderPassword: "••••••••",
    loginRemember: "Remember me",
    loginForgot: "Forgot password?",
    loginSubmit: "SIGN IN",
    loginFooterQuestion: "No account?",
    loginFooterRegister: "Register",
    loginErrorGeneric: "Something went wrong",
    regTagline: "MALI PLATFORM",
    regTitlePrefix: "Create",
    regTitleSuffix: "Account",
    regSubtitle: "Sign up and start communicating.",
    regCardTitle: "Sign up",
    regCardSubtitle: "Enter your personal details",
    regPlaceholderName: "First name",
    regPlaceholderSurname: "Last name",
    regLabelAge: "Age",
    regPlaceholderAge: "24",
    regLabelPhone: "Phone",
    regPlaceholderPhone: "90 123 45 67",
    regLabelPassword: "Password",
    regPlaceholderConfirm: "Confirm password",
    regBtnSubmit: "Create account",
    regFooterQuestion: "Already have an account?",
    regFooterLogin: "Sign in",
    regSuccess: "Success! Redirecting...",
    regShowPassword: "Show",
    regHidePassword: "Hide",
    pickerTitle: "Interface language",
    pickerClose: "Close",
    settingsTitle: "Settings",
    settingsAccount: "ACCOUNT",
    settingsProfile: "Profile Information",
    settingsNotif: "Notifications",
    settingsPrivacy: "Privacy and Security",
    settingsApp: "APP SETTINGS",
    settingsTheme: "Theme and Design",
    settingsLang: "Language",
    settingsData: "Data and Storage",
    settingsOther: "OTHER",
    settingsAbout: "About App",
    settingsLogout: "Log Out",
    langTitle: "Language",
    langSection: "APP LANGUAGE",
    langInfo: "Changing the app language will affect all system texts.",
    dataTitle: "Data and Storage",
    dataNetwork: "NETWORK USAGE",
    dataAutoDown: "Auto Download",
    dataAutoDownSub: "Automatically save media files",
    dataGallery: "Save to Gallery",
    dataGallerySub: "Save photos to phone storage",
    dataStorage: "STORAGE",
    dataUsage: "Space used by app",
    dataClear: "Clear Cache",
    privTitle: "Privacy and Security",
    privPrivacy: "PRIVACY",
    privLastSeen: "Last Seen",
    privLastSeenSub: "Show online status",
    privReadReceipts: "Read Receipts (✓✓)",
    privReadReceiptsSub: "Notify when messages are read",
    privProfilePhoto: "Profile Photo",
    privProfilePhotoSub: "Visibility for everyone",
    privSecurity: "SECURITY",
    privAppLock: "Screen Lock",
    privPassSet: "App Locked",
    privPassNotSet: "Password not set",
    privChangePass: "Change Password",
    privChangePassSub: "Increase account security",
    priv2FA: "Two-Step Verification",
    priv2FASub: "Additional layer of protection",
    privInfoText: "These settings determine how your personal data is visible to others.",
    themeTitle: "Theme and Design",
    themeBlurSection: "Blur Settings",
    themePanelBlur: "PANEL BLUR",
    themeWallBlur: "WALLPAPER BLUR",
    themeDark: "Dark Mode",
    themeWallSection: "Change Wallpaper",
    themeUpload: "UPLOAD",
    dashWallet: "Wallet",
    dashTotalBalance: "TOTAL BALANCE",
    dashLocked: "Locked",
    dashFill: "TOP UP",
    dashSend: "SEND",
    dashBuy: "BUY",
    dashHistory: "HISTORY",
    dashRecent: "RECENT TRANSACTIONS",
    dashNoTxs: "No transactions found",
    dashSearchPlaceholder: "Search expert...",
    dashSearchHint: "Type name or profile to find an expert.",
    dashNoExperts: "No expert found",
    dashPrice: "PRICE",
    dashBook: "BOOK NOW",
    dashMenu: "MENU",
    tabChats: "CHATS",
    tabWallet: "WALLET",
    tabServices: "SERVICES",
    tabProfile: "PROFILE",
    catAll: "All",
    catUser: "Private",
    catGroup: "Groups",
    catChannel: "Channels",
    catFinance: "Finance",
    searchPlaceholder: "Search...",
    searchNoResult: "No results found",
    chatGroupLabel: "Group",
    chatChannelLabel: "Channel",
    composeChatTitle: "New Chat",
    composeChatDesc: "Contacts and new chats will be added soon.",
    expertPanelTitle: "Expert Panel",
    expertPanelDesc: "Coming soon.",
    msgPhoto: "📷 Photo",
    msgVoice: "🎤 Voice message",
    msgFile: "📎 File",
    msgNoMessages: "No messages",
    msgUser: "User",
    notifAll: "All Notifications",
    notifSettings: "Message Settings",
    notifPreview: "Message Preview",
    notifPreviewSub: "Show text in notification",
    notifSound: "Sound",
    notifVibrate: "Vibration",
    aboutFull: "ExpertLine is an innovative platform connecting experts and clients in real-time. With the app, you can: \n\n• Get expert consultations via high-quality video (LiveKit);\n• Communicate in a highly secure chat environment;\n• Make instant payments for services using MALI digital currency;\n• Manage your wallet and track transaction history.\n\nOur mission is to make remote professional services safe and accessible for everyone.",
    supportHelp: "Help Center",
    supportTg: "Contact via Telegram",
    supportCall: "Call Support",
    callConnecting: "Connecting...",
    callRinging: "Ringing...",
    callIncoming: "Incoming Call",
    callConnected: "Connected",
    callError: "Connection Error",
    paymentAction: "Make Payment",
    paymentOngoing: "Session Ongoing",
    msgToday: "Today",
    msgSenderMe: "Me",
    msgLoading: "Loading...",
    msgLoaded: "Loaded",
    payConfirm: "Confirm Payment",
    payDesc: "do you want to pay for the service? The amount will be frozen until the end of the meeting.",
    payYes: "Yes, pay",
    payNo: "No",
    paySuccess: "Success",
    paySuccessSub: "Payment completed. You can now join the session.",
    sessionJoin: "Join Session",
    msgOptions: "Message Options",
    msgForward: "Forward",
    msgSave: "Save to Gallery",
    msgDelete: "Delete",
    msgCancel: "Cancel",
    menuNewContact: "New Contact",
    menuNewGroup: "New Group",
    menuNewChannel: "New Channel",
    menuSelect: "Select Chats",
    tabContacts: "CONTACTS",
    msgNoContacts: "No contacts found",
    chatSendMessage: "Send Message",
    callAccept: "Call",
    expertStatus: "Expert Status",
    expertVerified: "Verified",
    expertPending: "Pending",
  },
};

type AuthLocaleContextValue = {
  lang: AppLanguage;
  setLang: (l: AppLanguage) => Promise<void>;
  t: (key: keyof Dict) => string;
};

const AuthLocaleContext = createContext<AuthLocaleContextValue | null>(null);

export function AuthLocaleProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>("uz");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && (raw === "uz" || raw === "ru" || raw === "en")) {
          setLangState(raw);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLang = useCallback(async (l: AppLanguage) => {
    setLangState(l);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: keyof Dict) => {
      return DICTS[lang][key] ?? String(key);
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, setLang, t }),
    [lang, setLang, t]
  );

  return (
    <AuthLocaleContext.Provider value={value}>{children}</AuthLocaleContext.Provider>
  );
}

export function useAuthLocale(): AuthLocaleContextValue {
  const ctx = useContext(AuthLocaleContext);
  if (!ctx) {
    throw new Error("useAuthLocale must be used within AuthLocaleProvider");
  }
  return ctx;
}

/** Login/Register tashqarisida — xatolikni oldini olish */
export function useAuthLocaleOptional(): AuthLocaleContextValue | null {
  return useContext(AuthLocaleContext);
}
