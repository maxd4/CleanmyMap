import { describe, expect, it } from "vitest";
import {
  CHAT_TOPIC_IDS_BY_CHANNEL,
  isChatTopicAllowedForChannel,
  isChatTopicId,
  parseChatTopicIdForChannel,
} from "./topics";
import { getDiscussionTopics } from "@/components/chat/discussion-guidance";

describe("chat topic contract", () => {
  it("keeps the supported topic IDs explicit by channel", () => {
    expect(CHAT_TOPIC_IDS_BY_CHANNEL.community).toEqual([
      "relais_associatif",
      "appel_aux_benevoles",
      "demande_diffusion",
      "besoin_ressources",
      "coordination_secteur",
    ]);
    expect(CHAT_TOPIC_IDS_BY_CHANNEL.territory).toEqual([
      "mon_territoire",
      "territoires_voisins",
    ]);
    expect(getDiscussionTopics("community").map((topic) => topic.id)).toEqual(
      CHAT_TOPIC_IDS_BY_CHANNEL.community,
    );
    expect(getDiscussionTopics("territory").map((topic) => topic.id)).toEqual(
      CHAT_TOPIC_IDS_BY_CHANNEL.territory,
    );
  });

  it("rejects unknown and cross-channel topics", () => {
    expect(isChatTopicId("not-a-topic")).toBe(false);
    expect(isChatTopicAllowedForChannel("community", "mon_territoire")).toBe(false);
    expect(isChatTopicAllowedForChannel("dm", "relais_associatif")).toBe(false);
    expect(parseChatTopicIdForChannel("community", "relais_associatif")).toBe(
      "relais_associatif",
    );
    expect(parseChatTopicIdForChannel("territory", "relais_associatif")).toBeNull();
  });
});
