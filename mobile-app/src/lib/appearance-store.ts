import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { DEFAULT_PLATFORM_BACKGROUND } from "./constants";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export type AppearanceState = {
  themeId: string;
  /** Panel / shisha effekt (web: `app-bg-blur`) */
  panelBlur: number;
  /** Fon rasmi xiraligi (web: `app-bg-image-blur`) */
  imageBlur: number;
  backgroundUri: string;
  isDarkTheme: boolean;
  setTheme: (id: string) => void;
  setPanelBlur: (v: number) => void;
  setImageBlur: (v: number) => void;
  setBackgroundUri: (uri: string) => void;
  setDarkTheme: (dark: boolean) => void;
};

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set) => ({
      themeId: "pure_dark",
      panelBlur: 8,
      imageBlur: 20,
      backgroundUri: DEFAULT_PLATFORM_BACKGROUND,
      isDarkTheme: true,
      setTheme: (id: string) => set({ themeId: id }),
      setPanelBlur: (v: number) => set({ panelBlur: clamp(Math.round(v), 0, 100) }),
      setImageBlur: (v: number) => set({ imageBlur: clamp(Math.round(v), 0, 100) }),
      setBackgroundUri: (uri: string) => set({ backgroundUri: uri }),
      setDarkTheme: (dark: boolean) => set({ isDarkTheme: dark }),
    }),

    {
      name: "app-appearance",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        themeId: s.themeId,
        panelBlur: s.panelBlur,
        imageBlur: s.imageBlur,
        backgroundUri: s.backgroundUri,
        isDarkTheme: s.isDarkTheme,
      }),

    }
  )
);

/** RN `blurRadius` uchun (iOS/Android cheklovlari) */
export function nativeImageBlurRadius(imageBlur: number): number {
  return clamp(Math.round(imageBlur * 0.45), 0, 50);
}

/** Qorong‘i qatlam — panelBlur va tema */
export function overlayOpacityFromPanelBlur(panelBlur: number, isDark: boolean): number {
  const base = 0.38 + (panelBlur / 100) * 0.32;
  return clamp(base + (isDark ? 0.12 : 0), 0.25, 0.92);
}
