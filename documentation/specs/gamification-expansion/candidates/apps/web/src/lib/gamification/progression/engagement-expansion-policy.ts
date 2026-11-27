/** Candidate policy for the existing gamification registry and ledger. No I/O. */
export const ENGAGEMENT_POLICY_VERSION = "engagement-expansion-v1";
export const PROOF_KINDS = [
  "mobilized", "measured", "sorted", "formalities", "documented_route",
  "referral", "feedback_bug", "feedback_idea", "feedback_improvement",
  "participation", "organization", "cartography", "clean_zone", "learning_balance",
] as const;
export type ProofKind = (typeof PROOF_KINDS)[number];
export type QualifiedProof = {
  ownerId: string;
  kind: ProofKind;
  sourceId: string;
  occurredOn: string;
  actionId?: string;
};
export type CompleteProofSnapshot = {
  ownerId: string;
  completeKinds: readonly ProofKind[];
  proofs: readonly QualifiedProof[];
};
const ACTION_KINDS = new Set<ProofKind>([
  "mobilized", "measured", "sorted", "formalities", "documented_route",
  "participation", "organization", "cartography",
]);
const SOURCE_TABLES: Record<ProofKind, string> = {
  mobilized: "action_milestones", measured: "action_milestones", sorted: "action_milestones",
  formalities: "action_milestones", documented_route: "action_milestones",
  referral: "referral_contributions", feedback_bug: "community_bug_reports",
  feedback_idea: "community_bug_reports", feedback_improvement: "community_bug_reports",
  participation: "action_participants", organization: "actions", cartography: "action_geometry_contributions",
  clean_zone: "clean_zones", learning_balance: "quiz_type_balance_progress",
};
type Collection = { id: string; label: string; proof: ProofKind; parent: "organisation" | "product_feedback" | "cartography" | null; xp: number };
export const ENGAGEMENT_COLLECTIONS = [
  { id: "mobilisation", label: "Mobilisation", proof: "mobilized", parent: "organisation", xp: 0.5 },
  { id: "mesures", label: "Mesures traçables", proof: "measured", parent: "organisation", xp: 0.25 },
  { id: "tri", label: "Tri documenté", proof: "sorted", parent: "organisation", xp: 0.25 },
  { id: "formalites", label: "Formalités abouties", proof: "formalities", parent: null, xp: 0 },
  { id: "parcours", label: "Parcours documentés", proof: "documented_route", parent: null, xp: 0 },
  { id: "parrainage", label: "Parrainages utiles", proof: "referral", parent: null, xp: 0 },
  { id: "bugs", label: "Chasseur de bugs", proof: "feedback_bug", parent: null, xp: 0 },
  { id: "idees", label: "Force de proposition", proof: "feedback_idea", parent: null, xp: 0 },
  { id: "ameliorations", label: "Amélioration continue", proof: "feedback_improvement", parent: null, xp: 0 },
] as const satisfies readonly Collection[];
const FEEDBACK_KINDS = ["feedback_bug", "feedback_idea", "feedback_improvement"] as const;
type Milestone = { id: string; label: string; xp: number; requirements: readonly (readonly ProofKind[])[]; sameAction?: boolean };
export const ENGAGEMENT_MILESTONES = [
  { id: "terrain_cartographie", label: "Du terrain à la carte", xp: 0.5, requirements: [["participation"], ["cartography"]], sameAction: true },
  { id: "terrain_apprentissage", label: "Savoir et agir", xp: 0.5, requirements: [["participation"], ["learning_balance"]] },
  { id: "bilan_complet", label: "Bilan documenté", xp: 0.5, requirements: [["measured"], ["sorted"], ["documented_route"]], sameAction: true },
  { id: "mobilisation_responsable", label: "Mobiliser et documenter", xp: 0, requirements: [["mobilized"], ["measured"], ["sorted"]], sameAction: true },
  { id: "terrain_produit", label: "Du terrain au produit", xp: 0, requirements: [["participation"], FEEDBACK_KINDS] },
  { id: "feedback_polyvalent", label: "Améliorateur polyvalent", xp: 0, requirements: FEEDBACK_KINDS.map((kind) => [kind]) },
  { id: "parrain_actif", label: "Engagement partagé", xp: 0, requirements: [["participation"], ["referral"]] },
  { id: "terrain_zones_propres", label: "Agir et préserver", xp: 0, requirements: [["participation"], ["clean_zone"]] },
  { id: "contributeur_complet", label: "Contributeur complet", xp: 1, requirements: [["participation"], ["organization"], ["cartography"], ["clean_zone"], ["learning_balance"], FEEDBACK_KINDS] },
] as const satisfies readonly Milestone[];

const BASE_THRESHOLDS = [1, 3, 5, 10, 20] as const;
const MAX_SOURCE_ROWS = 100_000;
export function engagementThresholds(count: number): { reached: number[]; next: number } {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_SOURCE_ROWS) throw new Error("Invalid engagement count");
  const reached: number[] = BASE_THRESHOLDS.filter((threshold) => threshold <= count);
  for (let threshold = 30; threshold <= count; threshold += 10) reached.push(threshold);
  return { reached, next: BASE_THRESHOLDS.find((threshold) => threshold > count) ?? (Math.floor(count / 10) + 1) * 10 };
}
function compareProof(a: QualifiedProof, b: QualifiedProof): number {
  return a.occurredOn < b.occurredOn ? -1 : a.occurredOn > b.occurredOn ? 1 :
    a.sourceId < b.sourceId ? -1 : a.sourceId > b.sourceId ? 1 : 0;
}
function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}
function indexProofs(userId: string, snapshot: CompleteProofSnapshot): Map<ProofKind, QualifiedProof[]> {
  if (!userId || snapshot.ownerId !== userId) throw new Error("Foreign engagement snapshot");
  const complete = new Set(snapshot.completeKinds);
  if (PROOF_KINDS.some((kind) => !complete.has(kind))) throw new Error("Incomplete engagement snapshot");
  if (snapshot.proofs.length > PROOF_KINDS.length * MAX_SOURCE_ROWS) throw new Error("Engagement proof budget exceeded");
  const byKind = new Map<ProofKind, Map<string, QualifiedProof>>();
  for (const proof of snapshot.proofs) {
    if (proof.ownerId !== userId || !complete.has(proof.kind) || !PROOF_KINDS.includes(proof.kind) ||
      !proof.sourceId || !isCivilDate(proof.occurredOn) || (ACTION_KINDS.has(proof.kind) && !proof.actionId)) {
      throw new Error("Invalid or foreign engagement proof");
    }
    const rows = byKind.get(proof.kind) ?? new Map<string, QualifiedProof>();
    const key = ACTION_KINDS.has(proof.kind) ? proof.actionId! : proof.sourceId;
    const existing = rows.get(key);
    if (!existing || compareProof(proof, existing) < 0) rows.set(key, proof);
    if (rows.size > MAX_SOURCE_ROWS) throw new Error("Engagement proof budget exceeded");
    byKind.set(proof.kind, rows);
  }
  return new Map([...byKind].map(([kind, rows]) => [kind, [...rows.values()].sort(compareProof)]));
}
function earliest(proofs: readonly QualifiedProof[]): QualifiedProof | undefined {
  return proofs.reduce<QualifiedProof | undefined>((best, row) => !best || compareProof(row, best) < 0 ? row : best, undefined);
}
function latestDate(proofs: readonly QualifiedProof[]): string {
  return proofs.reduce((latest, proof) => proof.occurredOn > latest ? proof.occurredOn : latest, "");
}
function refs(proofs: readonly QualifiedProof[]) {
  return proofs.map((proof) => ({ kind: proof.kind, sourceTable: SOURCE_TABLES[proof.kind], sourceId: proof.sourceId, occurredOn: proof.occurredOn }));
}
function milestoneProofs(definition: Milestone, byKind: Map<ProofKind, QualifiedProof[]>): QualifiedProof[] | null {
  const requirements = definition.requirements.map((kinds) => kinds.flatMap((kind) => byKind.get(kind) ?? []));
  if (requirements.some((rows) => rows.length === 0)) return null;
  if (!definition.sameAction) return requirements.map((rows) => earliest(rows)!);
  const indexed = requirements.map((rows) => {
    const byAction = new Map<string, QualifiedProof>();
    for (const proof of rows) {
      if (!proof.actionId) continue;
      const current = byAction.get(proof.actionId);
      if (!current || compareProof(proof, current) < 0) byAction.set(proof.actionId, proof);
    }
    return byAction;
  });
  let best: { key: string; proofs: QualifiedProof[] } | null = null;
  for (const actionId of indexed[0]!.keys()) {
    const matches = indexed.map((rows) => rows.get(actionId));
    if (matches.some((proof) => !proof)) continue;
    const proofs = matches as QualifiedProof[];
    const key = `${latestDate(proofs)}:${actionId}`;
    if (!best || key < best.key) best = { key, proofs };
  }
  return best?.proofs ?? null;
}
export type EngagementFact = {
  mechanicId: string; eventType: "engagement_collection_tier" | "engagement_milestone_unlock";
  sourceTable: string; sourceId: string; occurredOn: string; statusPhase: "validated";
  threshold?: number; xpAwarded: number; badgeId: string; metadata: Record<string, unknown>;
};
function makeFact(id: string, eventType: EngagementFact["eventType"], table: string, proofs: QualifiedProof[], xpAwarded: number, threshold?: number): EngagementFact {
  return {
    mechanicId: id, eventType, sourceTable: table, sourceId: `${id}:${threshold ?? "once"}`,
    occurredOn: latestDate(proofs), statusPhase: "validated", threshold, xpAwarded, badgeId: id,
    metadata: { policyVersion: ENGAGEMENT_POLICY_VERSION, proofs: refs(proofs) },
  };
}
/** Pure expected awards; persistence and actual XP are owned by the existing reconciler. */
export function buildEngagementExpansion(userId: string, snapshot: CompleteProofSnapshot) {
  const byKind = indexProofs(userId, snapshot);
  const facts: EngagementFact[] = [];
  const creditByAction = new Map<string, EngagementFact>();
  const collections = ENGAGEMENT_COLLECTIONS.map((definition) => {
    const rows = byKind.get(definition.proof) ?? [];
    const { reached, next } = engagementThresholds(rows.length);
    const mechanicId = `engagement_collection:${definition.id}`;
    for (const threshold of reached) {
      const proof = rows[threshold - 1]!;
      const fact = makeFact(mechanicId, "engagement_collection_tier", SOURCE_TABLES[definition.proof], [proof], 0, threshold);
      facts.push(fact);
      const xp = threshold === 1 ? 0 : definition.xp;
      if (xp === 0 || !proof.actionId) continue;
      const previous = creditByAction.get(proof.actionId);
      if (!previous || xp > previous.xpAwarded || (xp === previous.xpAwarded && fact.mechanicId < previous.mechanicId)) {
        if (previous) previous.xpAwarded = 0;
        fact.xpAwarded = xp;
        creditByAction.set(proof.actionId, fact);
      }
    }
    return { id: mechanicId, label: definition.label, count: rows.length, currentTier: reached.at(-1) ?? 0, nextTier: next };
  });
  const milestones = ENGAGEMENT_MILESTONES.map((definition) => {
    const proofs = milestoneProofs(definition, byKind);
    const mechanicId = `engagement_milestone:${definition.id}`;
    if (proofs) facts.push(makeFact(mechanicId, "engagement_milestone_unlock", "engagement_composite", proofs, definition.xp));
    return { id: mechanicId, label: definition.label, achieved: proofs !== null, achievedAt: proofs ? latestDate(proofs) : null };
  });
  return { facts, collections, milestones };
}
