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
  type PublicStructureContext,
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
  /** Existing public owners, not copies of their data. */
  publicActor: ParisCleanwalkActor | null;
  institution: PublicCleanlinessOrganizationNode | null;
  structureContext: PublicStructureContext | null;
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

function resolvePublicStructureContext(
  networkActor: ReturnType<typeof resolveExplicitNetworkActor>,
  resolvedInstitutionNode: (typeof PARIS_PUBLIC_CLEANLINESS_DATASET.nodes)[number] | null,
) {
  if (networkActor) {
    return getActorStructureContext(networkActor.id);
  }
  if (resolvedInstitutionNode) {
    return getInstitutionStructureContext(
      PARIS_PUBLIC_CLEANLINESS_DATASET,
      resolvedInstitutionNode,
      PARIS_CLEANWALK_ACTORS,
    );
  }
  return null;
}

function collectPublicSources(
  context: ReturnType<typeof resolvePublicStructureContext>,
): PublicStructureSource[] {
  const sourceIds = new Set<string>();
  for (const metric of context?.metrics ?? []) sourceIds.add(metric.sourceId);
  for (const limit of context?.limits ?? []) {
    for (const sid of limit.sourceIds) sourceIds.add(sid);
  }
  return Array.from(sourceIds)
    .map((id) => getPublicStructureSource(id))
    .filter((s): s is PublicStructureSource => s !== null);
}

function resolveInstitutionNodeById(
  institutionId: string | null | undefined,
): (typeof PARIS_PUBLIC_CLEANLINESS_DATASET.nodes)[number] | null {
  if (!institutionId) return null;
  return PARIS_PUBLIC_CLEANLINESS_DATASET.nodes.find((n) => n.id === institutionId) ?? null;
}

/**
 * Canonical public projection for an entity across Annuaire, 3D network, and 2D org.
 * Uses explicit canonical IDs only; never matches by name and never exposes private facts.
 */
export function projectPublicEntity(
  ref: CanonicalPublicEntityRef,
): CanonicalPublicEntityProjection | null {
  const institutionNode = resolveInstitutionNodeById(ref.institutionId);
  if (ref.institutionId && !institutionNode) return null;

  const networkActor = resolveExplicitNetworkActor(ref, institutionNode);
  if (ref.networkActorId && !networkActor) return null;

  if (ref.annuaireEntryId && institutionNode) {
    const expectedDirectoryId = institutionNode.directoryId ?? networkActor?.annuaireEntryId ?? null;
    if (expectedDirectoryId !== ref.annuaireEntryId) {
      return null;
    }
  }

  if (
    ref.annuaireEntryId &&
    networkActor &&
    networkActor.annuaireEntryId !== ref.annuaireEntryId
  ) {
    return null;
  }

  const resolvedAnnuaireId =
    ref.annuaireEntryId ??
    networkActor?.annuaireEntryId ??
    institutionNode?.directoryId ??
    null;
  const annuaireEntry = resolveExplicitAnnuaireEntry(resolvedAnnuaireId);
  if (ref.annuaireEntryId && !annuaireEntry) return null;

  const resolvedInstitutionId =
    institutionNode?.id ??
    (networkActor
      ? resolveInstitutionId(PARIS_PUBLIC_CLEANLINESS_DATASET, networkActor.id, PARIS_CLEANWALK_ACTORS)
      : null);
  const resolvedInstitutionNode =
    institutionNode ?? resolveInstitutionNodeById(resolvedInstitutionId);

  if (!annuaireEntry && !networkActor && !resolvedInstitutionNode) return null;

  const context = resolvePublicStructureContext(networkActor, resolvedInstitutionNode);
  const sources = collectPublicSources(context);

  const relations = networkActor
    ? PARIS_CLEANWALK_RELATIONS.filter(
        (rel) => rel.sourceId === networkActor.id || rel.targetId === networkActor.id,
      )
    : [];

  const institutionRelations = resolvedInstitutionNode
    ? PARIS_PUBLIC_CLEANLINESS_RELATIONS.filter(
        (rel) => rel.from === resolvedInstitutionNode.id || rel.to === resolvedInstitutionNode.id,
      )
    : [];

  const institutionSources = resolvedInstitutionNode
    ? PUBLIC_CLEANLINESS_SOURCES.filter((src) => resolvedInstitutionNode.sourceIds.includes(src.id))
    : [];

  const territories = Array.from(
    new Set([
      ...(networkActor ? [networkActor.parisZone.label] : []),
      ...(resolvedInstitutionNode?.territoryIds ?? []),
    ]),
  );

  const publicReferents = networkActor?.publicLeader ? [networkActor.publicLeader.name] : [];
  const name = annuaireEntry?.name ?? networkActor?.name ?? resolvedInstitutionNode?.name ?? "";

  return {
    identity: {
      annuaireEntryId: annuaireEntry?.id ?? null,
      networkActorId: networkActor?.id ?? null,
      institutionId: resolvedInstitutionId,
      name,
    },
    publicActor: networkActor,
    institution: resolvedInstitutionNode,
    structureContext: context,
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
      hasInstitutionNode: resolvedInstitutionNode !== null,
    },
  };
}
