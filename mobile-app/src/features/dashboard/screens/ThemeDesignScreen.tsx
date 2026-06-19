import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground,
  Image,
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, Check, Moon, Zap, Send, Image as ImageIcon } from "lucide-react-native";


import { useAppearanceStore } from "../../../lib/appearance-store";
import { THEMES, BACKGROUND_PRESETS } from "../../../lib/constants";


const { width } = Dimensions.get("window");

export function ThemeDesignScreen({ navigation }: any) {
  const { 
    themeId, setTheme, 
    isDarkTheme, setDarkTheme, 
    backgroundUri, setBackgroundUri,
    imageBlur, setImageBlur,
    panelBlur, setPanelBlur
  } = useAppearanceStore();

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });


    if (!result.canceled && result.assets && result.assets.length > 0) {
      setBackgroundUri(result.assets[0].uri);
    }
  };




  const themes = [
    {
      id: "vibrant",
      name: "Vibrant Glass",
      desc: "Shaffof dizayn va neon ranglar",
      icon: <Zap color="#0ea5e9" size={20} />,
      bg: THEMES.default.background,
    },
    {
      id: "telegram",
      name: "Telegram Style",
      desc: "Klassik messenjer ko'rinishi",
      icon: <Send color="#38bdf8" size={20} />,
      bg: THEMES.telegram.background,
    },
    {
      id: "pure_dark",
      name: "Telegram Dark",
      desc: "Tungi messenjer ko'rinishi",
      icon: <Moon color="#38bdf8" size={20} />,
      bg: THEMES.pure_dark.background,
    },

  ];


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Dizayn va Mavzular</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>ASOSIY MAVZU</Text>
        
        {themes.map((t) => {
          const active = themeId === t.id;
          return (
            <Pressable 
              key={t.id} 
              style={[styles.themeCard, active && styles.themeCardActive]}
              onPress={() => setTheme(t.id)}
            >
              <ImageBackground source={{ uri: t.bg }} style={styles.themePreview} blurRadius={t.id === "vibrant" ? 10 : 0}>
                <View style={[styles.themeOverlay, { backgroundColor: t.id === "telegram" ? "rgba(14, 22, 33, 0.6)" : "rgba(15, 23, 42, 0.4)" }]} />
                {active && (
                  <View style={styles.checkBadge}>
                    <Check color="#fff" size={16} />
                  </View>
                )}
              </ImageBackground>
              <View style={styles.themeInfo}>
                <View style={styles.themeTitleRow}>
                  {t.icon}
                  <Text style={styles.themeName}>{t.name}</Text>
                </View>
                <Text style={styles.themeDesc}>{t.desc}</Text>
              </View>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>EFFEKTLAR</Text>

        <View style={styles.sliderSection}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Fonni xiralashtirish</Text>
            <Text style={styles.labelValue}>{Math.round(imageBlur)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={imageBlur}
            onValueChange={setImageBlur}
            minimumTrackTintColor="#0ea5e9"
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor="#fff"
          />
        </View>

        <View style={styles.sliderSection}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Panel shaffofligi</Text>
            <Text style={styles.labelValue}>{Math.round(panelBlur)}%</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            value={panelBlur}
            onValueChange={setPanelBlur}
            minimumTrackTintColor="#0ea5e9"
            maximumTrackTintColor="rgba(255,255,255,0.1)"
            thumbTintColor="#fff"
          />
        </View>


        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>CHAT FONINI TANLASH</Text>
          <Pressable style={styles.pickButton} onPress={handlePickImage}>
            <ImageIcon color="#0ea5e9" size={16} />
            <Text style={styles.pickButtonText}>Galereyadan</Text>
          </Pressable>
        </View>


        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsList}>
          {BACKGROUND_PRESETS.map((uri, idx) => {
            const isSelected = backgroundUri === uri;
            return (
              <Pressable 
                key={idx} 
                style={[styles.presetCard, isSelected && styles.presetCardActive]}
                onPress={() => setBackgroundUri(uri)}
              >
                 <Image source={{ uri }} style={styles.presetImage} />
                 {isSelected && (
                   <View style={styles.presetCheck}>
                     <Check color="#fff" size={12} />
                   </View>
                 )}
              </Pressable>
            );
          })}
        </ScrollView>



        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Yangi mavzuni tanlaganingizda ilova fonlari va umumiy ranglar sxemasi avtomatik ravishda moslashadi.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: { color: "#fff" , fontSize: 16, fontWeight: "800", letterSpacing: 0.5 },
  scrollContent: { padding: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "900", letterSpacing: 1.5, marginBottom: 0 },
  pickButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(14, 165, 233, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.2)' },
  pickButtonText: { color: '#0ea5e9', fontSize: 12, fontWeight: '700' },
  themeCard: {

    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 24,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
  },
  themeCardActive: {
    borderColor: "#0ea5e9",
    backgroundColor: "rgba(14, 165, 233, 0.05)",
  },
  themePreview: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  themeOverlay: { ...StyleSheet.absoluteFillObject },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  themeInfo: { flex: 1, marginLeft: 16 },
  themeTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  themeName: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  themeDesc: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  modeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", marginRight: 15 },
  modeTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modeDesc: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 2 },
  toggle: { width: 48, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.1)", padding: 2 },
  toggleActive: { backgroundColor: "#0ea5e9" },
  toggleDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  toggleDotActive: { alignSelf: "flex-end" },

  sliderSection: { 
    backgroundColor: "rgba(255,255,255,0.05)", 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.08)" 
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { color: "#fff", fontSize: 14, fontWeight: "600" },
  labelValue: { color: "#0ea5e9", fontSize: 14, fontWeight: "bold" },
  slider: { width: '100%', height: 40 },
  
  presetsList: { marginTop: 5 },

  presetCard: { 
    width: 60, 
    height: 80, 
    borderRadius: 12, 
    marginRight: 12, 
    borderWidth: 2, 
    borderColor: "transparent", 
    overflow: "hidden", 
    position: 'relative' 
  },
  presetCardActive: { borderColor: "#0ea5e9" },
  presetImage: { width: "100%", height: "100%" },
  presetCheck: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    width: 18, 
    height: 18, 
    borderRadius: 9, 
    backgroundColor: "#0ea5e9", 
    justifyContent: "center", 
    alignItems: "center" 
  },

  infoBox: { marginTop: 40, padding: 20, borderRadius: 20, backgroundColor: "rgba(14, 165, 233, 0.1)", borderWidth: 1, borderColor: "rgba(14, 165, 233, 0.2)" },

  infoText: { color: "#bae6fd", fontSize: 13, textAlign: "center", lineHeight: 20 },
});
