import { describe, expect, it } from "vitest";
import { validateLogin, validateRegister } from "../src/features/auth/validation";

describe("validateLogin", () => {
  it("returns error when phone or password missing", () => {
    expect(validateLogin({ countryCode: "+998", phone: "", password: "" })).toBe("Telefon raqam va parolni kiriting.");
  });

  it("returns error when phone has less than 9 digits", () => {
    expect(validateLogin({ countryCode: "+998", phone: "90123", password: "secret12" })).toBe("Telefon raqamni to'liq kiriting.");
  });

  it("passes valid payload", () => {
    expect(validateLogin({ countryCode: "+998", phone: "901234567", password: "secret12" })).toBeNull();
  });
});

describe("validateRegister", () => {
  it("requires all fields", () => {
    expect(
      validateRegister({
        countryCode: "+998",
        phone: "",
        password: "",
        confirmPassword: "",
        name: "",
        surname: "",
        age: ""
      })
    ).toBe("Iltimos, barcha maydonlarni to'ldiring.");
  });

  it("checks password length, match and age", () => {
    expect(
      validateRegister({
        countryCode: "+998",
        phone: "901234567",
        password: "123",
        confirmPassword: "123",
        name: "Ali",
        surname: "Valiyev",
        age: "20"
      })
    ).toBe("Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
  });
});
