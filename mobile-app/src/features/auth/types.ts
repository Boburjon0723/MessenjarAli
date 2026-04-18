export interface AuthUser {
  id?: string;
  name?: string;
  surname?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface LoginPayload {
  countryCode: string;
  phone: string;
  password: string;
}

export interface RegisterPayload {
  countryCode: string;
  phone: string;
  password: string;
  confirmPassword: string;
  name: string;
  surname: string;
  age: string;
}

export interface LoginRequestBody {
  phone: string;
  password: string;
}

export interface RegisterRequestBody {
  phone: string;
  password: string;
  name: string;
  surname: string;
  age: number;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

