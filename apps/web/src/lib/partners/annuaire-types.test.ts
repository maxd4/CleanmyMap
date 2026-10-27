import { describe, expect, it } from "vitest";
import { isPublishedAnnuaireEntry } from "./annuaire-types";

const validEntry = {
  id: "partner-1",
  name: "Association locale",
  legalIdentity: "Association locale loi 1901",
  kind: "association",
  types: ["environnemental"],
  description: "Une description publique.",
  location: "Paris",
  lat: 48.85,
  lng: 2.35,
  coveredArrondissements: [11],
  contributionTypes: ["accueil"],
  provenance: "published_partner",
  verificationStatus: "verifie",
  qualificationStatus: "partenaire_actif",
  availability: "Sur rendez-vous",
  lastUpdatedAt: "2026-10-01T00:00:00.000Z",
};

describe("isPublishedAnnuaireEntry", () => {
  it("accepts a complete published entry and optional scope variants", () => {
    expect(isPublishedAnnuaireEntry(validEntry)).toBe(true);
    expect(isPublishedAnnuaireEntry({ ...validEntry, scope: "local" })).toBe(true);
    expect(isPublishedAnnuaireEntry({ ...validEntry, scope: "national" })).toBe(true);
    expect(isPublishedAnnuaireEntry({ ...validEntry, scope: "france" })).toBe(true);
    expect(isPublishedAnnuaireEntry({ ...validEntry, scope: undefined })).toBe(true);
  });

  it("rejects nullish and array values before inspecting fields", () => {
    expect(isPublishedAnnuaireEntry(null)).toBe(false);
    expect(isPublishedAnnuaireEntry([])).toBe(false);
  });

  it.each([
    ["id", { id: 1 }],
    ["name", { name: 1 }],
    ["legal identity", { legalIdentity: 1 }],
    ["kind", { kind: "other" }],
    ["scope", { scope: "other" }],
    ["types", { types: [1] }],
    ["description", { description: 1 }],
    ["location", { location: 1 }],
    ["latitude", { lat: "48.85" }],
    ["infinite longitude", { lng: Number.POSITIVE_INFINITY }],
    ["covered arrondissements", { coveredArrondissements: ["11"] }],
    ["contribution types", { contributionTypes: [1] }],
    ["provenance", { provenance: "editorial_seed" }],
    ["verification status", { verificationStatus: "pending" }],
    ["qualification status", { qualificationStatus: "pending" }],
    ["availability", { availability: null }],
    ["last updated", { lastUpdatedAt: 1 }],
  ])("rejects an invalid %s without throwing", (_label, change) => {
    expect(isPublishedAnnuaireEntry({ ...validEntry, ...change })).toBe(false);
  });
});
