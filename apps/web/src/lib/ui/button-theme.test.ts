import { describe, expect, it } from "vitest";
import { getButtonThemeCssVariables } from "@/lib/ui/button-theme";

describe("getButtonThemeCssVariables", () => {
  it("exposes the homepage button trio", () => {
    const vars = getButtonThemeCssVariables("home");

    expect(vars).not.toBeNull();
    expect(vars?.["--cmm-button-primary-bg-start"]).toBe("#fef08a");
    expect(vars?.["--cmm-button-secondary-bg-start"]).toBe("#ecfdf5");
    expect(vars?.["--cmm-button-tertiary-text"]).toBe("#0f172a");
  });

  it("follows the block color family for impact pages", () => {
    const vars = getButtonThemeCssVariables("red");

    expect(vars).not.toBeNull();
    expect(vars?.["--cmm-button-primary-bg-start"]).toBe("#fecaca");
    expect(vars?.["--cmm-button-secondary-bg-start"]).toBe("#fef2f2");
    expect(vars?.["--cmm-button-tertiary-text"]).toBe("#7f1d1d");
  });

  it("follows the block color family for cartography pages", () => {
    const vars = getButtonThemeCssVariables("sky");

    expect(vars).not.toBeNull();
    expect(vars?.["--cmm-button-primary-bg-start"]).toBe("#bae6fd");
    expect(vars?.["--cmm-button-secondary-bg-start"]).toBe("#e0f2fe");
    expect(vars?.["--cmm-button-tertiary-text"]).toBe("#0c4a6e");
  });

  it("returns null when no tone is available", () => {
    expect(getButtonThemeCssVariables(null)).toBeNull();
  });
});
