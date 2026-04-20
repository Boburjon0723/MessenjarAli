import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  User,
  Briefcase,
  Award,
  Clock,
  DollarSign,
  CheckCircle,
  Shield,
  Camera,
  AtSign,
  AlignLeft,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { apiFetch } from "../../../lib/api";
import { API_URL } from "../../../lib/config";
import { getToken } from "../../../lib/auth-storage";
import { useAuthStore } from "../../auth/store";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatBackground } from "../../../components/ChatBackground";
import { useAuthLocale } from "../../auth/locale";
import { AvatarImage } from "../../../components/AvatarImage";

const PREDEFINED_PROFESSIONS = [
  "Mentor / Ustoz",
  "Huquqshunos",
  "Psixolog",
  "Konsultant",
  "Dasturchi",
  "Boshqa",
];

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user, patchUser } = useAuthStore();
  const { t } = useAuthLocale();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Basic Profile States
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Expert Form States
  const [isExpertMode, setIsExpertMode] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState("none");
  const [profession, setProfession] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [pricingModel, setPricingModel] = useState("hourly");
  const [price, setPrice] = useState("");
  const [bioExpert, setBioExpert] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        
        // Basic
        setName(data.name || "");
        setSurname(data.surname || "");
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url || data.avatar || null);

        // Expert
        setProfession(data.profession || "");
        setSpecialization(data.specialization || data.specialization_details || "");
        setExperience(data.experience_years ? String(data.experience_years) : "");
        setPricingModel(data.pricing_model || "hourly");
        setPrice(data.hourly_rate ? String(data.hourly_rate) : (data.service_price ? String(data.service_price) : ""));
        setBioExpert(data.bio_expert || data.bio || "");
        setVerifiedStatus(data.verified_status || "none");
        
        const isExpertOrPending = !!data.is_expert || data.verified_status === "pending" || data.verified_status === "approved";
        setIsExpertMode(isExpertOrPending);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    setLoading(true);
    try {
      const filename = uri.split("/").pop() || "avatar.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;

      const formData = new FormData();
      formData.append("files", { uri, name: filename, type } as any);

      const token = await getToken();
      const res = await fetch(`${API_URL}/api/media/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const url = data?.url || data?.urls?.[0] || data?.files?.[0]?.url;
        if (url) {
          setAvatarUrl(url);
          await apiFetch("/api/users/me", {
            method: "PUT",
            body: JSON.stringify({ avatar_url: url }),
          });
          Alert.alert("Muvaffaqiyatli", "Profil rasmi yangilandi!");
        }
      } else {
        Alert.alert("Xato", "Rasmni serverga yuklab bo'lmadi.");
      }
    } catch (e) {
      Alert.alert("Xato", "Rasm yuklashda tarmoq xatosi yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBasicProfile = async () => {
    if (!name) {
      Alert.alert("Xato", "Ism kiritilishi shart!");
      return;
    }
    setLoadingInfo(true);
    try {
      const payload = {
        name,
        surname,
        username: username.replace(/^@+/, "").trim()
      };
      const res = await apiFetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("Muvaffaqiyatli", "Shaxsiy ma'lumotlar saqlandi.");
        patchUser({ ...user, name, surname: payload.surname, username: payload.username });
      } else {
        const err = await res.json();
        Alert.alert("Xato", err.message || "Saqlab bo'lmadi, username band bo'lishi mumkin.");
      }
    } catch (error) {
      Alert.alert("Xato", "Server bilan ulanishda muammo");
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleSaveExpert = async () => {
    if (!profession || !specialization || !experience || !price) {
      Alert.alert("Xato", "Barcha majburiy maydonlarni to'ldiring.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        is_expert: true,
        profession,
        specialization_details: specialization,
        specialization, // both fields used in some apps
        experience_years: parseInt(experience, 10),
        pricing_model: pricingModel,
        hourly_rate: parseFloat(price) || 0,
        currency: "MALI",
        bio_expert: bioExpert,
      };

      const res = await apiFetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        Alert.alert("Muvaffaqiyatli", "Mutaxassis profili yangilandi va tasdiqqa yuborildi.");
        await loadProfile(); // reload to get updated verified_status
      } else {
        const err = await res.json();
        Alert.alert("Xato", err.message || "Saqlab bo'lmadi");
      }
    } catch (error) {
      Alert.alert("Xato", "Server bilan ulanishda muammo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ChatBackground>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* USER BASIC PROFILE FORM */}
            <View style={styles.card}>
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={handleAvatarChange} style={styles.avatarBorder}>
                  <AvatarImage uri={avatarUrl} name={name} size={90} />
                  <View style={styles.cameraIcon}>
                    <Camera size={14} color="#fff" />
                  </View>
                </TouchableOpacity>
                
                <View style={styles.statusSection}>
                  <Text style={styles.userPhone}>{user?.phone}</Text>
                  {verifiedStatus === "approved" && (
                    <View style={styles.badge}>
                      <CheckCircle size={14} color="#10b981" />
                      <Text style={styles.badgeText}>{t('catUser')} (OK)</Text>
                    </View>
                  )}
                  {verifiedStatus === "pending" && (
                    <View style={[styles.badge, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                      <Shield size={14} color="#f59e0b" />
                      <Text style={[styles.badgeText, { color: "#f59e0b" }]}>Status: ...</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Inputs: Name, Surname, Username */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('regPlaceholderName')}</Text>
                <View style={styles.inputContainer}>
                  <User size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#64748b"
                    placeholder={t('regPlaceholderName')}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('regPlaceholderSurname')}</Text>
                <View style={styles.inputContainer}>
                  <User size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#64748b"
                    placeholder={t('regPlaceholderSurname')}
                    value={surname}
                    onChangeText={setSurname}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={styles.inputContainer}>
                  <AtSign size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#64748b"
                    placeholder="@username"
                    autoCapitalize="none"
                    value={username}
                    onChangeText={setUsername}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.saveBtn, loadingInfo && { opacity: 0.7 }]}
                onPress={handleSaveBasicProfile}
                disabled={loadingInfo}
              >
                {loadingInfo ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t('themeUpload')}</Text>}
              </TouchableOpacity>
            </View>

            {/* Expert Mode Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('catUser')} (Expert)</Text>
              <TouchableOpacity onPress={() => setIsExpertMode(!isExpertMode)}>
                <Text style={styles.toggleText}>{isExpertMode ? t('pickerClose') : t('dashFill')}</Text>
              </TouchableOpacity>
            </View>

          {isExpertMode && (
            <View style={[styles.card, { borderColor: "rgba(56, 189, 248, 0.2)", borderWidth: 1 }]}>
              <Text style={styles.formHint}>
                Mutaxassis profilini to'liq to'ldiring. Sizning xizmatlaringiz mijozlarga ko'rinadi.
              </Text>

              {/* Profession Picker (Chips) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kasb (Yo'nalish) <Text style={styles.required}>*</Text></Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                  {PREDEFINED_PROFESSIONS.map((prof) => (
                    <TouchableOpacity
                      key={prof}
                      style={[styles.chip, profession === prof && styles.chipActive]}
                      onPress={() => setProfession(prof)}
                    >
                      <Text style={[styles.chipText, profession === prof && styles.chipActiveText]}>
                        {prof}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {profession === "Boshqa" && (
                  <View style={styles.inputContainer}>
                    <Briefcase size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholderTextColor="#64748b"
                      placeholder="Kasbingizni kiriting"
                      onChangeText={setProfession} // Automatically will overwrite state but chip active will break
                    />
                  </View>
                )}
              </View>

              {/* Specialization */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mutaxassislik <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Award size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#64748b"
                    placeholder="O'zingiz sohangizni aniq yozing (masalan: Oila huquqi)"
                    value={specialization}
                    onChangeText={setSpecialization}
                  />
                </View>
              </View>

              {/* Bio Expert */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mutaxassis tavsifi (O'zingiz haqingizda)</Text>
                <View style={[styles.inputContainer, { height: 100, alignItems: "flex-start", paddingTop: 12 }]}>
                  <AlignLeft size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: "top" }]}
                    placeholderTextColor="#64748b"
                    placeholder="Mijozlar siz haqingizda ko'proq bilishi uchun..."
                    multiline
                    value={bioExpert}
                    onChangeText={setBioExpert}
                  />
                </View>
              </View>

              {/* Experience */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tajriba (yil) <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <Clock size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#64748b"
                    placeholder="Yillarda, masalan: 5"
                    keyboardType="numeric"
                    value={experience}
                    onChangeText={setExperience}
                  />
                </View>
              </View>

              {/* Pricing Model Selector */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Narxlash usuli</Text>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.radioBtn, pricingModel === "hourly" && styles.radioActive]}
                    onPress={() => setPricingModel("hourly")}
                  >
                    <Text style={[styles.radioText, pricingModel === "hourly" && styles.radioActiveText]}>Soatlik</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioBtn, pricingModel === "session" && styles.radioActive]}
                    onPress={() => setPricingModel("session")}
                  >
                    <Text style={[styles.radioText, pricingModel === "session" && styles.radioActiveText]}>Seans (Bir uchrashuv)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Price */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Narx (MALI) <Text style={styles.required}>*</Text></Text>
                <View style={styles.inputContainer}>
                  <DollarSign size={18} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholderTextColor="#64748b"
                    placeholder="Masalan: 50"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSaveExpert}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Mutaxassis profilini saqlash</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
      </ChatBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "rgba(255,255,255,0.1)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  title: { fontSize: 20, fontWeight: "700", color: "#fff" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  card: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    paddingBottom: 24,
  },
  avatarBorder: {
    padding: 4,
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: "rgba(56, 189, 248, 0.4)",
    marginRight: 20,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cameraIcon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#38bdf8",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0f172a",
  },
  statusSection: { flex: 1 },
  userPhone: { fontSize: 16, fontWeight: "600", color: "#94a3b8", marginBottom: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 12, color: "#10b981", marginLeft: 4, fontWeight: "600" },
  
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#fff" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#38bdf8" },
  
  formHint: { fontSize: 13, color: "#94a3b8", marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#94a3b8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  required: { color: "#ef4444" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    height: 50,
    color: "#fff",
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 12 },
  radioBtn: {
    flex: 1,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  radioActive: { backgroundColor: "rgba(56, 189, 248, 0.15)", borderWidth: 1, borderColor: "#38bdf8" },
  radioText: { fontSize: 13, fontWeight: "600", color: "#94a3b8" },
  radioActiveText: { color: "#38bdf8" },
  submitButton: {
    height: 50,
    backgroundColor: "#38bdf8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  
  saveBtn: {
    height: 50,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderColor: "#38bdf8",
  },
  chipText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  chipActiveText: { color: "#38bdf8", fontWeight: "700" },
});
