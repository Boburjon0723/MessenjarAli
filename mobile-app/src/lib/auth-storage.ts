import * as SecureStore from "expo-secure-store";
import { AuthUser, AuthTokens } from "../features/auth/types";

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_KEY = "auth_user";
const REMEMBER_ME_KEY = "remember_me";

export async function setAuth(tokens: AuthTokens, user: AuthUser, rememberMe: boolean): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, tokens.token);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken || "");
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user || {}));
  await SecureStore.setItemAsync(REMEMBER_ME_KEY, rememberMe ? "true" : "false");
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function clearAuth(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

