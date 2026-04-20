import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, Globe, X } from "lucide-react-native";
import {
  AppLanguage,
  LANGUAGE_META,
  useAuthLocale,
} from "../locale";

const FLAG: Record<AppLanguage, string> = {
  uz: "🇺🇿",
  ru: "🇷🇺",
  en: "🇬🇧",
};

export function LanguagePicker() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { lang, setLang, t } = useAuthLocale();
  const [open, setOpen] = useState(false);

  const current = LANGUAGE_META.find((m) => m.code === lang);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { top: insets.top + 8 }]}
        accessibilityRole="button"
        accessibilityLabel={t("pickerTitle")}
      >
        <Globe size={18} color="rgba(255,255,255,0.95)" />
        <Text style={styles.triggerCode}>{lang.toUpperCase()}</Text>
        <Text style={styles.triggerFlag}>{FLAG[lang]}</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[styles.sheet, { maxWidth: Math.min(360, width - 32) }]}
            pointerEvents="box-none"
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t("pickerTitle")}</Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                accessibilityLabel={t("pickerClose")}
              >
                <X size={22} color="rgba(255,255,255,0.6)" />
              </Pressable>
            </View>
            <Text style={styles.currentHint}>
              {current?.native} · {current?.label}
            </Text>

            {LANGUAGE_META.map((item) => {
              const active = item.code === lang;
              return (
                <Pressable
                  key={item.code}
                  onPress={async () => {
                    await setLang(item.code);
                    setOpen(false);
                  }}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <Text style={styles.rowFlag}>{FLAG[item.code]}</Text>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowNative}>{item.native}</Text>
                  </View>
                  {active ? (
                    <Check size={20} color="#38bdf8" strokeWidth={2.5} />
                  ) : (
                    <View style={styles.radioOuter}>
                      <View style={styles.radioInner} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: "absolute",
    right: 16,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  triggerCode: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  triggerFlag: { fontSize: 16 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    backgroundColor: "rgba(15, 23, 42, 0.97)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 18,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  currentHint: {
    color: "rgba(148, 163, 184, 0.95)",
    fontSize: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  rowActive: {
    borderColor: "rgba(56, 189, 248, 0.45)",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
  },
  rowFlag: { fontSize: 22, marginRight: 12 },
  rowText: { flex: 1 },
  rowLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  rowNative: { color: "rgba(148, 163, 184, 0.9)", fontSize: 12, marginTop: 2 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "transparent",
  },
});
