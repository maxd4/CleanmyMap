import { describe, expect, it } from "vitest";
import { dateTimeInput, dateTimeIso } from "./spogomi-field-operations-schedule";

describe("SPOGOMI official schedule timezone conversion", () => {
  it("converts a normal local time in the declared IANA zone", () => {
    expect(dateTimeIso("2027-01-15T12:30", "Europe/Paris")).toBe("2027-01-15T11:30:00.000Z");
  });

  it("rejects the spring-forward gap instead of normalizing it", () => {
    expect(() => dateTimeIso("2027-03-28T02:30", "Europe/Paris")).toThrow("n’existe pas");
  });

  it("rejects an autumn overlap instead of choosing an arbitrary occurrence", () => {
    expect(() => dateTimeIso("2027-10-31T02:30", "Europe/Paris")).toThrow("ambigu");
  });

  it("rejects an invalid IANA zone without falling back to UTC", () => {
    expect(() => dateTimeIso("2027-01-15T12:30", "Not/AZone")).toThrow("IANA");
  });

  it("preserves the exact persisted instant, including seconds, on an unchanged field", () => {
    const persisted = "2027-01-15T11:30:37.456Z";
    const localValue = dateTimeInput(persisted, "Europe/Paris");
    expect(localValue).toBe("2027-01-15T12:30");
    expect(dateTimeIso(localValue, "Europe/Paris", { localValue, instant: persisted })).toBe(persisted);
  });

  it("keeps persisted instants fixed when only the displayed timezone changes", () => {
    const persisted = "2027-01-15T11:30:37.456Z";
    const localValue = dateTimeInput(persisted, "Europe/Paris");
    expect(dateTimeIso(localValue, "America/New_York", { localValue, instant: persisted })).toBe(persisted);
    expect(dateTimeIso("2027-01-15T06:30", "America/New_York")).toBe("2027-01-15T11:30:00.000Z");
  });
});
