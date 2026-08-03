import type { TranslationKeys } from '@/lib/translations';

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function toFullPhone(countryCode: string, phone: string): string {
  return `${countryCode}${digitsOnly(phone)}`;
}

export type LoginInput = {
  phone: string;
  password: string;
};

export function validateLoginInput(input: LoginInput): TranslationKeys | null {
  if (!input.phone || !input.password) {
    return 'error_phone_pass_req';
  }
  if (digitsOnly(input.phone).length < 9) {
    return 'error_phone_full_req';
  }
  return null;
}

export type RegisterInput = {
  name: string;
  surname: string;
  phone: string;
  password: string;
  confirmPassword: string;
  age: string;
};

export function validateRegisterInput(input: RegisterInput): TranslationKeys | null {
  if (
    !input.name ||
    !input.surname ||
    !input.phone ||
    !input.password ||
    !input.confirmPassword ||
    !input.age
  ) {
    return 'filling_all_fields_req';
  }
  if (input.password.length < 6) {
    return 'error_password_min';
  }
  if (input.password !== input.confirmPassword) {
    return 'error_passwords_not_match';
  }
  const parsedAge = Number.parseInt(input.age, 10);
  if (Number.isNaN(parsedAge) || parsedAge < 12) {
    return 'error_age_invalid';
  }
  if (digitsOnly(input.phone).length < 9) {
    return 'error_phone_full_req';
  }
  return null;
}
