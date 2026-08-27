import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicPolicy = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const documentedPolicy = readFileSync(
  new URL("../../../../../documentation/legal/politique-confidentialite.md", import.meta.url),
  "utf8",
);
const cookiePolicy = readFileSync(
  new URL("../../../../../documentation/legal/politique-cookies.md", import.meta.url),
  "utf8",
);
const accountSettings = readFileSync(
  new URL("../../components/account/account-settings-section.tsx", import.meta.url),
  "utf8",
);
const retentionCleanup = readFileSync(
  new URL("../../../../../apps/web/scripts/cleanup-supabase-retention.mjs", import.meta.url),
  "utf8",
);

describe("privacy policy contract", () => {
  it("keeps the public page and legal doctrine free of obsolete factual claims", () => {
    const obsoleteClaims = [
      /association loi 1901/iu,
      /association en cours de constitution/iu,
      /privacy shield/iu,
      /bcrypt/iu,
      /position floue/iu,
      /mode anonyme/iu,
      /\b3 ans\b/iu,
      /\b5 ans\b/iu,
      /\b10 ans\b/iu,
      /\b12 mois\b/iu,
      /\b2 ans\b/iu,
      /dpo/iu,
      /serveurs?[^.\n]*\bue\b/iu,
      /sauvegardes?[^.\n]*(chiffr|crypt)/iu,
    ];

    for (const source of [publicPolicy, documentedPolicy, cookiePolicy]) {
      for (const claim of obsoleteClaims) {
        expect(source).not.toMatch(claim);
      }
    }
  });

  it("keeps both policy surfaces aligned with implemented treatments", () => {
    for (const source of [publicPolicy, documentedPolicy]) {
      expect(source).toContain("contact_requests");
      expect(source).toContain("Sentry");
      expect(source).toContain("PostHog");
      expect(source).toContain("six mois");
      expect(source).toContain("consentement");
      expect(source).toContain("intérêt légitime");
      expect(source).toContain("CNIL");
      expect(source).toContain("un mois");
      expect(source).toContain("deux mois");
      expect(source).toContain("automatisée");
    }
  });

  it("routes account deletion to the canonical reviewed RGPD request", () => {
    expect(accountSettings).toContain("Demander la suppression de mon compte");
    expect(accountSettings).toContain('href="/contact"');
    expect(accountSettings).toContain("demande, et non d&apos;une suppression immédiate");
    expect(accountSettings).not.toContain("Supprimer mon compte");
    expect(accountSettings).not.toContain("définitivement toutes vos données");
    expect(accountSettings).not.toContain("irréversible");
  });

  it("covers contact requests and keeps purge archives free of payloads", () => {
    expect(retentionCleanup).toContain('{ table: "contact_requests", createdColumn: "created_at" }');
    expect(retentionCleanup).toContain('"contact_requests.json"');
    expect(retentionCleanup).not.toContain("items: rows");
    expect(retentionCleanup).not.toContain("items: paths");
    expect(retentionCleanup).not.toContain("items: expired");
  });
});
