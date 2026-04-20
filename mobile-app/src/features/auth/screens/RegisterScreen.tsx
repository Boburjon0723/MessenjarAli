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
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { registerRequest } from "../service";
import { digitsOnly, validateRegister } from "../validation";
import { useAuthLocale } from "../locale";
import { LanguagePicker } from "../components/LanguagePicker";

const BACKGROUND_IMAGE = "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080&auto=format&fit=crop";

const { width } = Dimensions.get("window");

type RootStackParamList = {
  Login: { registered?: string } | undefined;
  Register: undefined;
  Messages: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { t } = useAuthLocale();
  const [step, setStep] = useState(1);

  const [countryCode, setCountryCode] = useState("+998");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isDisabled = useMemo(() => loading || success, [loading, success]);

  const calculateAge = (birthDate: Date | null) => {
    if (!birthDate) return "";
    const today = new Date();
    let ageNumber = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      ageNumber--;
    }
    return ageNumber.toString();
  };

  const handleNextStep1 = () => {
    if (!name || !surname) {
      setError("Ism va familiyani kiriting.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleNextStep2 = () => {
    if (!dob) {
      setError("Tug'ilgan sanani kiriting.");
      return;
    }
    setError("");
    setStep(3);
  };

  const onRegister = async () => {
    setError("");
    const age = calculateAge(dob);
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
        
        {/* Glow Effects */}
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
          >
            {/* Branding */}
            <View style={styles.brandingContainer}>
              <View style={styles.taglineBox}>
                <View style={styles.pulseDot} />
                <Text style={styles.taglineText}>{t("regTagline")}</Text>
              </View>
              <Text style={styles.title}>
                {t("regTitlePrefix")}{" "}
                <Text style={styles.titleSuffix}>{t("regTitleSuffix")}</Text>
              </Text>
              <Text style={styles.subtitle}>{t("regSubtitle")}</Text>
            </View>

            {/* Form Card */}
            <View style={styles.glassCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{t("regCardTitle")}</Text>
                <Text style={styles.cardSubtitle}>{t("regCardSubtitle")} - Qadam {step}/3</Text>
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>{t("regSuccess")}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                
                {/* STEP 1: Name & Surname */}
                {step === 1 && (
                  <>
                    <View style={styles.row}>
                      <View style={[styles.inputWrapper, { flex: 1, marginRight: 8 }]}>
                        <TextInput
                          placeholder={t("regPlaceholderName")}
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={name}
                          onChangeText={setName}
                          editable={!isDisabled}
                          style={styles.input}
                        />
                      </View>
                      <View style={[styles.inputWrapper, { flex: 1 }]}>
                        <TextInput
                          placeholder={t("regPlaceholderSurname")}
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={surname}
                          onChangeText={setSurname}
                          editable={!isDisabled}
                          style={styles.input}
                        />
                      </View>
                    </View>

                    <Pressable
                      onPress={handleNextStep1}
                      style={styles.submitButton}
                    >
                      <Text style={styles.submitText}>Davom etish</Text>
                    </Pressable>
                  </>
                )}

                {/* STEP 2: Date of Birth */}
                {step === 2 && (
                  <>
                    <Text style={styles.label}>Tug'ilgan sana</Text>
                    <Pressable
                      style={[styles.inputWrapper, { justifyContent: "center" }]}
                      onPress={() => setShowPicker(true)}
                    >
                      <Text style={[styles.input, { marginTop: 15, color: dob ? "#fff" : "rgba(255,255,255,0.4)" }]}>
                        {dob ? dob.toLocaleDateString("ru-RU") : "Sana tanlang"}
                      </Text>
                    </Pressable>

                    {showPicker && (
                      <DateTimePicker
                        testID="dateTimePicker"
                        value={dob || new Date()}
                        mode="date"
                        display="spinner"
                        maximumDate={new Date()}
                        onChange={(event: any, selectedDate?: Date) => {
                          const currentDate = selectedDate || dob;
                          if (Platform.OS === 'android') {
                            setShowPicker(false);
                          }
                          if (selectedDate) setDob(currentDate);
                        }}
                      />
                    )}
                    
                    {Platform.OS === "ios" && showPicker && (
                       <Pressable style={{alignItems: 'flex-end', marginBottom: 10}} onPress={() => setShowPicker(false)}>
                          <Text style={{color: "#38bdf8", fontWeight: "bold"}}>Yopish</Text>
                       </Pressable>
                    )}

                    <View style={styles.row}>
                      <Pressable
                        onPress={() => setStep(1)}
                        style={[styles.submitButton, { flex: 0.8, marginRight: 8, backgroundColor: "rgba(255,255,255,0.1)" }]}
                      >
                        <Text style={styles.submitText}>Orqaga</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleNextStep2}
                        style={[styles.submitButton, { flex: 1.2 }]}
                      >
                        <Text style={styles.submitText}>Davom etish</Text>
                      </Pressable>
                    </View>
                  </>
                )}

                {/* STEP 3: Phone & Password */}
                {step === 3 && (
                  <>
                    <Text style={styles.label}>{t("regLabelPhone")}</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.countryPicker}>
                        <Text style={styles.countryText}>{countryCode}</Text>
                      </View>
                      <TextInput
                        keyboardType="phone-pad"
                        placeholder={t("regPlaceholderPhone")}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={phone}
                        onChangeText={(v) => setPhone(digitsOnly(v))}
                        editable={!isDisabled}
                        style={styles.input}
                      />
                    </View>

                    <Text style={styles.label}>{t("regLabelPassword")}</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        secureTextEntry={!showPassword}
                        placeholder={t("loginPlaceholderPassword")}
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
                        placeholder={t("regPlaceholderConfirm")}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!isDisabled}
                        style={[styles.input, { flex: 1 }]}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
                          {showPassword ? t("regHidePassword") : t("regShowPassword")}
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.row}>
                      <Pressable
                        onPress={() => setStep(2)}
                        style={[styles.submitButton, { flex: 0.8, marginRight: 8, backgroundColor: "rgba(255,255,255,0.1)" }]}
                      >
                        <Text style={styles.submitText}>Orqaga</Text>
                      </Pressable>
                      <Pressable
                        onPress={onRegister}
                        disabled={isDisabled}
                        style={[
                          styles.submitButton,
                          { flex: 1.2 },
                          isDisabled && styles.submitButtonDisabled,
                        ]}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.submitText}>{t("regBtnSubmit")}</Text>
                        )}
                      </Pressable>
                    </View>
                  </>
                )}

                <View style={styles.footer}>
                  <Text style={styles.footerText}>{t("regFooterQuestion")}</Text>
                  <Pressable onPress={() => navigation.navigate("Login")}>
                    <Text style={styles.linkText}> {t("regFooterLogin")}</Text>
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
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  backgroundImage: { flex: 1, width: "100%" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2, 6, 23, 0.75)" },
  glowTop: { position: "absolute", top: "5%", right: "-10%", width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(147, 51, 234, 0.2)" },
  glowBottom: { position: "absolute", bottom: "10%", left: "-15%", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(56, 189, 248, 0.25)" },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 80 : 60, paddingBottom: 60 },
  brandingContainer: { marginBottom: 35 },
  taglineBox: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(56, 189, 248, 0.12)", borderWidth: 1, borderColor: "rgba(56, 189, 248, 0.3)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 24, alignSelf: "flex-start", marginBottom: 20 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#38bdf8", marginRight: 10, shadowColor: "#38bdf8", shadowOpacity: 1, shadowRadius: 10, elevation: 5 },
  taglineText: { color: "#bae6fd", fontSize: 10, fontWeight: "900", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 32, fontWeight: "900", color: "#ffffff", letterSpacing: -1 },
  titleSuffix: { color: "rgba(255,255,255,0.4)" },
  subtitle: { fontSize: 14, color: "rgba(203, 213, 225, 0.8)", marginTop: 12, lineHeight: 22 },
  glassCard: { backgroundColor: "transparent", padding: 10, marginTop: 10 },
  cardHeader: { marginBottom: 20 },
  cardTitle: { fontSize: 24, fontWeight: "900", color: "#ffffff", letterSpacing: -0.5 },
  cardSubtitle: { fontSize: 13, color: "rgba(148, 163, 184, 0.8)", marginTop: 6 },
  errorContainer: { backgroundColor: "rgba(239, 68, 68, 0.15)", borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.4)", padding: 14, borderRadius: 16, marginBottom: 24 },
  errorText: { color: "#fca5a5", fontSize: 13, textAlign: "center", fontWeight: "700" },
  successContainer: { backgroundColor: "rgba(16, 185, 129, 0.15)", borderWidth: 1, borderColor: "rgba(16, 185, 129, 0.4)", padding: 14, borderRadius: 16, marginBottom: 24 },
  successText: { color: "#86efac", fontSize: 13, textAlign: "center", fontWeight: "700" },
  form: { width: "100%" },
  row: { flexDirection: "row", marginBottom: 18 },
  label: { color: "rgba(203, 213, 225, 0.7)", fontSize: 10, fontWeight: "800", marginBottom: 6, marginLeft: 2, letterSpacing: 1.2, textTransform: "uppercase" },
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "transparent", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.3)", marginBottom: 24, paddingHorizontal: 4, height: 50 },
  countryPicker: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.2)", paddingRight: 10, marginRight: 10 },
  countryText: { color: "#ffffff", fontWeight: "900", fontSize: 15, letterSpacing: 1 },
  input: { flex: 1, color: "#ffffff", fontSize: 15, height: "100%", fontWeight: "600" },
  eyeBtn: { padding: 10 },
  submitButton: { height: 50, borderRadius: 25, backgroundColor: "#0ea5e9", justifyContent: "center", alignItems: "center", marginTop: 12, shadowColor: "#0ea5e9", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 12 },
  submitButtonDisabled: { opacity: 0.5, backgroundColor: "#475569" },
  submitText: { color: "#ffffff", fontSize: 12, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase", textAlign: "center" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 28 },
  footerText: { color: "rgba(148, 163, 184, 0.8)", fontSize: 14, fontWeight: "500" },
  linkText: { color: "#38bdf8", fontSize: 14, fontWeight: "900" },
});
