import { computeRelationThickness, PARIS_RELATION_TYPE_META, type ParisCleanwalkRelation } from "@/lib/partners/paris-cleanwalk-network";

/** Area grows with the number of documented distinct neighbours, not influence. */
export function getNetworkLogoDiameter(neighbours: number): number {
  const count = Number.isFinite(neighbours) ? Math.max(0, neighbours) : 0;
  return Math.min(92, Math.sqrt(32 * 32 + 220 * count));
}

export function getNetworkRelationVisual(relation: ParisCleanwalkRelation) {
  const meta = PARIS_RELATION_TYPE_META[relation.relationType];
  const uncertain = relation.source.certainty !== "verifie";
  const dash = meta.dashPattern === "dotted" ? "2 5" : meta.dashPattern === "dashed" || uncertain ? "7 5" : undefined;
  const colors = {
    collaboration_programmee: "#b45309", action_commune: "#6d28d9",
    publie_sur: "#0369a1", partenariat: "#4338ca", soutien_rse: "#a21caf",
    appui_logistique: "#0f766e", presence_evenement: "#475569",
  } as const;
  return { color: colors[relation.relationType], dash, weight: computeRelationThickness(relation).thickness, label: meta.label };
}
