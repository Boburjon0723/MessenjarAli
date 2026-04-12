import React, { useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { loginRequest } from "../service";
import { useAuthStore } from "../store";
import { COUNTRY_CODES, digitsOnly, validateLogin } from "../validation";
import { getToken } from "../../../lib/auth-storage";

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
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const setSession = useAuthStore((s) => s.setSession);

  const isSubmitDisabled = useMemo(
    () => loading || !phone || !password || digitsOnly(phone).length < 9,
    [loading, phone, password]
  );

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
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Serverga ulanib bo'lmadi. Internet aloqangizni tekshiring va qayta urinib ko'ring.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tizimga kirish</Text>
      <Text style={styles.subtitle}>Telefon va parol orqali davom eting</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Mamlakat kodi</Text>
      <View style={styles.codeList}>
        {COUNTRY_CODES.map((code) => (
          <Pressable key={code} style={[styles.codeChip, code === countryCode && styles.codeChipActive]} onPress={() => setCountryCode(code)}>
            <Text style={[styles.codeText, code === countryCode && styles.codeTextActive]}>{code}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Telefon raqam</Text>
      <TextInput
        keyboardType="phone-pad"
        placeholder="90 123 45 67"
        placeholderTextColor="#64748b"
        value={phone}
        onChangeText={(v) => setPhone(digitsOnly(v))}
        style={styles.input}
      />

      <Text style={styles.label}>Parol</Text>
      <TextInput
        secureTextEntry
        placeholder="••••••••"
        placeholderTextColor="#64748b"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>Eslab qolish</Text>
        <Switch value={rememberMe} onValueChange={setRememberMe} />
      </View>

      <Pressable onPress={onLogin} disabled={isSubmitDisabled} style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.submitText}>Kiritilmoqda...</Text>
          </View>
        ) : (
          <Text style={styles.submitText}>Kirish</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Register")} style={styles.linkButton}>
        <Text style={styles.linkText}>Hisobingiz yo'qmi? Ro'yxatdan o'tish</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  content: { padding: 20, gap: 10 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginTop: 16 },
  subtitle: { color: "#94a3b8", marginBottom: 6 },
  label: { color: "#cbd5e1", fontSize: 13, marginTop: 8 },
  input: {
    borderColor: "#1e293b",
    borderWidth: 1,
    borderRadius: 14,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#0f172a"
  },
  error: { color: "#fca5a5", backgroundColor: "#450a0a", borderRadius: 10, padding: 10 },
  codeList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  codeChip: { borderRadius: 20, borderWidth: 1, borderColor: "#334155", paddingVertical: 8, paddingHorizontal: 10 },
  codeChipActive: { borderColor: "#38bdf8", backgroundColor: "#082f49" },
  codeText: { color: "#cbd5e1" },
  codeTextActive: { color: "#7dd3fc", fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  switchText: { color: "#cbd5e1" },
  submitButton: {
    backgroundColor: "#0ea5e9",
    borderRadius: 14,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: "center"
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: "#fff", fontWeight: "700" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  linkButton: { marginTop: 10, alignItems: "center", paddingVertical: 10 },
  linkText: { color: "#7dd3fc" }
});
