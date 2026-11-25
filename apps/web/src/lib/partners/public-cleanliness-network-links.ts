import type { ParisCleanwalkActor } from "./paris-cleanwalk-network";
import type { PublicCleanlinessCityDataset, PublicCleanlinessOrganizationNode } from "./public-cleanliness-organization";

type ActorIdentity = Pick<ParisCleanwalkActor, "id" | "annuaireEntryId">;
type InstitutionalIdentity = Pick<PublicCleanlinessOrganizationNode, "networkActorId" | "directoryId">;

/** Explicit identity references only. Conflicting or ambiguous references fail closed. */
export function resolveNetworkActorId(node: InstitutionalIdentity, actors: readonly ActorIdentity[]): string | null {
  if (!node.networkActorId && !node.directoryId) return null;
  const matches = actors.filter(actor =>
    (!node.networkActorId || actor.id === node.networkActorId) &&
    (!node.directoryId || actor.annuaireEntryId === node.directoryId),
  );
  return matches.length === 1 ? matches[0].id : null;
}

export function resolveInstitutionId(dataset: Pick<PublicCleanlinessCityDataset, "city" | "nodes">, actorId: string, actors: readonly ActorIdentity[]): string | null {
  if (dataset.city !== "Paris") return null;
  const matches = dataset.nodes.filter(node => resolveNetworkActorId(node, actors) === actorId);
  return matches.length === 1 ? matches[0].id : null;
}

export function resolveInstitutionNetworkActorId(dataset: Pick<PublicCleanlinessCityDataset, "city" | "nodes">, node: PublicCleanlinessOrganizationNode, actors: readonly ActorIdentity[]): string | null {
  if (dataset.city !== "Paris") return null;
  const actorId = resolveNetworkActorId(node, actors);
  return actorId && resolveInstitutionId(dataset, actorId, actors) === node.id ? actorId : null;
}
