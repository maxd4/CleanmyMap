import { describe, expect, it } from "vitest";
import {
  canReopenSpogomiParticipant,
  isSpogomiAdmissionTransitionAllowed,
  requiresSpogomiQuizForNewAdmission,
} from "./registration-lifecycle";

describe("SPOGOMI registration lifecycle", () => {
  it.each([
    ["pending", "approved"],
    ["pending", "rejected"],
    ["pending", "cancelled"],
    ["approved", "approved"],
    ["rejected", "rejected"],
    ["cancelled", "cancelled"],
  ] as const)("allows %s -> %s", (current, target) => {
    expect(isSpogomiAdmissionTransitionAllowed(current, target)).toBe(true);
  });

  it.each([
    ["approved", "rejected"],
    ["approved", "cancelled"],
    ["rejected", "approved"],
    ["cancelled", "approved"],
  ] as const)("rejects an impossible transition %s -> %s", (current, target) => {
    expect(isSpogomiAdmissionTransitionAllowed(current, target)).toBe(false);
  });

  it("requires the quiz only for a new self-service sport registration", () => {
    expect(requiresSpogomiQuizForNewAdmission({ requestKind: "registration", hasActiveRequest: false, hasRegisteredParticipant: false })).toBe(true);
    expect(requiresSpogomiQuizForNewAdmission({ requestKind: "registration", hasActiveRequest: true, hasRegisteredParticipant: false })).toBe(false);
    expect(requiresSpogomiQuizForNewAdmission({ requestKind: "team_join", hasActiveRequest: false, hasRegisteredParticipant: false })).toBe(false);
    expect(requiresSpogomiQuizForNewAdmission({ requestKind: "presence_regularization", hasActiveRequest: false, hasRegisteredParticipant: false })).toBe(false);
  });

  it("reopens only a withdrawn direct-registration participant in the same division", () => {
    expect(canReopenSpogomiParticipant({ registrationStatus: "withdrawn", sourceSystem: "direct_registration", sameDivision: true })).toBe(true);
    expect(canReopenSpogomiParticipant({ registrationStatus: "withdrawn", sourceSystem: "manual_roster", sameDivision: true })).toBe(false);
    expect(canReopenSpogomiParticipant({ registrationStatus: "withdrawn", sourceSystem: "direct_registration", sameDivision: false })).toBe(false);
    expect(canReopenSpogomiParticipant({ registrationStatus: "registered", sourceSystem: "direct_registration", sameDivision: true })).toBe(false);
  });
});
