import { API_URL } from "../../lib/config";
import { setAuth } from "../../lib/auth-storage";
import { AuthUser, LoginPayload, RegisterPayload } from "./types";
import { toFullPhone } from "./validation";

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function loginRequest(payload: LoginPayload, rememberMe: boolean): Promise<AuthUser> {
  const fullPhone = toFullPhone(payload.countryCode, payload.phone);
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: fullPhone, password: payload.password })
  });
  const data = await parseJsonSafe(response);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Telefon raqam yoki parol noto'g'ri.");
    }
    throw new Error((data.message as string) || "Kirishda xatolik yuz berdi.");
  }

  const token = (data.token as string) || "";
  const refreshToken = (data.refreshToken as string) || "";
  const user = (data.user as AuthUser) || {};
  await setAuth({ token, refreshToken }, user, rememberMe);
  return user;
}

export async function registerRequest(payload: RegisterPayload): Promise<void> {
  const fullPhone = toFullPhone(payload.countryCode, payload.phone);
  const age = parseInt(payload.age, 10);
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: fullPhone,
      password: payload.password,
      name: payload.name,
      surname: payload.surname,
      age
    })
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error((data.message as string) || "Ro'yxatdan o'tish muvaffaqiyatsiz bo'ldi.");
  }
}

