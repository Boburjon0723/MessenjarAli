import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ImageStyle,
} from "react-native";
import { resolveAvatarUrl } from "../features/chat/service";
import { CachedImage } from "./CachedImage";

type Props = {
  uri?: string | null;
  name: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
};

/**
 * Profil rasmi — nisbiy yo‘llar uchun `API_URL` qo‘shiladi (getFullUrl).
 */
export function AvatarImage({ uri, name, size = 48, style }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveAvatarUrl(uri);
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  const r = size / 2;

  if (!resolved || failed) {
    return (
      <View style={[styles.placeholder, { width: size, height: size, borderRadius: r }]}>
        <Text style={[styles.initial, { fontSize: Math.max(14, size * 0.38) }]}>{initial}</Text>
      </View>
    );
  }

  return (
    <CachedImage
      uri={resolved}
      style={[styles.image, { width: size, height: size, borderRadius: r }, style]}
    />
  );
}

const styles = StyleSheet.create({
  image: { overflow: "hidden" },
  placeholder: {
    backgroundColor: "rgba(59, 130, 246, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  initial: {
    color: "#fff",
    fontWeight: "800",
  },
});
