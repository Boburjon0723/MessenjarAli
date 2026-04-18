/**
 * Chat fonini tanlash (Sozlamalar) — lokal default + Unsplash manzaralar.
 * w=1920 — preview va fon uchun yetarli, fayl hajmi nisbatan kichik.
 */
import { DEFAULT_PLATFORM_BACKGROUND } from "./default-background";

const u = (id: string) =>
  `https://images.unsplash.com/${id}?q=80&w=1920&auto=format&fit=crop`;

export const CHAT_BACKGROUND_PRESETS: string[] = [
  DEFAULT_PLATFORM_BACKGROUND,
  u("photo-1470071459604-3b5ec3a7fe05"),
  u("photo-1501854140801-50d01698950b"),
  u("photo-1441974231531-c6227db76b6e"),
  u("photo-1464822759023-fed622ff2c3b"),
  u("photo-1506905925346-21bda4d32df4"),
  u("photo-1472214103451-9374bd1c798e"),
  u("photo-1493246507139-91e8fad9978e"),
  u("photo-1511884642898-4c92249e20b6"),
  u("photo-1500534314209-a25ddb2bd429"),
  u("photo-1418060360556-1f156c7e6343"),
  u("photo-1433838552652-f9a070b123e7"),
  u("photo-1519681393784-d120267933ba"),
  u("photo-1494500764479-0c8f2919a3d8"),
  u("photo-1518837695005-2086893ff9e8"),
  u("photo-1501785888041-af3ef285b470"),
  u("photo-1469474968028-56623f02e42e"),
  u("photo-1475924156734-496f6cac6ec1"),
  u("photo-1433086966358-54859d0ed716"),
  u("photo-1518173946681-a67cbd1b531f"),
  u("photo-1542273917363-3b1817f69a2d"),
];

