import { describe, expect, it } from "vitest";
import {
  CHAT_TOPIC_IDS,
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
    expect(CHAT_TOPIC_IDS_BY_CHANNEL.admin_elu).toEqual([
      "arbitrages",
      "priorites",
      "suivi_decisions",
      "coordination_institutionnelle",
    ]);
    expect(CHAT_TOPIC_IDS).toEqual(
      expect.arrayContaining([...CHAT_TOPIC_IDS_BY_CHANNEL.admin_elu]),
    );
    expect(getDiscussionTopics("community").map((topic) => topic.id)).toEqual(
      CHAT_TOPIC_IDS_BY_CHANNEL.community,
    );
    expect(getDiscussionTopics("territory").map((topic) => topic.id)).toEqual(
      CHAT_TOPIC_IDS_BY_CHANNEL.territory,
    );
    expect(getDiscussionTopics("admin_elu").map((topic) => topic.id)).toEqual(
      CHAT_TOPIC_IDS_BY_CHANNEL.admin_elu,
    );
    for (const topic of getDiscussionTopics("admin_elu")) {
      expect(topic.label).toEqual(expect.any(String));
      expect(topic.labelEn).toEqual(expect.any(String));
      expect(topic.description).toEqual(expect.any(String));
      expect(topic.descriptionEn).toEqual(expect.any(String));
      expect(topic.starterPrompt).toEqual(expect.any(String));
      expect(topic.starterPromptEn).toEqual(expect.any(String));
      expect(topic.icon).toBeTruthy();
    }
  });

  it("rejects unknown and cross-channel topics", () => {
    expect(isChatTopicId("not-a-topic")).toBe(false);
    expect(isChatTopicAllowedForChannel("community", "mon_territoire")).toBe(false);
    expect(isChatTopicAllowedForChannel("admin_elu", "relais_associatif")).toBe(false);
    expect(isChatTopicAllowedForChannel("dm", "relais_associatif")).toBe(false);
    expect(parseChatTopicIdForChannel("community", "relais_associatif")).toBe(
      "relais_associatif",
    );
    expect(parseChatTopicIdForChannel("territory", "relais_associatif")).toBeNull();
    expect(parseChatTopicIdForChannel("admin_elu", "relais_associatif")).toBeNull();
    expect(parseChatTopicIdForChannel("admin_elu", "arbitrages")).toBe("arbitrages");
  });
});
