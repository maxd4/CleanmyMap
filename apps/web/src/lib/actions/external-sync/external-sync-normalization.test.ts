import { describe, expect, it } from "vitest";
import { normalizeFondationMerEvent } from "./fondation-mer-adapter";
import { normalizeJagisEvent } from "./jagis-adapter";
import { buildExternalActionIdentityHash, isExternalActionPublishAdmissible } from "./normalization";

const observedAt = "2026-11-24T10:00:00.000Z";

describe("external action connector normalization", () => {
  it("normalizes synthetic Jagis fields without manufacturing absent measurements", () => {
    const event = normalizeJagisEvent({
      id: "fixture-jagis-1",
      url: "https://example.test/jagis/fixture-jagis-1",
      title: "Collecte de quartier — fixture",
      start_date: "2027-04-18",
      start_time: "10:30",
      meeting_point: "Place de test",
      city: "Paris",
      route_reference: "boucle fictive secteur A",
      status: "published",
    }, observedAt);

    expect(event).toMatchObject({ source: "jagis_pour_la_nature", actionDate: "2027-04-18", startTime: "10:30", externalStatus: "published" });
    expect(event).not.toHaveProperty("latitude");
    expect(event).not.toHaveProperty("volunteersCount");
    expect(event).not.toHaveProperty("wasteKg");
    expect(isExternalActionPublishAdmissible(event!, new Date("2026-11-24T12:00:00.000Z"))).toBe(true);
  });

  it("maps synthetic Fondation de la Mer records and rejects invalid source URLs", () => {
    const event = normalizeFondationMerEvent({
      reference: "fixture-mer-1",
      canonical_url: "https://example.test/mer/fixture-mer-1",
      name: "Opération de quartier — fixture",
      date: "2027-04-18",
      time_start: "10:30",
      meeting_place: "Place de test",
      municipality: "Paris",
      route_name: "boucle fictive secteur A",
      state: "published",
    }, observedAt);
    expect(event?.source).toBe("fondation_de_la_mer");
    expect(normalizeFondationMerEvent({
      reference: "fixture-bad",
      canonical_url: "http://example.test/event",
      name: "Invalide",
      date: "2027-04-18",
    }, observedAt)).toBeNull();
  });

  it("recognizes only an exact cross-source identity with complete matching facts", () => {
    const jagis = normalizeJagisEvent({
      id: "fixture-jagis-1", url: "https://example.test/j/1", title: "J", start_date: "2027-04-18", start_time: "10:30",
      meeting_point: "Place de Test", city: "Paris", route_reference: "boucle fictive secteur A", status: "published",
    }, observedAt)!;
    const mer = normalizeFondationMerEvent({
      reference: "fixture-mer-1", canonical_url: "https://example.test/m/1", name: "M", date: "2027-04-18", time_start: "10:30",
      meeting_place: "Place de Test", municipality: "Paris", route_name: "boucle fictive secteur A", state: "published",
    }, observedAt)!;

    expect(buildExternalActionIdentityHash(jagis, "association-brigade-verte-paris"))
      .toBe(buildExternalActionIdentityHash(mer, "association-brigade-verte-paris"));
    expect(buildExternalActionIdentityHash({ ...mer, startTime: undefined }, "association-brigade-verte-paris")).toBeNull();
    expect(buildExternalActionIdentityHash({ ...mer, actionDate: "2027-04-19" }, "association-brigade-verte-paris"))
      .not.toBe(buildExternalActionIdentityHash(jagis, "association-brigade-verte-paris"));
  });
});
