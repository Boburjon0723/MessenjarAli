import React, { useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { Phone, Eye, EyeOff } from "lucide-react-native";
import { loginRequest } from "../service";
import { useAuthStore } from "../store";
import { digitsOnly, validateLogin } from "../validation";
import { getToken } from "../../../lib/auth-storage";
import { useAuthLocale } from "../locale";
import { LanguagePicker } from "../components/LanguagePicker";
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080&auto=format&fit=crop";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Messages: undefined;
  Passcode: { mode: 'set' | 'unlock'; onSuccess?: () => void };
};

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { t } = useAuthLocale();
  const [countryCode, setCountryCode] = useState("+998");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const setSession = useAuthStore((s) => s.setSession);

  const isSubmitDisabled = useMemo(() => {
    if (loading) return true;
    if (!phone || !password) return true;
    if (digitsOnly(phone).length < 9) return true;
    return false;
  }, [loading, phone, password]);

  const onLogin = async () => {
    setError("");
    const validationError = validateLogin({ countryCode, phone, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const user = await loginRequest({ countryCode, phone, password }, rememberMe);
      const token = (await getToken()) || "";
      setSession({ user, token });
      
      const savedPasscode = await SecureStore.getItemAsync('app_passcode_key');
      if (!savedPasscode) {
        Alert.alert(
          "Xavfsizlik tavsiyasi",
          "Ilovangizni himoya qilish uchun ekran paroli o'rnatishni xohlaysizmi?",
          [
            { 
              text: "Keyinroq", 
              onPress: () => navigation.replace("Messages") 
            },
            { 
              text: "O'rnatish", 
              onPress: () => navigation.navigate("Passcode", { mode: 'set' }) 
            }
          ]
        );
      } else {
        navigation.replace("Messages");
      }
    } catch (requestError: any) {
      setError(requestError.message || t("loginErrorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LanguagePicker />
      <ImageBackground
        source={{ uri: BACKGROUND_IMAGE }}
        style={styles.backgroundImage}
        resizeMode="cover"
        blurRadius={10}
      >
        <View style={styles.overlay} />
        
        {/* Glow Effects behind the card */}
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.brandingContainer}>
            <View style={styles.taglineBox}>
              <View style={styles.pulseDot} />
              <Text style={styles.taglineText}>{t("loginTagline")}</Text>
            </View>
            <Text style={styles.title}>
              {t("loginTitlePrefix")}{" "}
              <Text style={styles.titleSuffix}>{t("loginTitleSuffix")}</Text>
            </Text>
            <Text style={styles.subtitle}>{t("loginSubtitle")}</Text>
          </View>

          <View style={styles.glassCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{t("loginCardTitle")}</Text>
              <Text style={styles.cardSubtitle}>{t("loginCardSubtitle")}</Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Text style={styles.label}>{t("loginLabelPhone")}</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.countryPicker}>
                  <Text style={styles.countryText}>{countryCode}</Text>
                </View>
                <TextInput
                  keyboardType="phone-pad"
                  placeholder={t("loginPlaceholderPhone")}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={phone}
                  onChangeText={(v) => setPhone(digitsOnly(v))}
                  style={styles.input}
                />
                <Phone size={18} color="rgba(255,255,255,0.3)" />
              </View>

              <Text style={styles.label}>{t("loginLabelPassword")}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showPassword}
                  placeholder={t("loginPlaceholderPassword")}
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={setPassword}
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  {showPassword ? (
                    <EyeOff size={20} color="rgba(255,255,255,0.3)" />
                  ) : (
                    <Eye size={20} color="rgba(255,255,255,0.3)" />
                  )}
                </Pressable>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  onPress={() => setRememberMe(!rememberMe)}
                  style={styles.checkboxRow}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                    {rememberMe && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <Text style={styles.actionText}>{t("loginRemember")}</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.forgotText}>{t("loginForgot")}</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={onLogin}
                disabled={isSubmitDisabled}
                style={[
                  styles.submitButton,
                  isSubmitDisabled && styles.submitButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{t("loginSubmit")}</Text>
                )}
              </Pressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t("loginFooterQuestion")}</Text>
                <Pressable onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.linkText}> {t("loginFooterRegister")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  backgroundImage: { flex: 1, width: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.75)" },
  glowTop: { position: "absolute", top: "10%", left: "-10%", width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(56, 189, 248, 0.25)" },
  glowBottom: { position: "absolute", bottom: "-5%", right: "-10%", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(147, 51, 234, 0.2)" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 80 : 60, paddingBottom: 40, justifyContent: "center" },
  brandingContainer: { marginBottom: 35, marginTop: -20 },
  taglineBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(56, 189, 248, 0.12)", borderWidth: 1, borderColor: "rgba(56, 189, 248, 0.3)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 24, alignSelf: "flex-start", marginBottom: 20 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#38bdf8", marginRight: 10, shadowColor: "#38bdf8", shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  taglineText: { color: "#bae6fd", fontSize: 10, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 32, fontWeight: "900", color: "#ffffff", letterSpacing: -1 },
  titleSuffix: { color: "rgba(255,255,255,0.4)" },
  subtitle: { fontSize: 14, color: "rgba(203, 213, 225, 0.8)", marginTop: 12, lineHeight: 22, maxWidth: width * 0.8 },
  glassCard: { backgroundColor: "transparent", padding: 10, marginTop: 10 },
  cardHeader: { marginBottom: 20 },
  cardTitle: { fontSize: 24, fontWeight: "900", color: "#ffffff", letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 13, color: "rgba(148, 163, 184, 0.8)", marginTop: 6 },
  errorContainer: { backgroundColor: "rgba(239, 68, 68, 0.15)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.4)", padding: 14, borderRadius: 16, marginBottom: 24 },
  errorText: { color: "#fca5a5", fontSize: 13, textAlign: "center", fontWeight: "700" },
  form: { width: "100%" },
  label: { color: "rgba(203, 213, 225, 0.7)", fontSize: 10, fontWeight: "800", marginBottom: 6, marginLeft: 2, letterSpacing: 1.2, textTransform: "uppercase" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "transparent", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.3)", paddingHorizontal: 4, height: 50, marginBottom: 24 },
  countryPicker: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)", paddingRight: 10, marginRight: 10 },
  countryText: { color: "#ffffff", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  input: { flex: 1, color: "#ffffff", fontSize: 15, height: "100%", fontWeight: "600" },
  eyeBtn: { padding: 10 },
  actionsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28, marginTop: 4 },
  checkboxRow: { flexDirection: "row", alignItems: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)", marginRight: 12, justifyContent: "center", alignItems: "center" },
  checkboxActive: { backgroundColor: "#0ea5e9", borderColor: "#0ea5e9" },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "900" },
  actionText: { color: "rgba(203, 213, 225, 0.9)", fontSize: 13, fontWeight: "600" },
  forgotText: { color: "#38bdf8", fontSize: 13, fontWeight: "700" },
  submitButton: { height: 60, borderRadius: 30, backgroundColor: "#0ea5e9", justifyContent: "center", alignItems: "center", shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  submitButtonDisabled: { opacity: 0.5, backgroundColor: "#475569" },
  submitText: { color: "#ffffff", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { color: "rgba(148, 163, 184, 0.8)", fontSize: 15, fontWeight: "500" },
  linkText: { color: "#38bdf8", fontSize: 15, fontWeight: "900" },
});

