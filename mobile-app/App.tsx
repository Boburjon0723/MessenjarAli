import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Text, View } from "react-native";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { RegisterScreen } from "./src/features/auth/screens/RegisterScreen";
import { useAuthStore } from "./src/features/auth/store";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Messages: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function MessagesPlaceholder() {
  const { user } = useAuthStore();
  return (
    <View style={{ flex: 1, backgroundColor: "#050505", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>Messages</Text>
      <Text style={{ color: "#94a3b8", marginTop: 8, textAlign: "center" }}>
        Login muvaffaqiyatli. User: {user?.name ?? "N/A"}
      </Text>
    </View>
  );
}

export default function App() {
  const { isBootstrapping } = useAuthStore();
  if (isBootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#050505" }}>
        <ActivityIndicator color="#38bdf8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: "#050505" },
          headerTintColor: "#ffffff",
          contentStyle: { backgroundColor: "#050505" }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Tizimga kirish" }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Ro'yxatdan o'tish" }} />
        <Stack.Screen name="Messages" component={MessagesPlaceholder} options={{ headerBackVisible: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
