import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { AccountSettingsSection } from "./account-settings-section";

const source = readFileSync(new URL("./account-settings-section.tsx", import.meta.url), "utf8");

describe("account settings surface contract", () => {
  it("keeps the compact entry point on the canonical settings route", () => {
    expect(source).toContain("compact = false");
    expect(source).toContain('href=\"/reglages\"');
    expect(source).toContain("Ouvrir les réglages");
  });

  it("keeps privacy and account deletion on the full settings surface", () => {
    expect(source).toContain("Confidentialité");
    expect(source).toContain("Demander la suppression de mon compte");
    expect(source).toContain('href=\"/contact\"');
  });

  it("renders the full account surface in French and English", () => {
    const frMarkup = renderToStaticMarkup(
      <SitePreferencesProvider initialLocale="fr">
        <AccountSettingsSection locale="fr" />
      </SitePreferencesProvider>,
    );
    const enMarkup = renderToStaticMarkup(
      <SitePreferencesProvider initialLocale="en">
        <AccountSettingsSection locale="en" />
      </SitePreferencesProvider>,
    );

    expect(frMarkup).toContain("Paramètres du compte");
    expect(frMarkup).toContain("Confidentialité");
    expect(frMarkup).toContain("Demander la suppression de mon compte");
    expect(frMarkup).not.toContain("Account settings");
    expect(enMarkup).toContain("Account settings");
    expect(enMarkup).toContain("Privacy policy");
    expect(enMarkup).toContain("Request account deletion");
    expect(enMarkup).not.toContain("Confidentialité");
    expect(enMarkup).not.toContain("Paramètres du compte");
  });
});
