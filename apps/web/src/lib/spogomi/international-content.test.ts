import { describe, expect, it } from "vitest";
import {
  filterSpogomiExternalEvents,
  SPOGOMI_EXTERNAL_EVENTS,
  SPOGOMI_INTERNATIONAL_NEWS,
  SPOGOMI_INTERNATIONAL_SOURCES,
} from "./international-content";

describe("SPOGOMI international editorial contract", () => {
  it("keeps official references verified and the CleanMyMap relationship neutral", () => {
    expect(SPOGOMI_INTERNATIONAL_SOURCES).toHaveLength(2);
    expect(SPOGOMI_INTERNATIONAL_SOURCES.every((source) => source.href.startsWith("https://"))).toBe(true);
    expect(SPOGOMI_INTERNATIONAL_NEWS.every((item) => item.href.startsWith("https://"))).toBe(true);
    expect(SPOGOMI_EXTERNAL_EVENTS.every((event) => event.cleanMyMapEventId === null)).toBe(true);
  });

  it("labels the 2027 World Cup as planned without inventing an exact date", () => {
    const event = SPOGOMI_EXTERNAL_EVENTS[0];
    expect(event.state).toBe("planned");
    expect(event.period.fr).toContain("date précise à confirmer");
  });

  it("filters only the verified external references requested by the user", () => {
    expect(filterSpogomiExternalEvents(SPOGOMI_EXTERNAL_EVENTS, { year: 2027, country: "Japon" })).toHaveLength(1);
    expect(filterSpogomiExternalEvents(SPOGOMI_EXTERNAL_EVENTS, { year: 2026 })).toHaveLength(0);
  });
});
