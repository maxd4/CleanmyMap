import { describe, expect, it } from "vitest";
import {
  filterSpogomiExternalEvents,
  SPOGOMI_EXTERNAL_EVENTS,
  SPOGOMI_HISTORICAL_EXAMPLES,
  SPOGOMI_INTERNATIONAL_NEWS,
  SPOGOMI_INTERNATIONAL_SOURCES,
} from "./international-content";

describe("SPOGOMI international editorial contract", () => {
  it("keeps official references verified and the CleanMyMap relationship neutral", () => {
    expect(SPOGOMI_INTERNATIONAL_SOURCES).toHaveLength(5);
    expect(SPOGOMI_INTERNATIONAL_SOURCES.every((source) => source.href.startsWith("https://"))).toBe(true);
    expect(SPOGOMI_INTERNATIONAL_NEWS.every((item) => item.href.startsWith("https://"))).toBe(true);
    expect(SPOGOMI_INTERNATIONAL_SOURCES.map((source) => source.href)).toEqual(expect.arrayContaining([
      "https://spogomi.or.jp/rule/",
      "https://en.nf-spogomiwc.com/terms/",
      "https://www.artema-network.com/participer-spogomi",
    ]));
    expect(SPOGOMI_INTERNATIONAL_NEWS).toEqual(expect.arrayContaining([
      expect.objectContaining({ publishedAt: "2026-11-05", title: expect.objectContaining({ fr: expect.stringContaining("40 pays") }) }),
    ]));
    expect(SPOGOMI_HISTORICAL_EXAMPLES).toHaveLength(3);
    expect(SPOGOMI_HISTORICAL_EXAMPLES.every((example) => example.sourceUrl.startsWith("https://"))).toBe(true);
    expect(SPOGOMI_EXTERNAL_EVENTS.every((event) => event.cleanMyMapEventId === null)).toBe(true);
  });

  it("labels the 2027 World Cup as planned without inventing an exact date", () => {
    const event = SPOGOMI_EXTERNAL_EVENTS[0];
    expect(event.state).toBe("planned");
    expect(event.period.fr).toContain("date précise à confirmer");
  });

  it("keeps the French qualifier date announced separately from the planned Japan final", () => {
    const event = SPOGOMI_EXTERNAL_EVENTS.find((candidate) => candidate.id === "world-cup-2027-france");
    expect(event).toMatchObject({ state: "date_set", place: { fr: "Lieu à confirmer" }, cleanMyMapEventId: null });
    expect(event?.period.fr).toContain("5 juin 2027");
    expect(event?.sourceUrl).toBe("https://en.nf-spogomiwc.com/country/france/");
  });

  it("filters only the verified external references requested by the user", () => {
    expect(filterSpogomiExternalEvents(SPOGOMI_EXTERNAL_EVENTS, { year: 2027, country: "Japon" })).toHaveLength(1);
    expect(filterSpogomiExternalEvents(SPOGOMI_EXTERNAL_EVENTS, { year: 2026 })).toHaveLength(0);
  });
});
