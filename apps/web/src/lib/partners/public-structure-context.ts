import { PUBLIC_STRUCTURE_CONTEXTS as MEGOTS_CONTEXTS, PUBLIC_STRUCTURE_SOURCES as MEGOTS_SOURCES } from "./public-structure-context.megots";
import { NETWORK_STRUCTURE_CONTEXTS, NETWORK_STRUCTURE_SOURCES } from "./public-structure-context.network";

const PUBLIC_STRUCTURE_CONTEXTS = [...MEGOTS_CONTEXTS, ...NETWORK_STRUCTURE_CONTEXTS];
const PUBLIC_STRUCTURE_SOURCES = { ...MEGOTS_SOURCES, ...NETWORK_STRUCTURE_SOURCES };
import { isSafeHttpUrl, isPrivateOrUnauthorizedInviteUrl } from "./paris-cleanwalk-network.channels";
import type { PublicCleanlinessCityDataset, PublicCleanlinessOrganizationNode } from "./public-cleanliness-organization";
import type { ParisCleanwalkActor } from "./paris-cleanwalk-network";
import { resolveInstitutionNetworkActorId } from "./public-cleanliness-network-links";

type Localized = { fr: string; en: string };
export type PublicStructureSource = {
  label: string; url: string; verifiedAt: string;
  evidence: "organizer_report" | "organizer_statement" | "partner_statement" | "operator_statement" | "public_authority" | "attributed_critique";
};
export type PublicStructureMetric = {
  id: string; label: Localized; value: number;
  unit: "count" | "percent" | "eur" | "eur_per_kg" | "eur_per_person_year" | "kg" | "tonnes";
  period: string; scope: "edition" | "national" | "ile_de_france" | "paris" | "organization" | "offer";
  quality: "reported" | "approximate"; sourceId: string;
};
export type PublicStructureLimit = {
  id: string;
  basis: "documented" | "attributed_critique" | "not_established";
  kind: "funding" | "governance" | "treatment" | "transparency" | "claims";
  text: Localized; sourceIds: readonly string[];
};
export type PublicStructureContext = ({ actorId: string; institutionId?: never } | { institutionId: string; actorId?: never }) & {
  metrics?: readonly PublicStructureMetric[];
  limits: readonly PublicStructureLimit[];
};
const actorContexts = new Map(PUBLIC_STRUCTURE_CONTEXTS.flatMap(context => context.actorId ? [[context.actorId, context] as const] : []));
const institutionContexts = new Map(PUBLIC_STRUCTURE_CONTEXTS.flatMap(context => context.institutionId ? [[context.institutionId, context] as const] : []));

export function getPublicStructureSource(id: string): PublicStructureSource | null {
  if (!Object.prototype.hasOwnProperty.call(PUBLIC_STRUCTURE_SOURCES, id)) return null;
  const source = PUBLIC_STRUCTURE_SOURCES[id];
  return source.url.startsWith("https://") && isSafeHttpUrl(source.url) && !isPrivateOrUnauthorizedInviteUrl(source.url) ? source : null;
}

export function getActorStructureContext(actorId: string): PublicStructureContext | null {
  return actorContexts.get(actorId) ?? null;
}

export function getInstitutionStructureContext(dataset: PublicCleanlinessCityDataset, node: PublicCleanlinessOrganizationNode, actors: readonly Pick<ParisCleanwalkActor, "id" | "annuaireEntryId">[]): PublicStructureContext | null {
  if (dataset.city !== "Paris" || !dataset.nodes.some(item => item.id === node.id)) return null;
  if (node.networkActorId || node.directoryId) {
    const actorId = resolveInstitutionNetworkActorId(dataset, node, actors);
    if (actorId) return getActorStructureContext(actorId);
    // An explicitly referenced but ambiguous network identity must not transfer its limits.
    if (node.networkActorId || actors.some(actor => actor.annuaireEntryId === node.directoryId)) return null;
  }
  return institutionContexts.get(node.id) ?? null;
}

export function validatePublicStructureContexts(actors: readonly Pick<ParisCleanwalkActor, "id" | "annuaireEntryId">[], dataset: PublicCleanlinessCityDataset): string[] {
  const errors: string[] = [];
  for (const id of Object.keys(NETWORK_STRUCTURE_SOURCES)) {
    if (Object.prototype.hasOwnProperty.call(MEGOTS_SOURCES, id)) errors.push("duplicate-source:" + id);
  }
  const seen = new Set<string>();
  for (const context of PUBLIC_STRUCTURE_CONTEXTS) {
    const key = context.actorId ? "actor:" + context.actorId : "institution:" + context.institutionId;
    if (seen.has(key)) errors.push("duplicate-context:" + key);
    seen.add(key);
    if (context.actorId ? !actors.some(actor => actor.id === context.actorId) : !dataset.nodes.some(node => node.id === context.institutionId)) errors.push("unknown-context:" + key);
    const localIds = new Set<string>();
    for (const item of [...(context.metrics ?? []), ...context.limits]) {
      if (localIds.has(item.id)) errors.push("duplicate-evidence:" + key + ":" + item.id);
      localIds.add(item.id);
      if ("value" in item) {
        if (!Number.isFinite(item.value) || item.value < 0 || (item.unit === "percent" && item.value > 100) || !getPublicStructureSource(item.sourceId)) errors.push("invalid-metric:" + item.id);
      } else {
        if (!item.text.fr.trim() || !item.text.en.trim() || !item.sourceIds.length || item.sourceIds.some(id => !getPublicStructureSource(id))) errors.push("invalid-limit:" + item.id);
        if (item.basis === "attributed_critique" && !item.sourceIds.some(id => getPublicStructureSource(id)?.evidence === "attributed_critique")) errors.push("unattributed-critique:" + item.id);
      }
    }
  }
  return errors;
}
