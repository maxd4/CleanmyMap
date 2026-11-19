import {
  PARIS_ACTOR_CATEGORY_META,
  PARIS_CLEANWALK_REFERENCE_DATE,
  PARIS_RELATION_TYPE_META,
  computeRelationThickness,
  type EquipmentStatus,
  type ParisActorCategory,
  type ParisCleanwalkActor,
  type ParisCleanwalkRelation,
  type ParisEcosystemRole,
  type ParisRelationType,
  type ParticipationModality,
} from "@/lib/partners/paris-cleanwalk-network";

export interface ParisNetwork3DFilters {
  category: ParisActorCategory | "all";
  ecosystemRole?: ParisEcosystemRole | "all";
  participation: ParticipationModality | "all";
  arrondissement: number | "all";
  equipment: EquipmentStatus | "all";
  relationType: ParisRelationType | "all";
}

export const DEFAULT_PARIS_NETWORK_3D_FILTERS: ParisNetwork3DFilters = {
  category: "all",
  ecosystemRole: "all",
  participation: "all",
  arrondissement: "all",
  equipment: "all",
  relationType: "all",
};

export interface ParisNetwork3DNode {
  actor: ParisCleanwalkActor;
  position: [number, number, number];
  colorHex: string;
  radius: number;
}

export interface ParisNetwork3DEdge {
  relation: ParisCleanwalkRelation;
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  thickness: number;
  operationsCount12m: number | null;
  isNeutralFallback: boolean;
  colorHex: string;
  dashPattern: "solid" | "dashed" | "dotted";
}

const CLUSTER_CENTERS: Record<ParisActorCategory, [number, number, number]> = {
  association_locale: [-4.2, 1.4, 1.2],
  reseau_evenement: [4.2, 1.8, -1.0],
  collectivite_mairie: [0.0, -2.6, 2.2],
  entreprise_rse: [3.4, -2.0, -2.4],
  plateforme_mise_en_relation: [-3.8, -2.4, -1.8],
};

function matchesActorFilters(
  actor: ParisCleanwalkActor,
  filters: ParisNetwork3DFilters,
): boolean {
  if (filters.category !== "all" && actor.category !== filters.category) {
    return false;
  }
  if (
    filters.ecosystemRole &&
    filters.ecosystemRole !== "all" &&
    !actor.ecosystemRoles.includes(filters.ecosystemRole)
  ) {
    return false;
  }
  if (
    filters.participation !== "all" &&
    !actor.participationModalities.includes(filters.participation)
  ) {
    return false;
  }
  if (
    filters.arrondissement !== "all" &&
    !actor.parisZone.arrondissements.includes(filters.arrondissement)
  ) {
    return false;
  }
  if (
    filters.equipment !== "all" &&
    actor.equipmentAvailability.status !== filters.equipment
  ) {
    return false;
  }
  return true;
}

export function filterParisNetwork(
  actors: readonly ParisCleanwalkActor[],
  relations: readonly ParisCleanwalkRelation[],
  filters: ParisNetwork3DFilters,
): {
  actors: ParisCleanwalkActor[];
  relations: ParisCleanwalkRelation[];
} {
  const matchingActors = actors.filter((actor) =>
    matchesActorFilters(actor, filters),
  );
  const actorIds = new Set(matchingActors.map((actor) => actor.id));

  let matchingRelations = relations.filter(
    (rel) => actorIds.has(rel.sourceId) && actorIds.has(rel.targetId),
  );

  if (filters.relationType !== "all") {
    matchingRelations = matchingRelations.filter(
      (rel) => rel.relationType === filters.relationType,
    );
    const linkedActorIds = new Set<string>();
    for (const rel of matchingRelations) {
      linkedActorIds.add(rel.sourceId);
      linkedActorIds.add(rel.targetId);
    }
    return {
      actors: matchingActors.filter((actor) => linkedActorIds.has(actor.id)),
      relations: matchingRelations,
    };
  }

  return {
    actors: matchingActors,
    relations: matchingRelations,
  };
}

export function computeParisNetwork3DLayout(
  actors: readonly ParisCleanwalkActor[],
  relations: readonly ParisCleanwalkRelation[],
  referenceDateIso: string = PARIS_CLEANWALK_REFERENCE_DATE,
): {
  nodes: ParisNetwork3DNode[];
  edges: ParisNetwork3DEdge[];
} {
  const grouped = new Map<ParisActorCategory, ParisCleanwalkActor[]>();
  for (const actor of actors) {
    const bucket = grouped.get(actor.category) ?? [];
    bucket.push(actor);
    grouped.set(actor.category, bucket);
  }

  const nodes: ParisNetwork3DNode[] = [];
  const positionById = new Map<string, [number, number, number]>();

  for (const [category, groupActors] of grouped.entries()) {
    const [cx, cy, cz] = CLUSTER_CENTERS[category];
    const count = groupActors.length;
    const colorHex = PARIS_ACTOR_CATEGORY_META[category].colorHex;

    groupActors.forEach((actor, index) => {
      const angle = count === 1 ? 0 : (index / count) * Math.PI * 2;
      const spread = count === 1 ? 0 : 2.1 + (index % 2) * 0.65;
      const x = Number((cx + Math.cos(angle) * spread).toFixed(3));
      const y = Number(
        (cy + Math.sin(angle) * (spread * 0.85) + (index % 2 === 0 ? 0.25 : -0.25)).toFixed(3),
      );
      const z = Number((cz + Math.sin(angle * 2) * 1.25).toFixed(3));
      const position: [number, number, number] = [x, y, z];

      positionById.set(actor.id, position);
      nodes.push({
        actor,
        position,
        colorHex,
        radius: actor.roles.includes("fournisseur_materiel") ? 0.56 : 0.46,
      });
    });
  }

  const edges: ParisNetwork3DEdge[] = [];
  for (const relation of relations) {
    const sourcePosition = positionById.get(relation.sourceId);
    const targetPosition = positionById.get(relation.targetId);
    if (!sourcePosition || !targetPosition) {
      continue;
    }
    const { thickness, operationsCount12m, isNeutralFallback } =
      computeRelationThickness(relation, referenceDateIso);
    const meta = PARIS_RELATION_TYPE_META[relation.relationType];
    edges.push({
      relation,
      sourcePosition,
      targetPosition,
      thickness,
      operationsCount12m,
      isNeutralFallback,
      colorHex: meta.colorHex,
      dashPattern: meta.dashPattern,
    });
  }

  return { nodes, edges };
}

export function getConnectedActorIds(
  actorId: string | null,
  relations: readonly ParisCleanwalkRelation[],
): Set<string> {
  const connected = new Set<string>();
  if (!actorId) return connected;
  connected.add(actorId);
  for (const rel of relations) {
    if (rel.sourceId === actorId) connected.add(rel.targetId);
    if (rel.targetId === actorId) connected.add(rel.sourceId);
  }
  return connected;
}

export function detectWebGLSupport(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}
