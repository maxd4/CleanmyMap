import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("/reglages canonical settings contract", () => {
  it("keeps the page protected and redirects anonymous visitors", () => {
    expect(pageSource).toContain("getSafeAuthSession");
    expect(pageSource).toContain("if (!userId)");
    expect(pageSource).toContain('redirect("/sign-in")');
  });

  it("renders the canonical editable preferences and account controls", () => {
    expect(pageSource).toContain('<SitePreferencesControls surface="light" />');
    expect(pageSource).toContain("<DisplayNameModeSetting");
    expect(pageSource).toContain("<AccountSettingsSection />");
    expect(pageSource).not.toContain("Section réservée pour une prochaine phase");
  });

  it("keeps localisation on the existing onboarding workflow", () => {
    expect(pageSource).toContain('href="/onboarding/localisation"');
  });
});
