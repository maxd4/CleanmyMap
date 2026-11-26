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
import type { AnnuaireEntry, PublishedAnnuaireEntry } from "./annuaire-types";
import { getPublicInstitutionalPeople } from "./public-cleanliness-people";
import { getScheduledOperationsForActor } from "./paris-cleanwalk-network.scheduled";
import { getPublicCleanlinessContact } from "./public-cleanliness-organization";

/** Explicit public fields only. Never spread a database/administrative record. */
function publicDirectoryEntry(entry: AnnuaireEntry | null): AnnuaireEntry | null {
  if (!entry) return null;
  const common = {
    id: entry.id, name: entry.name, legalIdentity: entry.legalIdentity, kind: entry.kind,
    types: entry.types, engagementTypesSource: entry.engagementTypesSource,
    scope: entry.scope, description: entry.description, location: entry.location,
    lat: entry.lat, lng: entry.lng, coordinatesSource: entry.coordinatesSource,
    websiteUrl: entry.websiteUrl, instagramUrl: entry.instagramUrl, facebookUrl: entry.facebookUrl,
    coveredArrondissements: entry.coveredArrondissements, contributionTypes: entry.contributionTypes,
    primaryChannel: entry.primaryChannel ? { platform: entry.primaryChannel.platform, label: entry.primaryChannel.label, url: entry.primaryChannel.url } : undefined,
    isFeatured: entry.isFeatured, featuredReason: entry.featuredReason, tags: entry.tags,
  };
  if (entry.provenance === "editorial_seed") {
    return { ...common, provenance: entry.provenance, verificationStatus: entry.verificationStatus,
      qualificationStatus: entry.qualificationStatus, publicAddress: entry.publicAddress,
      schoolProfile: entry.schoolProfile, associationProfile: entry.associationProfile };
  }
  return { ...common, provenance: entry.provenance, verificationStatus: entry.verificationStatus,
    qualificationStatus: entry.qualificationStatus, availability: entry.availability,
    lastUpdatedAt: entry.lastUpdatedAt, associationProfile: entry.associationProfile };
}

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
  directoryEntry: AnnuaireEntry | null;
  institutionalPeople: ReturnType<typeof getPublicInstitutionalPeople>;
  institutionalContact: ReturnType<typeof getPublicCleanlinessContact>;
  scheduledOperations: ReturnType<typeof getScheduledOperationsForActor>;
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

function collectInstitutionData(
  resolvedInstitutionNode: PublicCleanlinessOrganizationNode | null,
  institutionRelations: readonly PublicCleanlinessOrganizationRelation[],
) {
  const institutionalPeople = resolvedInstitutionNode
    ? getPublicInstitutionalPeople(PARIS_PUBLIC_CLEANLINESS_DATASET, resolvedInstitutionNode.id)
    : [];
  const institutionalContact = resolvedInstitutionNode
    ? getPublicCleanlinessContact(resolvedInstitutionNode, PUBLIC_CLEANLINESS_SOURCES)
    : null;
  const institutionSourceIds = new Set([
    ...(resolvedInstitutionNode?.sourceIds ?? []),
    ...(institutionalContact?.sourceIds ?? []),
    ...institutionRelations.flatMap((edge) => edge.sourceIds),
    ...institutionalPeople.flatMap(({ person, assignments }) => [
      ...person.sourceIds,
      ...assignments.flatMap(({ role, relation }) => [...role.sourceIds, ...relation.sourceIds]),
    ]),
  ]);
  const institutionSources = PUBLIC_CLEANLINESS_SOURCES.filter((source) =>
    institutionSourceIds.has(source.id),
  );
  return { institutionalPeople, institutionalContact, institutionSources };
}

function buildTerritoriesAndReferents(
  networkActor: ParisCleanwalkActor | null,
  resolvedInstitutionNode: PublicCleanlinessOrganizationNode | null,
  institutionalPeople: ReturnType<typeof getPublicInstitutionalPeople>,
) {
  const territories = Array.from(
    new Set([
      ...(networkActor ? [networkActor.parisZone.label] : []),
      ...(resolvedInstitutionNode?.territoryIds ?? []),
    ]),
  );
  const publicReferents = [
    ...new Set([
      ...(networkActor?.publicLeader ? [networkActor.publicLeader.name] : []),
      ...institutionalPeople
        .filter((item) => item.assignments.some((assignment) => assignment.status === "confirmed"))
        .map((item) => item.person.name),
    ]),
  ];
  return { territories, publicReferents };
}

/**
 * Canonical public projection for an entity across Annuaire, 3D network, and 2D org.
 * Uses explicit canonical IDs only; never matches by name and never exposes private facts.
 */
export function projectPublicEntity(
  ref: CanonicalPublicEntityRef,
  publishedEntry?: PublishedAnnuaireEntry,
): CanonicalPublicEntityProjection | null {
  // The caller must supply the already authorized public-directory projection,
  // never a pending onboarding record or a private institutional contact.
  if (publishedEntry && (publishedEntry.provenance !== "published_partner" || publishedEntry.id !== ref.annuaireEntryId)) return null;
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
  const editorialEntry = resolveExplicitAnnuaireEntry(resolvedAnnuaireId);
  const annuaireEntry = publicDirectoryEntry(publishedEntry ?? editorialEntry ?? null);
  if (ref.annuaireEntryId && !annuaireEntry) return null;

  const directInstitutions = !networkActor && resolvedAnnuaireId && !PARIS_CLEANWALK_ACTORS.some((actor) => actor.annuaireEntryId === resolvedAnnuaireId)
    ? PARIS_PUBLIC_CLEANLINESS_DATASET.nodes.filter((node) => node.directoryId === resolvedAnnuaireId && !node.networkActorId)
    : [];
  const resolvedInstitutionId =
    institutionNode?.id ??
    (networkActor
      ? resolveInstitutionId(PARIS_PUBLIC_CLEANLINESS_DATASET, networkActor.id, PARIS_CLEANWALK_ACTORS)
      : directInstitutions.length === 1 ? directInstitutions[0].id : null);
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

  const { institutionalPeople, institutionalContact, institutionSources } =
    collectInstitutionData(resolvedInstitutionNode, institutionRelations);

  const { territories, publicReferents } = buildTerritoriesAndReferents(
    networkActor,
    resolvedInstitutionNode,
    institutionalPeople,
  );
  const name = annuaireEntry?.name ?? networkActor?.name ?? resolvedInstitutionNode?.name ?? "";

  return {
    identity: {
      annuaireEntryId: annuaireEntry?.id ?? null,
      networkActorId: networkActor?.id ?? null,
      institutionId: resolvedInstitutionId,
      name,
    },
    publicActor: networkActor,
    directoryEntry: annuaireEntry,
    institutionalPeople,
    institutionalContact,
    scheduledOperations: networkActor ? getScheduledOperationsForActor(networkActor.id) : [],
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
