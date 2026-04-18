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
} from "react-native";
import { Phone, Eye, EyeOff, Globe } from "lucide-react-native";
import { loginRequest } from "../service";
import { useAuthStore } from "../store";
import { digitsOnly, validateLogin } from "../validation";
import { getToken } from "../../../lib/auth-storage";
import { DEFAULT_PLATFORM_BACKGROUND } from "../../../lib/constants";

const { width, height } = Dimensions.get("window");

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Messages: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
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
      navigation.replace("Messages");
    } catch (requestError: any) {
      setError(requestError.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground
        source={{ uri: DEFAULT_PLATFORM_BACKGROUND }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header - Moved Higher */}
          <View style={styles.brandingContainer}>
            <View style={styles.taglineBox}>
              <View style={styles.pulseDot} />
              <Text style={styles.taglineText}>MALI PLATFORM</Text>
            </View>
            <Text style={styles.title}>
              Tizimga{" "}
              <Text style={styles.titleSuffix}>Kirish</Text>
            </Text>
            <Text style={styles.subtitle}>
              Xavfsiz va tezkor muloqot platformasiga xush kelibsiz.
            </Text>
          </View>

          {/* Form Card - Glass Style */}
          <View style={styles.glassCard}>
            <View style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>Xush kelibsiz</h2>
              <p style={styles.cardSubtitle}>Davom etish uchun ma'lumotlarni kiritish</p>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Text style={styles.label}>TELEFON RAQAM</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.countryPicker}>
                  <Text style={styles.countryText}>{countryCode}</Text>
                </View>
                <TextInput
                  keyboardType="phone-pad"
                  placeholder="90 123 45 67"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={phone}
                  onChangeText={(v) => setPhone(digitsOnly(v))}
                  style={styles.input}
                />
                <Phone size={18} color="rgba(255,255,255,0.3)" />
              </View>

              <Text style={styles.label}>PAROL</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
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
                  <Text style={styles.actionText}>Eslab qolish</Text>
                </Pressable>
                <Pressable>
                  <Text style={styles.forgotText}>Parolni unutdingizmi?</Text>
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
                  <Text style={styles.submitText}>KIRISH</Text>
                )}
              </Pressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Hisobingiz yo'qmi?</Text>
                <Pressable onPress={() => navigation.navigate("Register")}>
                  <Text style={styles.linkText}> Ro'yxatdan o'tish</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  backgroundImage: {
    flex: 1,
    width: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 40,
    justifyContent: "center",
  },
  brandingContainer: {
    marginBottom: 30,
    marginTop: -20, // Lifted higher
  },
  taglineBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 8,
  },
  taglineText: {
    color: "rgba(186, 230, 253, 0.7)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
  },
  titleSuffix: {
    color: "rgba(255,255,255,0.5)",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(203, 213, 225, 0.7)",
    marginTop: 10,
    lineHeight: 22,
    maxWidth: width * 0.75,
  },
  glassCard: {
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 35,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 15,
  },
  cardHeader: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  } as any,
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(148, 163, 184, 0.7)",
    marginTop: 4,
  } as any,
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "600",
  },
  form: {
    width: "100%",
  },
  label: {
    color: "rgba(203, 213, 225, 0.6)",
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 20,
    marginBottom: 16,
    paddingHorizontal: 18,
    height: 58,
  },
  countryPicker: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
    paddingRight: 15,
    marginRight: 15,
  },
  countryText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 15,
    height: "100%",
    fontWeight: "500",
  },
  eyeBtn: {
    padding: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  checkMark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  actionText: {
    color: "rgba(203, 213, 225, 0.7)",
    fontSize: 12,
    fontWeight: "500",
  },
  forgotText: {
    color: "rgba(148, 163, 184, 0.8)",
    fontSize: 12,
    fontWeight: "500",
  },
  submitButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 28,
  },
  footerText: {
    color: "rgba(148, 163, 184, 0.7)",
    fontSize: 14,
  },
  linkText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "800",
  },
});
