import { describe, expect, it } from "vitest";
import { getLocalizedText } from "./navigation";

describe("getLocalizedText", () => {
  it("falls back to the available language or explicit fallback", () => {
    expect(getLocalizedText({ fr: "Bonjour", en: "Hello" }, "fr", "fallback")).toBe("Bonjour");
    expect(getLocalizedText({ fr: "Bonjour", en: "Hello" }, "en", "fallback")).toBe("Hello");
    expect(getLocalizedText(undefined, "fr", "fallback")).toBe("fallback");
    expect(getLocalizedText(null, "en", "fallback")).toBe("fallback");
  });
});
