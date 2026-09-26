import { describe, expect, it } from "vitest";
import {
  getChatTopicIdsForPresentationScope,
  getChatTopicPresentationGroup,
  getChatTopicPresentationGroups,
} from "./topic-presentation";

describe("chat topic presentation groups", () => {
  it("groups community topics without changing their persisted IDs", () => {
    const groups = getChatTopicPresentationGroups("community");

    expect(groups.map((group) => group.label)).toEqual([
      "Mobiliser & relayer",
      "Ressources",
      "Coordination",
    ]);
    expect(groups[0]?.topicIds).toEqual([
      "relais_associatif",
      "appel_aux_benevoles",
      "demande_diffusion",
    ]);
    expect(getChatTopicPresentationGroup("community", "appel_aux_benevoles")?.id).toBe(
      "relais_associatif",
    );
  });

  it("keeps territory as one presentation group while retaining both legacy topics", () => {
    expect(getChatTopicPresentationGroups("territory")).toHaveLength(1);
    expect(getChatTopicPresentationGroup("territory", "territoires_voisins")?.topicIds).toEqual([
      "mon_territoire",
      "territoires_voisins",
    ]);
    expect(getChatTopicIdsForPresentationScope("territory", "mon_territoire")).toBeNull();
  });

  it("uses both persisted topics for an aggregate admin group", () => {
    expect(getChatTopicIdsForPresentationScope("admin_elu", "priorites")).toEqual([
      "arbitrages",
      "priorites",
    ]);
  });
});
