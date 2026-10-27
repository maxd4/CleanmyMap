import { describe, expect, it } from "vitest";

const syntheticEmail = ["contact", "example.test"].join("@");
import {
  formatAvailabilitySummary,
  formatCoverageSummary,
  formatPartnerScopeLabel,
  getPartnerTrustState,
  hasPublicChannel,
  hasRecentUpdate,
  isCompletePartnerEntry,
  normalizePublicWebUrl,
  normalizePartnerAvailability,
  normalizePartnerCoverage,
  normalizeEngagementTypes,
  buildPartnerWhyThisStructureMatters,
} from "./onboarding-types";

describe("partner onboarding types", () => {
  it("normalizes legacy coverage and availability text", () => {
    const coverage = normalizePartnerCoverage("Paris 10e, 11e, Bas Belleville");
    const availability = normalizePartnerAvailability("Du mardi au samedi");

    expect(coverage).toEqual({
      arrondissements: [10, 11],
      quartiers: [],
    });
    expect(availability).toEqual({
      slots: [],
      note: "Du mardi au samedi",
    });
    expect(formatCoverageSummary(coverage)).toBe("Paris 10e, 11e");
    expect(formatAvailabilitySummary(availability)).toBe("Du mardi au samedi");
  });

  it("formats structured availability slots", () => {
    expect(
      formatAvailabilitySummary({
        slots: [
          { day: "tue", start: "10:00", end: "18:00" },
          { day: "thu", start: "09:00", end: "12:00" },
        ],
        note: "Sur rendez-vous",
      }),
    ).toBe("Mardi 10:00-18:00 · Jeudi 09:00-12:00 · Sur rendez-vous");
  });

  it("keeps only supported engagement values and removes duplicates", () => {
    expect(
      normalizeEngagementTypes([
        "social",
        "humanitaire",
        "social",
        "not-a-domain",
      ]),
    ).toEqual(["social", "humanitaire"]);
  });

  it("normalizes malformed structured coverage and availability conservatively", () => {
    expect(normalizePartnerCoverage(null)).toEqual({ arrondissements: [], quartiers: [] });
    expect(normalizePartnerCoverage({ arrondissements: [11, "10", 75, 11, 99], quartiers: ["Belleville", 11, " Belleville ", ""] })).toEqual({
      arrondissements: [10, 11],
      quartiers: ["Belleville"],
    });
    expect(normalizePartnerAvailability("   ")).toEqual({ slots: [], note: undefined });
    expect(normalizePartnerAvailability({ slots: [null, { day: "bad", start: "10:00", end: "11:00" }, { day: "tue", start: "18:00", end: "10:00" }, { day: "tue", start: "09:00", end: "10:00" }], note: "  sur rendez-vous " })).toEqual({
      slots: [{ day: "tue", start: "09:00", end: "10:00" }],
      note: "sur rendez-vous",
    });
  });

  it("keeps public destinations separate from administrative channels", () => {
    expect(normalizePublicWebUrl("https://example.test/partner")).toBe("https://example.test/partner");
    expect(normalizePublicWebUrl(`mailto:${syntheticEmail}`)).toBeNull();
    expect(normalizePublicWebUrl("tel:+33123456789")).toBeNull();
    expect(normalizePublicWebUrl("not-a-url")).toBeNull();
    expect(hasPublicChannel({ primaryChannel: { url: `mailto:${syntheticEmail}` }, websiteUrl: "  " })).toBe(false);
    expect(hasPublicChannel({ facebookUrl: "https://facebook.example/association" })).toBe(true);
  });

  it("applies trust and freshness rules by partner kind", () => {
    const recent = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const base = {
      kind: "commerce",
      coveredArrondissements: [11],
      lastUpdatedAt: recent,
      websiteUrl: "https://example.test",
    };
    expect(hasRecentUpdate(recent)).toBe(true);
    expect(hasRecentUpdate("not-a-date")).toBe(false);
    expect(hasRecentUpdate(new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString())).toBe(false);
    expect(isCompletePartnerEntry({ ...base })).toBe(true);
    expect(isCompletePartnerEntry({ ...base, coveredArrondissements: [] })).toBe(false);
    expect(isCompletePartnerEntry({ ...base, websiteUrl: null })).toBe(false);
    expect(isCompletePartnerEntry({ ...base, kind: "association", coveredArrondissements: [] })).toBe(true);
    expect(getPartnerTrustState({ ...base, verificationStatus: "en_cours" })).toBe("pending");
    expect(getPartnerTrustState({ ...base, verificationStatus: "verifie" })).toBe("trusted");
    expect(getPartnerTrustState({ ...base, verificationStatus: "verifie", websiteUrl: null })).toBe("incomplete");
  });

  it("formats scope and contribution-specific public explanations", () => {
    expect(formatPartnerScopeLabel("local")).toBe("Réseau local");
    expect(formatPartnerScopeLabel("national")).toBe("Association nationale");
    expect(formatPartnerScopeLabel("france")).toBe("Couverture France");
    const base = { name: "Structure", coveredArrondissements: [1], location: "Paris", contributionTypes: ["materiel", "logistique"] as Array<"materiel" | "logistique" | "accueil" | "financement" | "communication">, kind: "commerce" };
    expect(buildPartnerWhyThisStructureMatters({ ...base, partnerScope: "national" })).toContain("association nationale");
    expect(buildPartnerWhyThisStructureMatters({ ...base })).toContain("du matériel et de la logistique");
    expect(buildPartnerWhyThisStructureMatters({ ...base, kind: "entreprise" })).toContain("acteur économique");
    expect(buildPartnerWhyThisStructureMatters({ ...base, kind: "association", contributionTypes: [] })).toContain("relie Structure");
    expect(buildPartnerWhyThisStructureMatters({ ...base, contributionTypes: ["accueil"] })).toContain("de l’accueil");
    expect(buildPartnerWhyThisStructureMatters({ ...base, contributionTypes: ["financement"] })).toContain("du financement");
    expect(buildPartnerWhyThisStructureMatters({ ...base, contributionTypes: ["communication"] })).toContain("de la communication");
  });
});
