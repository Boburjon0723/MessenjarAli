import {
  Globe,
  User,
  Wallet,
  Users,
  Radio,
  Briefcase,
  LineChart,
  Layout,
  PenSquare,
  MessageSquare,
  type LucideIcon,
} from "lucide-react-native";

export type BottomTabId = "chats" | "wallet" | "services" | "profile";

export type HeaderActionId = "expert_tools" | "compose";

/** PenSquare menyusi: kontakt / guruh / kanal / tanlash — tartib va ko‘rinish shu ro‘yxat orqali */
export type ComposeActionId = "new_contact" | "new_group" | "new_channel" | "bulk_select";

export const COMPOSE_MENU_ITEMS: {
  id: ComposeActionId;
  /** `useAuthLocale().t` kaliti */
  titleKey: "menuNewContact" | "menuNewGroup" | "menuNewChannel" | "menuSelect";
  visible?: (ctx: { isExpert: boolean }) => boolean;
}[] = [
  { id: "new_contact", titleKey: "menuNewContact" },
  { id: "new_group", titleKey: "menuNewGroup" },
  { id: "new_channel", titleKey: "menuNewChannel" },
  { id: "bulk_select", titleKey: "menuSelect" },
];

export function getVisibleComposeMenuItems(ctx: { isExpert: boolean }) {
  return COMPOSE_MENU_ITEMS.filter((item) => (item.visible ? item.visible(ctx) : true));
}

/** Menyu ikonlari — nom orqali komponent */
export const MENU_ICONS = {
  Globe,
  User,
  Wallet,
  Users,
  Radio,
  Briefcase,
  LineChart,
  Layout,
  PenSquare,
  MessageSquare,
} satisfies Record<string, LucideIcon>;

export type MenuIconName = keyof typeof MENU_ICONS;

export function getMenuIcon(name: MenuIconName): LucideIcon {
  return MENU_ICONS[name];
}

/** Chat filtrlari */
export const CHAT_CATEGORY_ITEMS: {
  id: string;
  label: string;
  icon: MenuIconName;
}[] = [
  { id: "all", label: "Hammasi", icon: "Globe" },
  { id: "user", label: "Shaxsiy", icon: "User" },
  { id: "group", label: "Guruh", icon: "Users" },
  { id: "channel", label: "Kanal", icon: "Radio" },
  { id: "finance", label: "Moliya", icon: "LineChart" },
];

/** Qidiruv qatori o‘ngidagi tugmalar */
export const HEADER_RIGHT_ACTIONS: {
  id: HeaderActionId;
  icon: MenuIconName;
  accessibilityLabel: string;
  visible: (ctx: { isExpert: boolean }) => boolean;
}[] = [
  {
    id: "expert_tools",
    icon: "Layout",
    accessibilityLabel: "Ekspert paneli",
    visible: ({ isExpert }) => isExpert,
  },
  {
    id: "compose",
    icon: "PenSquare",
    accessibilityLabel: "Yangi xabar",
    visible: () => true,
  },
];

/** Pastki navigatsiya */
export const BOTTOM_TAB_ITEMS: { id: BottomTabId; label: string; icon: MenuIconName }[] = [
  { id: "chats", label: "CHATLAR", icon: "MessageSquare" },
  { id: "wallet", label: "HAMYON", icon: "Wallet" },
  { id: "services", label: "XIZMATLAR", icon: "Briefcase" },
  { id: "profile", label: "PROFIL", icon: "User" },
];
