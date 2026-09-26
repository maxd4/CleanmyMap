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
    expect(pageSource).toContain("<AccountSettingsSection locale={locale} />");
    expect(pageSource).not.toContain("Section réservée pour une prochaine phase");
  });

  it("keeps the metadata limited to settings actually managed on the page", () => {
    expect(pageSource).toContain(
      'metadataDescription:\n      "Configurez vos préférences CleanMyMap : affichage, localisation et paramètres de compte.",',
    );
    expect(pageSource).toContain(
      '"Configure your CleanMyMap preferences: display, location and account settings."',
    );
    expect(pageSource).not.toMatch(/notifications/i);
  });

  it("keeps the settings surface on the documented sky/slate palette", () => {
    expect(pageSource).toContain("bg-slate-50/70");
    expect(pageSource).not.toContain("bg-amber-50/70");
  });

  it("keeps localisation on the existing onboarding workflow", () => {
    expect(pageSource).toContain('href="/onboarding/localisation"');
  });
});
