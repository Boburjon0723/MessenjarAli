import React from "react";
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  nativeImageBlurRadius,
  overlayOpacityFromPanelBlur,
  useAppearanceStore,
} from "../lib/appearance-store";

type Props = {
  children: React.ReactNode;
  /** Qat’iy qoplamasdan oldin qo‘shimcha uslublar */
  contentStyle?: StyleProp<ViewStyle>;
};

export function ChatBackground({ children, contentStyle }: Props) {
  const imageBlur = useAppearanceStore((s) => s.imageBlur);
  const panelBlur = useAppearanceStore((s) => s.panelBlur);
  const uri = useAppearanceStore((s) => s.backgroundUri);
  const isDark = useAppearanceStore((s) => s.isDarkTheme);
  const blurR = nativeImageBlurRadius(imageBlur);
  const overlayA = overlayOpacityFromPanelBlur(panelBlur, isDark);

  return (
    <ImageBackground
      source={{ uri }}
      style={styles.bg}
      blurRadius={blurR}
      resizeMode="cover"
    >
      <View style={[styles.dim, { backgroundColor: `rgba(15, 23, 42, ${overlayA})` }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, width: "100%" },
  dim: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1 },
});
