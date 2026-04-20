import React, { useState, useEffect } from "react";
import { StyleSheet, View, Text, Pressable, Alert, Vibration } from "react-native";
import { Lock, Delete } from "lucide-react-native";
import * as SecureStore from 'expo-secure-store';
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PasscodeScreenProps {
  navigation: any;
  route: any;
}

export function PasscodeScreen({ navigation, route }: PasscodeScreenProps) {
  const insets = useSafeAreaInsets();
  const mode = route.params?.mode || 'unlock'; // 'set' or 'unlock'
  const [passcode, setPasscode] = useState("");
  const [confirmMode, setConfirmMode] = useState(false);
  const [newPasscode, setNewPasscode] = useState("");
  
  const PASSCODE_KEY = 'app_passcode_key';

  useEffect(() => {
    if (passcode.length === 4) {
      handleComplete();
    }
  }, [passcode]);

  const handleComplete = async () => {
    if (mode === 'set') {
      if (!confirmMode) {
        setNewPasscode(passcode);
        setPasscode("");
        setConfirmMode(true);
      } else {
        if (passcode === newPasscode) {
          await SecureStore.setItemAsync(PASSCODE_KEY, passcode);
          Alert.alert("Muvaffaqiyatli", "Ekran paroli o'rnatildi.");
          navigation.goBack();
        } else {
          Vibration.vibrate(500);
          Alert.alert("Xatolik", "Parollar mos kelmadi.");
          setPasscode("");
        }
      }
    } else {
      const savedPasscode = await SecureStore.getItemAsync(PASSCODE_KEY);
      if (passcode === savedPasscode) {
        if (route.params?.onSuccess) {
           route.params.onSuccess();
        } else {
           navigation.replace("Messages");
        }
      } else {
        Vibration.vibrate(500);
        setPasscode("");
      }
    }
  };

  const onPressNumber = (num: string) => {
    if (passcode.length < 4) {
      setPasscode(passcode + num);
    }
  };

  const onDelete = () => {
    setPasscode(passcode.slice(0, -1));
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { marginTop: insets.top + 50 }]}>
        <View style={styles.lockIconBox}>
          <Lock color="#fff" size={32} />
        </View>
        <Text style={styles.title}>
          {mode === 'set' 
            ? (confirmMode ? "Parolni tasdiqlang" : "Yangi parol o'rnating") 
            : "Ekran parolini kiriting"}
        </Text>
        <Text style={styles.subTitle}>Ilovani himoya qilish uchun 4 ta raqamdan foydalaning</Text>
      </View>

      <View style={styles.dotsContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              passcode.length >= i ? styles.dotActive : null
            ]} 
          />
        ))}
      </View>

      <View style={styles.numpad}>
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
          ["", "0", "delete"],
        ].map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((btn, btnIndex) => (
              <Pressable
                key={btnIndex}
                style={[
                  styles.numBtn,
                  btn === "" ? { opacity: 0 } : null,
                  btn === "delete" ? styles.deleteBtn : null
                ]}
                onPress={() => btn === "delete" ? onDelete() : onPressNumber(btn)}
                disabled={btn === ""}
              >
                {btn === "delete" ? (
                  <Delete color="#fff" size={24} />
                ) : (
                  <Text style={styles.numText}>{btn}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {mode === 'set' && !confirmMode && (
        <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
           <Text style={styles.cancelText}>Bekor qilish</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505", alignItems: "center" },
  header: { alignItems: "center", marginBottom: 40 },
  lockIconBox: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(59, 130, 246, 0.2)", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { color: "#fff", fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  subTitle: { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", paddingHorizontal: 40 },
  dotsContainer: { flexDirection: "row", marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", marginHorizontal: 15 },
  dotActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  numpad: { width: "100%", paddingHorizontal: 40 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  numBtn: { width: 75, height: 75, borderRadius: 38, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center" },
  numText: { color: "#fff", fontSize: 28, fontWeight: "500" },
  deleteBtn: { backgroundColor: "transparent" },
  cancelBtn: { marginTop: 20 },
  cancelText: { color: "rgba(255,255,255,0.4)", fontSize: 16 },
});
