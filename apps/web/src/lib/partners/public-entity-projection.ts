import {
  PARIS_CLEANWALK_ACTORS,
  PARIS_CLEANWALK_RELATIONS,
  type ParisCleanwalkActor,
  type ParisCleanwalkRelation,
} from "./paris-cleanwalk-network";
import {
  PARIS_PUBLIC_CLEANLINESS_DATASET,
  PARIS_PUBLIC_CLEANLINESS_RELATIONS,
  PUBLIC_CLEANLINESS_SOURCES,
  type OrganizationSource,
  type PublicCleanlinessOrganizationNode,
  type PublicCleanlinessOrganizationRelation,
} from "./public-cleanliness-organization";
import {
  resolveInstitutionId,
  resolveInstitutionNetworkActorId,
} from "./public-cleanliness-network-links";
import {
  getActorStructureContext,
  getInstitutionStructureContext,
  getPublicStructureSource,
  type PublicStructureLimit,
  type PublicStructureMetric,
  type PublicStructureSource,
} from "./public-structure-context";
import { INITIAL_ANNUAIRE_ENTRIES } from "@/components/sections/rubriques/annuaire/seed-index";

type AnnuaireEntry = (typeof INITIAL_ANNUAIRE_ENTRIES)[number];

export type CanonicalPublicEntityRef = {
  annuaireEntryId?: string | null;
  networkActorId?: string | null;
  institutionId?: string | null;
};

export type CanonicalPublicEntityProjection = {
  identity: {
    annuaireEntryId: string | null;
    networkActorId: string | null;
    institutionId: string | null;
    name: string;
  };
  territories: readonly string[];
  publicReferents: readonly string[];
  relations: readonly ParisCleanwalkRelation[];
  institutionRelations: readonly PublicCleanlinessOrganizationRelation[];
  metrics: readonly PublicStructureMetric[];
  limits: readonly PublicStructureLimit[];
  sources: readonly PublicStructureSource[];
  institutionSources: readonly OrganizationSource[];
  scopeNotes: {
    hasAnnuaireEntry: boolean;
    hasNetworkActor: boolean;
    hasInstitutionNode: boolean;
  };
};

function resolveExplicitAnnuaireEntry(id?: string | null): AnnuaireEntry | null {
  if (!id) return null;
  const matches = INITIAL_ANNUAIRE_ENTRIES.filter((entry) => entry.id === id);
  return matches.length === 1 ? matches[0] : null;
}

function resolveExplicitNetworkActor(
  ref: CanonicalPublicEntityRef,
  institutionNode: PublicCleanlinessOrganizationNode | null,
): ParisCleanwalkActor | null {
  if (institutionNode) {
    const resolvedId = resolveInstitutionNetworkActorId(
      PARIS_PUBLIC_CLEANLINESS_DATASET,
      institutionNode,
      PARIS_CLEANWALK_ACTORS,
    );
    if (!resolvedId) return null;
    if (ref.networkActorId && ref.networkActorId !== resolvedId) return null;
    return PARIS_CLEANWALK_ACTORS.find((a) => a.id === resolvedId) ?? null;
  }
  if (ref.networkActorId) {
    const matches = PARIS_CLEANWALK_ACTORS.filter((a) => a.id === ref.networkActorId);
    return matches.length === 1 ? matches[0] : null;
  }
  if (ref.annuaireEntryId) {
    const matches = PARIS_CLEANWALK_ACTORS.filter(
      (a) => a.annuaireEntryId === ref.annuaireEntryId,
    );
    return matches.length === 1 ? matches[0] : null;
  }
  return null;
}

/**
 * Canonical public projection for an entity across Annuaire, 3D network, and 2D org.
 * Uses explicit canonical IDs only; never matches by name and never exposes private facts.
 */
export function projectPublicEntity(
  ref: CanonicalPublicEntityRef,
): CanonicalPublicEntityProjection | null {
  const institutionNode = ref.institutionId
    ? (PARIS_PUBLIC_CLEANLINESS_DATASET.nodes.find((n) => n.id === ref.institutionId) ?? null)
    : null;
  if (ref.institutionId && !institutionNode) return null;

  const networkActor = resolveExplicitNetworkActor(ref, institutionNode);
  if (ref.networkActorId && !networkActor) return null;

  if (ref.annuaireEntryId && institutionNode) {
    const expectedDirectoryId = institutionNode.directoryId ?? networkActor?.annuaireEntryId ?? null;
    if (expectedDirectoryId !== ref.annuaireEntryId) {
      return null;
    }
  }

  const resolvedAnnuaireId =
    ref.annuaireEntryId ??
    networkActor?.annuaireEntryId ??
    institutionNode?.directoryId ??
    null;

  if (
    ref.annuaireEntryId &&
    networkActor?.annuaireEntryId &&
    ref.annuaireEntryId !== networkActor.annuaireEntryId
  ) {
    return null;
  }

  const annuaireEntry = resolveExplicitAnnuaireEntry(resolvedAnnuaireId);
  if (ref.annuaireEntryId && !annuaireEntry) return null;
  const resolvedInstitutionId =
    institutionNode?.id ??
    (networkActor
      ? resolveInstitutionId(PARIS_PUBLIC_CLEANLINESS_DATASET, networkActor.id, PARIS_CLEANWALK_ACTORS)
      : null);

  if (!annuaireEntry && !networkActor && !institutionNode) return null;

  const context = networkActor
    ? getActorStructureContext(networkActor.id)
    : institutionNode
      ? getInstitutionStructureContext(
          PARIS_PUBLIC_CLEANLINESS_DATASET,
          institutionNode,
          PARIS_CLEANWALK_ACTORS,
        )
      : null;

  const sourceIds = new Set<string>();
  for (const metric of context?.metrics ?? []) sourceIds.add(metric.sourceId);
  for (const limit of context?.limits ?? []) {
    for (const sid of limit.sourceIds) sourceIds.add(sid);
  }
  const sources = Array.from(sourceIds)
    .map((id) => getPublicStructureSource(id))
    .filter((s): s is PublicStructureSource => s !== null);

  const relations = networkActor
    ? PARIS_CLEANWALK_RELATIONS.filter(
        (rel) => rel.sourceId === networkActor.id || rel.targetId === networkActor.id,
      )
    : [];

  const institutionRelations = institutionNode
    ? PARIS_PUBLIC_CLEANLINESS_RELATIONS.filter(
        (rel) => rel.from === institutionNode.id || rel.to === institutionNode.id,
      )
    : [];

  const institutionSources = institutionNode
    ? PUBLIC_CLEANLINESS_SOURCES.filter((src) => institutionNode.sourceIds.includes(src.id))
    : [];

  const territories = Array.from(
    new Set([
      ...(networkActor ? [networkActor.parisZone.label] : []),
      ...(institutionNode?.territoryIds ?? []),
    ]),
  );

  const publicReferents = networkActor?.publicLeader ? [networkActor.publicLeader.name] : [];
  const name = annuaireEntry?.name ?? networkActor?.name ?? institutionNode?.name ?? "";

  return {
    identity: {
      annuaireEntryId: annuaireEntry?.id ?? null,
      networkActorId: networkActor?.id ?? null,
      institutionId: resolvedInstitutionId,
      name,
    },
    territories,
    publicReferents,
    relations,
    institutionRelations,
    metrics: context?.metrics ?? [],
    limits: context?.limits ?? [],
    sources,
    institutionSources,
    scopeNotes: {
      hasAnnuaireEntry: annuaireEntry !== null,
      hasNetworkActor: networkActor !== null,
      hasInstitutionNode: institutionNode !== null || resolvedInstitutionId !== null,
    },
  };
}
