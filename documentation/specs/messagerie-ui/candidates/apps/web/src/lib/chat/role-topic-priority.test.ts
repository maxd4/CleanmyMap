import { describe, expect, it } from "vitest";
import { getChatTopicPresentationGroups } from "./topic-presentation";
import { prioritizeChatTopics } from "./role-topic-priority";
import { canAccessChatChannel } from "./channels";

const cases = [
  ["benevole", "relais_associatif", false],
  ["coordinateur", "coordination_secteur", false],
  ["scientifique", "besoin_ressources", false],
  ["entreprise", "besoin_ressources", false],
  ["elu", "coordination_secteur", true],
  ["admin", "coordination_secteur", true],
  ["max", "coordination_secteur", true],
] as const;
describe("messaging role presentation", () => {
  it.each(cases)("uses active role %s without widening permissions", (role, first, institutional) => {
    const groups = getChatTopicPresentationGroups("community");
    const result = prioritizeChatTopics(groups, role, "community");
    expect(result[0]?.topicIds).toContain(first);
    expect(result.flatMap(group => group.topicIds).sort()).toEqual(groups.flatMap(group => group.topicIds).sort());
    expect(result.flatMap(group => group.topicIds)).not.toContain("spogomi");
    expect(canAccessChatChannel("admin_elu", { roleLabel: role, hasArrondissement: false, hasGreaterParisZone: false, zoneContext: null })).toBe(institutional);
  });
});
