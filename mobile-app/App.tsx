import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { RegisterScreen } from "./src/features/auth/screens/RegisterScreen";
import { ChatListScreen } from "./src/features/chat/screens/ChatListScreen";
import { ChatDetailScreen } from "./src/features/chat/screens/ChatDetailScreen";

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Messages: undefined;
  ChatDetail: { chatId: string; name: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false, // Barcha ekranlarda navigator headerini o'chiramiz
          contentStyle: { backgroundColor: "#050505" }
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Messages" component={ChatListScreen} />
        <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
