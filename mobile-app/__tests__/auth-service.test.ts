import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginRequest } from "../src/features/auth/service";

vi.mock("../src/lib/auth-storage", () => ({
  setAuth: vi.fn(async () => undefined)
}));

describe("loginRequest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("maps 401 to parity error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        json: async () => ({})
      }))
    );

    await expect(loginRequest({ countryCode: "+998", phone: "901234567", password: "bad" }, true)).rejects.toThrow(
      "Telefon raqam yoki parol noto'g'ri. Qayta urinib ko'ring."
    );
  });

  it("returns user on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ token: "t", refreshToken: "r", user: { name: "Ali" } })
      }))
    );

    const user = await loginRequest({ countryCode: "+998", phone: "901234567", password: "goodpass" }, true);
    expect(user).toEqual({ name: "Ali" });
  });
});
