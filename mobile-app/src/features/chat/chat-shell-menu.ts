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
  Menu,
  Bookmark,
  Archive,
  type LucideIcon,
} from "lucide-react-native";

export type BottomTabId = "chats" | "wallet" | "services" | "profile";

export type HeaderActionId = "more" | "expert_tools" | "compose";

/** PenSquare menyusi: kontakt / guruh / kanal / tanlash */
export type ComposeActionId = "new_contact" | "new_group" | "new_channel" | "bulk_select";

/** Chap menyu (web MessagesMenuDrawer analogi) */
export type MoreMenuActionId =
  | "saved_messages"
  | "jobs"
  | "finance"
  | "wallet"
  | "services";

export const COMPOSE_MENU_ITEMS: {
  id: ComposeActionId;
  titleKey: "menuNewContact" | "menuNewGroup" | "menuNewChannel" | "menuSelect";
  visible?: (ctx: { isExpert: boolean }) => boolean;
}[] = [
  { id: "new_contact", titleKey: "menuNewContact" },
  { id: "new_group", titleKey: "menuNewGroup" },
  { id: "new_channel", titleKey: "menuNewChannel" },
  { id: "bulk_select", titleKey: "menuSelect" },
];

export const MORE_MENU_ITEMS: {
  id: MoreMenuActionId;
  titleKey:
    | "savedMessages"
    | "menuJobs"
    | "menuFinance"
    | "tabWallet"
    | "tabServices";
}[] = [
  { id: "saved_messages", titleKey: "savedMessages" },
  { id: "jobs", titleKey: "menuJobs" },
  { id: "finance", titleKey: "menuFinance" },
  { id: "wallet", titleKey: "tabWallet" },
  { id: "services", titleKey: "tabServices" },
];

export function getVisibleComposeMenuItems(ctx: { isExpert: boolean }) {
  return COMPOSE_MENU_ITEMS.filter((item) => (item.visible ? item.visible(ctx) : true));
}

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
  Menu,
  Bookmark,
  Archive,
} satisfies Record<string, LucideIcon>;

export type MenuIconName = keyof typeof MENU_ICONS;

export function getMenuIcon(name: MenuIconName): LucideIcon {
  return MENU_ICONS[name];
}

/** Chat filtrlari — web CHAT_FOLDERS bilan mos (moliya drawerda) */
export const CHAT_CATEGORY_ITEMS: {
  id: string;
  label: string;
  icon: MenuIconName;
}[] = [
  { id: "all", label: "Hammasi", icon: "Globe" },
  { id: "user", label: "Shaxsiy", icon: "User" },
  { id: "group", label: "Guruh", icon: "Users" },
  { id: "channel", label: "Kanal", icon: "Radio" },
  { id: "archive", label: "Arxiv", icon: "Archive" },
];

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
    visible: () => false,
  },
  {
    id: "compose",
    icon: "PenSquare",
    accessibilityLabel: "Yangi xabar",
    visible: () => true,
  },
];

/** Qidiruv chapida — web ChatList hamburger */
export const HEADER_LEFT_ACTIONS: {
  id: "more";
  icon: MenuIconName;
  accessibilityLabel: string;
}[] = [
  {
    id: "more",
    icon: "Menu",
    accessibilityLabel: "Menyu",
  },
];

export const BOTTOM_TAB_ITEMS: { id: BottomTabId; label: string; icon: MenuIconName }[] = [
  { id: "chats", label: "CHATLAR", icon: "MessageSquare" },
  { id: "wallet", label: "HAMYON", icon: "Wallet" },
  { id: "services", label: "XIZMATLAR", icon: "Briefcase" },
  { id: "profile", label: "PROFIL", icon: "User" },
];
