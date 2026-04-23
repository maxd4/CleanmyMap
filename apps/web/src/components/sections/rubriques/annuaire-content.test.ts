import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./annuaire-directory-seed";
import {
  hasRecentActivity,
  hasValidPublicChannel,
  isPlaceholderPublicUrl,
} from "./annuaire-helpers";

describe("annuaire content", () => {
  it("contains no placeholder public links", () => {
    for (const entry of INITIAL_ANNUAIRE_ENTRIES) {
      const urls = [
        entry.websiteUrl,
        entry.instagramUrl,
        entry.facebookUrl,
        entry.primaryChannel?.url,
      ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      for (const url of urls) {
        expect(isPlaceholderPublicUrl(url)).toBe(false);
        expect(url.toLowerCase()).not.toContain("example.com");
      }
    }
  });

  it("keeps at least one engaged commerce partner in the directory", () => {
    const engagedCommerce = INITIAL_ANNUAIRE_ENTRIES.filter(
      (entry) =>
        (entry.kind === "commerce" || entry.kind === "entreprise") &&
        entry.qualificationStatus === "partenaire_actif" &&
        entry.verificationStatus === "verifie" &&
        hasRecentActivity(entry.recentActivityAt) &&
        hasValidPublicChannel(entry),
    );

    expect(engagedCommerce.length).toBeGreaterThan(0);
  });
});
