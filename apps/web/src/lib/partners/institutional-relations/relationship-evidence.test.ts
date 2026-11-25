import { describe, expect, it } from "vitest";
import { derivePrivateInstitutionalDistinctions, type RelationshipEvidence } from "./relationship-evidence";
const verified = { reviewStatus: "verified", origin: "direct", evidenceRef: "proof" } as const;
const neutral = { directContact: false, explicitSupport: false, effectiveContribution: false };

describe("private institutional distinctions", () => {
  it("does not equate outreach, promises or a third-party report with direct cooperation", () => {
    const facts: RelationshipEvidence[] = [
      { ...verified, kind: "outreach" }, { ...verified, kind: "commitment" },
      { ...verified, kind: "direct_exchange", origin: "third_party" },
      { ...verified, kind: "explicit_support", target: "cleanmymap", origin: "third_party" },
      { ...verified, kind: "completed_contribution", origin: "third_party", activity: { kind: "cleanmymap_action", actionId: "action" }, role: "logistics" },
    ];
    expect(derivePrivateInstitutionalDistinctions(facts)).toEqual(neutral);
  });
  it("requires reviewed evidence and never infers one flag from another", () => {
    const contribution: RelationshipEvidence = { ...verified, kind: "completed_contribution", activity: { kind: "external_event", sourceId: "event" }, role: "coordination", origin: "public_source" };
    expect(derivePrivateInstitutionalDistinctions([contribution])).toEqual({ ...neutral, effectiveContribution: true });
    expect(derivePrivateInstitutionalDistinctions([{ ...contribution, reviewStatus: "withdrawn" }])).toEqual(neutral);
    expect(derivePrivateInstitutionalDistinctions([{ ...contribution, evidenceRef: " " }])).toEqual(neutral);
  });
  it("combines separately verified facts", () => {
    expect(derivePrivateInstitutionalDistinctions([
      { ...verified, kind: "direct_exchange" }, { ...verified, kind: "explicit_support", target: "cleanmymap" },
      { ...verified, kind: "completed_contribution", activity: { kind: "cleanmymap_action", actionId: "action" }, role: "participation" },
    ])).toEqual({ directContact: true, explicitSupport: true, effectiveContribution: true });
  });
});
