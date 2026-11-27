import { strict as assert } from "node:assert";
import { describe, it } from "vitest";
import { buildEngagementExpansion, engagementThresholds, ENGAGEMENT_COLLECTIONS, ENGAGEMENT_MILESTONES, PROOF_KINDS, type ProofKind, type QualifiedProof } from "./engagement-expansion-policy";

const ownerId = "user-1";
function proof(kind: ProofKind, sourceId: string, actionId?: string, occurredOn = "2026-01-01"): QualifiedProof {
  return { ownerId, kind, sourceId, actionId, occurredOn };
}
function build(proofs: QualifiedProof[]) {
  return buildEngagementExpansion(ownerId, { ownerId, completeKinds: PROOF_KINDS, proofs });
}
function milestones(result: ReturnType<typeof build>) {
  return result.milestones.filter((row) => row.achieved).map((row) => row.id);
}
function collection(result: ReturnType<typeof build>, id: string) {
  return result.collections.find((row) => row.id === `engagement_collection:${id}`)!;
}

describe("engagement expansion policy", () => {
  it("exposes unique definitions, empty progress and no reward without evidence", () => {
    const result = build([]);
    assert.equal(new Set([...ENGAGEMENT_COLLECTIONS, ...ENGAGEMENT_MILESTONES].map((x) => x.id)).size, 18);
    assert.equal(result.collections.length, 9);
    assert.equal(result.milestones.length, 9);
    assert.deepEqual(result.facts, []);
    assert.ok(result.collections.every((row) => row.count === 0 && row.nextTier === 1));
  });
  it("continues tiers beyond 20 and rejects invalid counts", () => {
    for (const [count, next] of [[0, 1], [1, 3], [3, 5], [5, 10], [19, 20], [20, 30], [29, 30], [30, 40], [1000, 1010]]) {
      assert.equal(engagementThresholds(count!).next, next);
      assert.ok(engagementThresholds(count!).reached.every((value) => value <= count!));
    }
    for (const count of [-1, 1.1, Infinity, NaN, 100001]) assert.throws(() => engagementThresholds(count));
  });
  it("rejects foreign and incomplete snapshots, foreign proofs, missing actions and impossible dates", () => {
    assert.throws(() => buildEngagementExpansion(ownerId, { ownerId: "other", completeKinds: PROOF_KINDS, proofs: [] }), /Foreign/);
    assert.throws(() => buildEngagementExpansion(ownerId, { ownerId, completeKinds: [], proofs: [] }), /Incomplete/);
    assert.throws(() => build([{ ...proof("referral", "r"), ownerId: "other" }]), /foreign/);
    assert.throws(() => build([proof("sorted", "s")]), /Invalid/);
    assert.throws(() => build([proof("feedback_bug", "b", undefined, "2026-02-30")]), /Invalid/);
  });
  it("deduplicates actions, not merely proof rows, and does not credit first tier twice", () => {
    const result = build([proof("sorted", "s1", "a"), proof("sorted", "s2", "a"), proof("sorted", "s1", "a")]);
    assert.equal(collection(result, "tri").count, 1);
    assert.equal(result.facts.length, 1);
    assert.equal(result.facts[0]!.xpAwarded, 0);
  });
  it("credits only the highest new recurring bonus for an action and preserves all badges", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ["mobilized", "measured", "sorted"].map((kind) => proof(kind as ProofKind, `p${i}`, `a${i}`))).flat();
    const result = build(rows);
    const tiers = result.facts.filter((row) => row.eventType === "engagement_collection_tier");
    assert.equal(tiers.length, 9);
    assert.equal(tiers.reduce((sum, row) => sum + row.xpAwarded, 0), 1);
    assert.deepEqual(build([...rows].reverse()), result);
  });
  it("does not infer a same-action milestone from unrelated actions", () => {
    const rows = [proof("participation", "p", "a"), proof("cartography", "c", "b")];
    assert.ok(!milestones(build(rows)).includes("engagement_milestone:terrain_cartographie"));
    const result = build([...rows, proof("cartography", "c2", "a", "2026-02-01")]);
    const awarded = result.facts.find((row) => row.mechanicId === "engagement_milestone:terrain_cartographie")!;
    assert.equal(awarded.occurredOn, "2026-02-01");
    assert.equal(awarded.xpAwarded, 0.5);
  });
  it("retains stable tier and one-shot identities across proof replacement and removes invalidated rewards", () => {
    const first = build([proof("participation", "p", "a"), proof("cartography", "c", "a")]);
    const replacement = build([proof("participation", "p2", "b"), proof("cartography", "c2", "b")]);
    assert.deepEqual(first.facts.map((row) => row.sourceId), replacement.facts.map((row) => row.sourceId));
    assert.equal(build([proof("participation", "p", "a")]).facts.length, 0);
    const tri = build([proof("sorted", "s1", "a"), proof("sorted", "s2", "b"), proof("sorted", "s3", "c")]);
    assert.deepEqual(tri.facts.map((row) => row.threshold), [1, 3]);
    assert.deepEqual(build([proof("sorted", "s1", "a"), proof("sorted", "s2", "b")]).facts.map((row) => row.threshold), [1]);
  });
  it("recognizes accepted feedback categories and useful referral collections without additional XP", () => {
    const rows = [proof("feedback_bug", "b"), proof("feedback_idea", "i"), proof("feedback_improvement", "m"), proof("referral", "r")];
    const result = build(rows);
    assert.equal(result.facts.reduce((sum, row) => sum + row.xpAwarded, 0), 0);
    assert.ok(milestones(result).includes("engagement_milestone:feedback_polyvalent"));
    assert.equal(collection(result, "parrainage").count, 1);
  });
  it("requires every independent domain for the complete contributor and awards it once", () => {
    const rows = [proof("participation", "p", "a"), proof("organization", "o", "b"), proof("cartography", "c", "c"), proof("clean_zone", "z"), proof("learning_balance", "q"), proof("feedback_bug", "f")];
    const result = build([...rows, ...rows]);
    assert.equal(result.facts.filter((row) => row.mechanicId === "engagement_milestone:contributeur_complet").length, 1);
    assert.ok(!milestones(build(rows.slice(0, -1))).includes("engagement_milestone:contributeur_complet"));
  });
});
