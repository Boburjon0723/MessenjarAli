import { describe, expect, it } from "vitest";
import { isE2eEnvelope } from "../src/lib/e2e-envelope";

describe("e2e envelope", () => {
  it("detects encrypted metadata", () => {
    expect(isE2eEnvelope({ e2e: true, e2e_v: 1 })).toBe(true);
    expect(isE2eEnvelope('{"e2e":true}')).toBe(true);
    expect(isE2eEnvelope({ caption: "hi" })).toBe(false);
  });
});
