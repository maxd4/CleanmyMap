import { describe, expect, it } from "vitest";
import { PARIS_CLEANWALK_ACTORS } from "./paris-cleanwalk-network";
import { PARIS_PUBLIC_CLEANLINESS_DATASET } from "./public-cleanliness-organization";
import { resolveInstitutionId, resolveInstitutionNetworkActorId, resolveNetworkActorId } from "./public-cleanliness-network-links";

describe("explicit identities between the public network and organization", () => {
  it("resolves both reference types without duplicating organizations", () => {
    const dataset = PARIS_PUBLIC_CLEANLINESS_DATASET;
    for (const [nodeId, actorId] of [["dpe", "evt-paris-nettoyages"], ["syctom", "collectivite-syctom"]]) {
      const node = dataset.nodes.find(item => item.id === nodeId)!;
      expect(resolveInstitutionId(dataset, actorId, PARIS_CLEANWALK_ACTORS)).toBe(nodeId);
      expect(resolveInstitutionNetworkActorId(dataset, node, PARIS_CLEANWALK_ACTORS)).toBe(actorId);
    }
    expect(resolveInstitutionId(dataset, "asso-featured-1", PARIS_CLEANWALK_ACTORS)).toBeNull();
  });

  it("rejects absent, conflicting or ambiguous references", () => {
    const actors = [{ id: "actor-a", annuaireEntryId: "directory-a" }, { id: "actor-b", annuaireEntryId: "directory-b" }];
    expect(resolveNetworkActorId({}, actors)).toBeNull();
    expect(resolveNetworkActorId({ networkActorId: "actor-a", directoryId: "directory-b" }, actors)).toBeNull();
    expect(resolveNetworkActorId({ directoryId: "directory-a" }, [...actors, { id: "actor-c", annuaireEntryId: "directory-a" }])).toBeNull();
    const dataset = PARIS_PUBLIC_CLEANLINESS_DATASET;
    const dpe = dataset.nodes.find(node => node.id === "dpe")!;
    const duplicate = { ...dataset, nodes: [...dataset.nodes, { ...dpe, id: "duplicate-dpe" }] };
    expect(resolveInstitutionId(duplicate, "evt-paris-nettoyages", PARIS_CLEANWALK_ACTORS)).toBeNull();
  });
});
