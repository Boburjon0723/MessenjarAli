import { LoginPayload, RegisterPayload } from "./types";

export const COUNTRY_CODES = ["+998", "+7", "+1", "+992", "+996", "+90", "+82"] as const;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function toFullPhone(countryCode: string, phone: string): string {
  return `${countryCode}${digitsOnly(phone)}`;
}

export function validateLogin(input: LoginPayload): string | null {
  if (!input.phone || !input.password) {
    return "Telefon raqam va parolni kiriting.";
  }
  if (digitsOnly(input.phone).length < 9) {
    return "Telefon raqamni to'liq kiriting.";
  }
  return null;
}

export function validateRegister(input: RegisterPayload): string | null {
  if (!input.name || !input.surname || !input.phone || !input.password || !input.confirmPassword || !input.age) {
    return "Iltimos, barcha maydonlarni to'ldiring.";
  }
  if (input.password.length < 6) {
    return "Parol kamida 6 ta belgidan iborat bo'lishi kerak.";
  }
  if (input.password !== input.confirmPassword) {
    return "Parol va tasdiqlash paroli bir xil emas.";
  }
  const parsedAge = Number.parseInt(input.age, 10);
  if (Number.isNaN(parsedAge) || parsedAge < 12) {
    return "Yoshni to'g'ri kiriting (12 dan katta).";
  }
  if (digitsOnly(input.phone).length < 9) {
    return "Telefon raqamni to'liq kiriting.";
  }
  return null;
}

