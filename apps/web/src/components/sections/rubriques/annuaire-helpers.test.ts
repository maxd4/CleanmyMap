import { describe, expect, it } from "vitest";
import { INITIAL_ANNUAIRE_ENTRIES } from "./annuaire-directory-seed";
import {
  buildDashboardStats,
  hasRecentActivity,
  hasValidPublicChannel,
  isCompletePublicPartner,
  isPlaceholderPublicUrl,
} from "./annuaire-helpers";

describe("buildDashboardStats", () => {
  it("uses the full directory instead of only the active subset", () => {
    const activeEntries = INITIAL_ANNUAIRE_ENTRIES.filter(
      (entry) =>
        entry.qualificationStatus === "partenaire_actif" &&
        entry.verificationStatus === "verifie" &&
        hasRecentActivity(entry.recentActivityAt),
    );

    const stats = buildDashboardStats(INITIAL_ANNUAIRE_ENTRIES, 4);

    expect(stats.actors).toBe(INITIAL_ANNUAIRE_ENTRIES.length);
    expect(stats.actors).toBeGreaterThan(activeEntries.length);
    expect(stats.pending).toBe(4);
    expect(stats.zones).toBeGreaterThan(0);
    expect(stats.contributions).toBeGreaterThan(0);
  });

  it("keeps public partner entries complete and placeholder free", () => {
    for (const entry of INITIAL_ANNUAIRE_ENTRIES) {
      const urls = [entry.websiteUrl, entry.instagramUrl, entry.facebookUrl, entry.primaryChannel?.url].filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      );
      for (const url of urls) {
        expect(isPlaceholderPublicUrl(url)).toBe(false);
      }
      if (entry.kind === "commerce" || entry.kind === "entreprise") {
        expect(hasValidPublicChannel(entry)).toBe(true);
        expect(entry.coveredArrondissements.length).toBeGreaterThan(0);
        expect(hasRecentActivity(entry.lastUpdatedAt)).toBe(true);
        expect(isCompletePublicPartner(entry)).toBe(true);
      }
    }
  });
});
