import { describe, expect, it } from "vitest";
import { normalizeSpogomiRegistrationCapacity, parseSpogomiRegistrationReadiness, readinessStatusLabel } from "./registration-readiness";

const item = (id: string, status: "complete" | "incomplete" | "not_verified") => ({ id, label: id, status, required: true, href: "#settings" });

describe("SPOGOMI registration readiness contract", () => {
  it.each([[1, 1], ["1", 1], ["2147483647", 2147483647]] as const)("normalizes valid capacity %s", (input, expected) => {
    expect(normalizeSpogomiRegistrationCapacity(input)).toBe(expected);
  });

  it.each(["0", "01", "2147483648"])("rejects non-canonical capacity %s", (input) => {
    expect(() => normalizeSpogomiRegistrationCapacity(input)).toThrow("représentable");
  });

  it("keeps mixed divisions independent and distinguishes incomplete from not verified", () => {
    const result = parseSpogomiRegistrationReadiness({
      eventId: "event-1",
      ready: false,
      policy: { minorsApplicable: false },
      editionItems: [item("safety", "not_verified"), { ...item("minor", "complete"), required: false }],
      divisions: [
        { divisionId: "casual", divisionType: "casual", ready: true, items: [item("schedule", "complete")] },
        { divisionId: "world", divisionType: "world_cup", ready: false, items: [item("schedule", "incomplete")] },
      ],
    });
    expect(result?.divisions.map((division) => [division.divisionId, division.ready])).toEqual([["casual", true], ["world", false]]);
    expect(result?.editionItems.map((entry) => entry.status)).toEqual(["not_verified", "complete"]);
    expect(readinessStatusLabel("not_verified")).toBe("Non vérifié");
  });

  it("rejects an untrusted checklist shape instead of opening by optimistic parsing", () => {
    expect(parseSpogomiRegistrationReadiness({ eventId: "event-1", ready: true, policy: {}, editionItems: [], divisions: [{ divisionId: "casual", divisionType: "casual", ready: true, items: [{ ...item("bad", "complete"), status: "unknown" }] }] })).toBeNull();
  });
});
