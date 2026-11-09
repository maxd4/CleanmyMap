import { describe, expect, it } from "vitest";
import {
  buildSpogomiLifecycleProjection,
  classifySpogomiCalendarStatus,
  classifySpogomiRegistrationStatus,
  classifySpogomiResultsStatus,
  combineSpogomiResultsStatuses,
} from "./lifecycle";

const now = new Date("2026-11-09T12:00:00.000Z");

describe("SPOGOMI lifecycle projection", () => {
  it.each([
    ["before start", "2026-11-09T12:00:01.000Z", "2026-11-09T12:00:02.000Z", "upcoming"],
    ["at start", "2026-11-09T12:00:00.000Z", "2026-11-09T12:30:00.000Z", "in_progress"],
    ["at end", "2026-11-09T11:00:00.000Z", "2026-11-09T12:00:00.000Z", "finished"],
    ["after end", "2026-11-09T11:00:00.000Z", "2026-11-09T11:59:59.000Z", "finished"],
  ])("classifies the calendar at the %s boundary", (_label, startsAt, endsAt, expected) => {
    expect(classifySpogomiCalendarStatus({ startsAt, endsAt, state: "registration_open", now })).toBe(expected);
  });

  it("keeps cancellation and a proved postponement explicit, without inferring either from dates", () => {
    expect(classifySpogomiCalendarStatus({ startsAt: "2020-01-01T00:00:00Z", endsAt: null, state: "cancelled", now })).toBe("cancelled");
    expect(classifySpogomiCalendarStatus({ startsAt: "2020-01-01T00:00:00Z", endsAt: null, state: "in_progress", postponedProof: true, now })).toBe("postponed");
    expect(classifySpogomiCalendarStatus({ startsAt: "2020-01-01T00:00:00Z", endsAt: null, state: "certified", now })).toBe("in_progress");
  });

  it("uses instants from explicit offsets and does not use the browser timezone", () => {
    expect(classifySpogomiCalendarStatus({ startsAt: "2026-11-09T13:00:00+01:00", endsAt: "2026-11-09T14:00:00+01:00", state: "in_progress", now })).toBe("in_progress");
    expect(classifySpogomiCalendarStatus({ startsAt: "2026-11-09T14:00:00+01:00", endsAt: null, state: "in_progress", now })).toBe("upcoming");
  });

  it("keeps capacity reached inside the registration-open state", () => {
    expect(classifySpogomiRegistrationStatus({ state: "draft", registeredCount: 0, capacity: 10 })).toBe("not_open");
    expect(classifySpogomiRegistrationStatus({ state: "registration_open", registeredCount: 3, capacity: 10 })).toBe("open");
    expect(classifySpogomiRegistrationStatus({ state: "registration_open", registeredCount: 10, capacity: 10 })).toBe("capacity_reached");
    expect(classifySpogomiRegistrationStatus({ state: "in_progress", registeredCount: 3, capacity: 10 })).toBe("closed");
    expect(classifySpogomiRegistrationStatus({ state: "cancelled", registeredCount: 10, capacity: 10 })).toBe("closed");
    expect(classifySpogomiRegistrationStatus({ state: "archived", registeredCount: 10, capacity: 10 })).toBe("closed");
    expect(classifySpogomiRegistrationStatus({ state: "registration_open", registeredCount: 10, capacity: null })).toBe("open");
  });

  it("does not turn a publication policy into certified or published results", () => {
    expect(classifySpogomiResultsStatus({ publicVisibility: "published", publicResultsVisibility: "certified", hasProvisionalResults: false, hasCertifiedResults: false })).toBe("unavailable");
    expect(classifySpogomiResultsStatus({ publicVisibility: "published", publicResultsVisibility: "certified", hasProvisionalResults: true, hasCertifiedResults: false })).toBe("unavailable");
    expect(classifySpogomiResultsStatus({ publicVisibility: "published", publicResultsVisibility: "provisional", hasProvisionalResults: true, hasCertifiedResults: false })).toBe("provisional");
    expect(classifySpogomiResultsStatus({ publicVisibility: "published", publicResultsVisibility: "hidden", hasProvisionalResults: false, hasCertifiedResults: true })).toBe("certified");
    expect(classifySpogomiResultsStatus({ publicVisibility: "published", publicResultsVisibility: "certified", hasProvisionalResults: false, hasCertifiedResults: true })).toBe("published");
    expect(classifySpogomiResultsStatus({ publicVisibility: "private", publicResultsVisibility: "certified", hasProvisionalResults: false, hasCertifiedResults: true })).toBe("certified");
  });

  it("does not overstate a mixed edition when one division has no results", () => {
    expect(combineSpogomiResultsStatuses(["published", "unavailable"])).toBe("provisional");
    expect(combineSpogomiResultsStatuses(["certified", "published"])).toBe("certified");
    expect(combineSpogomiResultsStatuses([])).toBe("unavailable");
  });

  it("returns the three dimensions together", () => {
    expect(buildSpogomiLifecycleProjection({
      startsAt: "2026-11-09T13:00:00Z",
      endsAt: "2026-11-09T15:00:00Z",
      state: "registration_open",
      registeredCount: 2,
      capacity: 2,
      publicVisibility: "published",
      publicResultsVisibility: "certified",
      hasProvisionalResults: false,
      hasCertifiedResults: false,
      now,
    })).toEqual({ calendar: "upcoming", registration: "capacity_reached", results: "unavailable" });
  });
});
