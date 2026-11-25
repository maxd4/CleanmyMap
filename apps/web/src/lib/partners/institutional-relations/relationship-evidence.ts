/** Private domain contract. Call only after server-side authorization and proof review. */
type ReviewStatus = "pending" | "verified" | "withdrawn";
type Origin = "direct" | "third_party" | "public_source";
type ContributionRole = "participation" | "organization" | "logistics" | "coordination";
type Activity =
  | { kind: "cleanmymap_action"; actionId: string }
  | { kind: "external_event"; sourceId: string };
type EvidenceBase = { reviewStatus: ReviewStatus; origin: Origin; evidenceRef: string };
export type RelationshipEvidence = EvidenceBase & (
  | { kind: "direct_exchange" | "outreach" | "meeting" | "commitment" | "followup" | "note" }
  | { kind: "explicit_support"; target: "cleanmymap" | "third_party" }
  | { kind: "completed_contribution"; activity: Activity; role: ContributionRole }
);

/** Flags are independent: a contribution is not proof of contact or support. */
export function derivePrivateInstitutionalDistinctions(facts: readonly RelationshipEvidence[]) {
  const result = { directContact: false, explicitSupport: false, effectiveContribution: false };
  for (const fact of facts) {
    if (fact.reviewStatus !== "verified" || !fact.evidenceRef.trim()) continue;
    if (fact.kind === "direct_exchange" && fact.origin === "direct") result.directContact = true;
    if (fact.kind === "explicit_support" && fact.target === "cleanmymap" && fact.origin !== "third_party") result.explicitSupport = true;
    if (fact.kind === "completed_contribution" && fact.origin !== "third_party") {
      const reference = fact.activity.kind === "cleanmymap_action" ? fact.activity.actionId : fact.activity.sourceId;
      if (reference.trim()) result.effectiveContribution = true;
    }
  }
  return result;
}
