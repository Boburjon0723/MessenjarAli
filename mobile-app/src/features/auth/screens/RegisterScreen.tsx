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
} from "react-native";
import { registerRequest } from "../service";
import { COUNTRY_CODES, digitsOnly, validateRegister } from "../validation";
import { COLORS, DEFAULT_PLATFORM_BACKGROUND } from "../../../lib/constants";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  Login: { registered?: string } | undefined;
  Register: undefined;
  Messages: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const [countryCode, setCountryCode] = useState("+998");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isDisabled = useMemo(() => loading || success, [loading, success]);

  const onRegister = async () => {
    setError("");
    const validationError = validateRegister({
      countryCode,
      phone,
      password,
      confirmPassword,
      name,
      surname,
      age
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await registerRequest({ countryCode, phone, password, confirmPassword, name, surname, age });
      setSuccess(true);
      setTimeout(() => navigation.replace("Login", { registered: "1" }), 1500);
    } catch (requestError: any) {
      setError(requestError.message || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: DEFAULT_PLATFORM_BACKGROUND }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Branding */}
          <View style={styles.brandingContainer}>
            <View style={styles.taglineBox}>
              <View style={styles.pulseDot} />
              <Text style={styles.taglineText}>MALI PLATFORM</Text>
            </View>
            <Text style={styles.title}>
              Hisob{" "}
              <Text style={styles.titleSuffix}>Yaratish</Text>
            </Text>
            <Text style={styles.subtitle}>
              Platformada ro'yxatdan o'ting va muloqotni boshlang.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.glassCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Ro'yxatdan o'tish</Text>
              <Text style={styles.cardSubtitle}>Shaxsiy ma'lumotlaringizni kiriting</Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successText}>Muvaffaqiyatli! Yo'naltirilmoqda...</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={styles.row}>
                <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                  <TextInput
                    placeholder="Ism"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={name}
                    onChangeText={setName}
                    editable={!isDisabled}
                    style={styles.input}
                  />
                </View>
                <View style={[styles.inputWrapper, { flex: 1 }]}>
                  <TextInput
                    placeholder="Familiya"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={surname}
                    onChangeText={setSurname}
                    editable={!isDisabled}
                    style={styles.input}
                  />
                </View>
              </View>

              <Text style={styles.label}>Yosh</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="24"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  editable={!isDisabled}
                  style={styles.input}
                />
              </View>

              <Text style={styles.label}>Telefon raqam</Text>
              <View style={styles.inputWrapper}>
                <View style={styles.countryPicker}>
                  <Text style={styles.countryText}>{countryCode}</Text>
                </View>
                <TextInput
                  keyboardType="phone-pad"
                  placeholder="90 123 45 67"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={phone}
                  onChangeText={(v) => setPhone(digitsOnly(v))}
                  editable={!isDisabled}
                  style={styles.input}
                />
              </View>

              <Text style={styles.label}>Parol</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={password}
                  onChangeText={setPassword}
                  editable={!isDisabled}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>

              <View style={styles.inputWrapper}>
                <TextInput
                  secureTextEntry={!showPassword}
                  placeholder="Parolni tasdiqlash"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isDisabled}
                  style={[styles.input, { flex: 1 }]}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>{showPassword ? "Yashirish" : "Show"}</Text>
                </Pressable>
              </View>

              <Pressable
                onPress={onRegister}
                disabled={isDisabled}
                style={[
                  styles.submitButton,
                  isDisabled && styles.submitButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Hisob yaratish</Text>
                )}
              </Pressable>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Allaqachon hisobingiz bormi?</Text>
                <Pressable onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.linkText}> Kirish</Text>
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
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 40,
    paddingBottom: 40,
  },
  brandingContainer: {
    marginBottom: 30,
  },
  taglineBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
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
    fontWeight: "bold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  titleSuffix: {
    color: "rgba(255,255,255,0.6)",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(203, 213, 225, 0.8)",
    marginTop: 8,
    lineHeight: 20,
  },
  glassCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "rgba(148, 163, 184, 0.8)",
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.4)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 12,
    textAlign: "center",
  },
  successContainer: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    padding: 12,
    borderRadius: 16,
    marginBottom: 20,
  },
  successText: {
    color: "#86efac",
    fontSize: 12,
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    marginBottom: 16,
  },
  label: {
    color: "rgba(203, 213, 225, 0.9)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  countryPicker: {
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.1)",
    paddingRight: 10,
    marginRight: 10,
  },
  countryText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    height: "100%",
  },
  eyeBtn: {
    padding: 8,
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    color: "rgba(148, 163, 184, 0.8)",
    fontSize: 13,
  },
  linkText: {
    color: "#0ea5e9",
    fontSize: 13,
    fontWeight: "700",
  },
});
