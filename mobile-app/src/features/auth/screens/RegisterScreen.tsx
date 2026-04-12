import React, { useMemo, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { registerRequest } from "../service";
import { COUNTRY_CODES, digitsOnly, validateRegister } from "../validation";

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
      <Text style={styles.title}>Ro'yxatdan o'tish</Text>
      <Text style={styles.subtitle}>Shaxsiy ma'lumotlar bilan hisob yarating</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>Muvaffaqiyatli! Tizimga yo'naltirilmoqda...</Text> : null}

      <TextInput style={styles.input} placeholderTextColor="#64748b" placeholder="Ism" value={name} onChangeText={setName} editable={!isDisabled} />
      <TextInput style={styles.input} placeholderTextColor="#64748b" placeholder="Familiya" value={surname} onChangeText={setSurname} editable={!isDisabled} />
      <TextInput style={styles.input} placeholderTextColor="#64748b" placeholder="Yosh" keyboardType="numeric" value={age} onChangeText={setAge} editable={!isDisabled} />

      <View style={styles.codeList}>
        {COUNTRY_CODES.map((code) => (
          <Pressable key={code} style={[styles.codeChip, code === countryCode && styles.codeChipActive]} onPress={() => setCountryCode(code)} disabled={isDisabled}>
            <Text style={[styles.codeText, code === countryCode && styles.codeTextActive]}>{code}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholderTextColor="#64748b"
        placeholder="Telefon raqam"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={(v) => setPhone(digitsOnly(v))}
        editable={!isDisabled}
      />
      <TextInput style={styles.input} placeholderTextColor="#64748b" secureTextEntry placeholder="Parol" value={password} onChangeText={setPassword} editable={!isDisabled} />
      <TextInput
        style={styles.input}
        placeholderTextColor="#64748b"
        secureTextEntry
        placeholder="Parolni tasdiqlash"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        editable={!isDisabled}
      />

      <Pressable onPress={onRegister} disabled={isDisabled} style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.submitText}>Yaratilmoqda...</Text>
          </View>
        ) : success ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#ffffff" />
            <Text style={styles.submitText}>Yo'naltirilmoqda...</Text>
          </View>
        ) : (
          <Text style={styles.submitText}>Hisob yaratish</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkButton}>
        <Text style={styles.linkText}>Allaqachon hisobingiz bormi? Tizimga kirish</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505" },
  content: { padding: 20, gap: 10 },
  title: { color: "#fff", fontSize: 28, fontWeight: "700", marginTop: 16 },
  subtitle: { color: "#94a3b8", marginBottom: 6 },
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
  success: { color: "#86efac", backgroundColor: "#052e16", borderRadius: 10, padding: 10 },
  codeList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4, marginBottom: 4 },
  codeChip: { borderRadius: 20, borderWidth: 1, borderColor: "#334155", paddingVertical: 8, paddingHorizontal: 10 },
  codeChipActive: { borderColor: "#38bdf8", backgroundColor: "#082f49" },
  codeText: { color: "#cbd5e1" },
  codeTextActive: { color: "#7dd3fc", fontWeight: "700" },
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
  linkText: { color: "#7dd3fc", textAlign: "center" }
});
