import React from "react";
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  nativeImageBlurRadius,
  overlayOpacityFromPanelBlur,
  useAppearanceStore,
} from "../lib/appearance-store";

import { THEMES } from "../lib/constants";

type Props = {
  children: React.ReactNode;
  /** Qat’iy qoplamasdan oldin qo‘shimcha uslublar */
  contentStyle?: StyleProp<ViewStyle>;
  /** Faqat chat oynasi uchun rasm ko'rsatilsinmi? */
  isChatWindow?: boolean;
};


export function ChatBackground({ children, contentStyle, isChatWindow }: Props) {
  const imageBlur = useAppearanceStore((s) => s.imageBlur);
  const panelBlur = useAppearanceStore((s) => s.panelBlur);
  const backgroundUri = useAppearanceStore((s) => s.backgroundUri);
  const themeId = useAppearanceStore((s) => s.themeId);

  // Theme support
  const isTelegram = themeId === "telegram";
  const isPureDark = themeId === "pure_dark";
  const themeData = isPureDark ? THEMES.pure_dark : (isTelegram ? THEMES.telegram : THEMES.default);

  const blurR = nativeImageBlurRadius(imageBlur);
  const overlayA = overlayOpacityFromPanelBlur(panelBlur, themeData.isDark);

  
  // If it's a solid theme but NOT the chat window, use solid background
  const shouldUseSolidColor = (isTelegram || isPureDark) && !isChatWindow;
  
  const uri = themeId === "vibrant" || isChatWindow ? backgroundUri : themeData.background;

  // For solid colors, we use black overlay to "dim" the solid base color.
  // For image backgrounds, we use the theme color to "tint" the image.
  const overlayBaseColor = shouldUseSolidColor ? "0, 0, 0" : ((isTelegram || isPureDark) ? "14, 22, 33" : "15, 23, 42");
  const finalOverlay = `rgba(${overlayBaseColor}, ${overlayA})`;



  const content = (
    <>
      <View style={[styles.dim, { backgroundColor: finalOverlay }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </>
  );

  if (shouldUseSolidColor) {
    return (
      <View style={[styles.bg, { backgroundColor: `rgb(${overlayBaseColor})` }]}>
        {content}
      </View>
    );
  }

  return (
    <ImageBackground
      source={{ uri }}
      style={styles.bg}
      blurRadius={blurR}
      resizeMode="cover"
    >
      {content}
    </ImageBackground>
  );
}





const styles = StyleSheet.create({
  bg: { flex: 1, width: "100%" },
  dim: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1 },
});
