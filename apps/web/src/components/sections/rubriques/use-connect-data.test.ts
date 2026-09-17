import { describe, expect, it } from "vitest";
import {
  buildInitialAnnouncementTemplate,
  buildInitialDmRecipient,
  buildInitialTopicId,
  resolveInitialArrondissement,
  resolveInitialConnectTab,
  synchronizeConnectNavigationParams,
} from "./use-connect-data";
import { getAnnouncementTopicId } from "@/lib/chat/announcements";
import type { ChatShellNavigationState } from "@/components/chat/chat-navigation";
import { CONNECT_TABS } from "./connect-components";

const publicNavigationState: ChatShellNavigationState = {
  activeChannelType: "community",
  activeTopicId: "relais_associatif",
  selectedActionId: null,
  selectedRecipient: null,
  selectedZone: "",
  territoryFocus: null,
  messageId: "public-message-1",
  feedbackId: null,
  contactRequestId: null,
  announcementTemplate: null,
  eventId: null,
};

describe("DM deep-link recipient contract", () => {
  it("keeps the URL identity and opens a private thread", () => {
    expect(
      buildInitialDmRecipient({
        channelType: "dm",
        recipientId: "user-peer-123",
        recipientLabel: "  Alex  ",
        recipientHandle: " alex_75 ",
      }),
    ).toEqual({
      id: "user-peer-123",
      display_name: "Alex",
      handle: "alex_75",
      avatar_url: null,
    });
  });

  it("does not turn a public-channel URL into a private recipient", () => {
    expect(
      buildInitialDmRecipient({
        channelType: "community",
        recipientId: "user-peer-123",
        recipientLabel: "Alex",
        recipientHandle: "alex",
      }),
    ).toBeNull();
  });
});

describe("public topic deep-link contract", () => {
  it("keeps the community global view unclassified", () => {
    expect(buildInitialTopicId("community", null)).toBeNull();
    expect(buildInitialTopicId("community", "")).toBeNull();
  });

  it("accepts only a topic compatible with the selected channel", () => {
    expect(buildInitialTopicId("community", "relais_associatif")).toBe(
      "relais_associatif",
    );
    expect(buildInitialTopicId("territory", "relais_associatif")).toBeNull();
    expect(buildInitialTopicId("dm", "relais_associatif")).toBeNull();
  });
});

describe("announcement deep-link contract", () => {
  it("opens the announcement mode from a template-only URL and selects its topic", () => {
    const template = buildInitialAnnouncementTemplate("diffusion");
    expect(template).toBe("diffusion");
    expect(getAnnouncementTopicId(template)).toBe("demande_diffusion");
  });

  it("ignores an unknown template instead of preparing a draft", () => {
    expect(buildInitialAnnouncementTemplate("fake")).toBeNull();
  });
});

describe("connect tab routing", () => {
  it("opens a DM deep-link on the private tab even without an explicit tab parameter", () => {
    expect(
      resolveInitialConnectTab({
        defaultTab: "discussions",
        requestedTab: null,
        initialChannelType: "dm",
        hasAnnouncementTemplate: false,
      }),
    ).toBe("dm");
  });

  it("keeps an announcement deep-link on the public tab", () => {
    expect(
      resolveInitialConnectTab({
        defaultTab: "dm",
        requestedTab: "dm",
        initialChannelType: "community",
        hasAnnouncementTemplate: true,
      }),
    ).toBe("discussions");
  });

  it("uses the product vocabulary for the primary tabs", () => {
    expect(CONNECT_TABS.map((tab) => tab.label.fr)).toEqual([
      "Discussions",
      "Messages privés",
    ]);
    expect(CONNECT_TABS.map((tab) => tab.label.fr)).not.toContain("Canaux Publics");
  });
});

describe("selected navigation URL contract", () => {
  it("serializes a public topic and removes stale DM state", () => {
    const params = synchronizeConnectNavigationParams(
      "tab=dm&channel=dm&recipientId=peer-1&recipientLabel=Alex&feedbackId=feedback-1&keep=1",
      "discussions",
      publicNavigationState,
    );

    expect(params.get("tab")).toBe("discussions");
    expect(params.get("channel")).toBe("community");
    expect(params.get("topicId")).toBe("relais_associatif");
    expect(params.get("messageId")).toBe("public-message-1");
    expect(params.get("keep")).toBe("1");
    expect(params.has("recipientId")).toBe(false);
    expect(params.has("feedbackId")).toBe(false);
  });

  it("serializes an action selection and its message anchor", () => {
    const params = synchronizeConnectNavigationParams("source=notification", "discussions", {
      ...publicNavigationState,
      activeChannelType: "action",
      activeTopicId: null,
      selectedActionId: "action-42",
    });

    expect(params.get("channel")).toBe("action");
    expect(params.get("actionId")).toBe("action-42");
    expect(params.get("messageId")).toBe("public-message-1");
    expect(params.has("topicId")).toBe(false);
  });

  it("serializes a DM recipient, message and feedback deep-link", () => {
    const params = synchronizeConnectNavigationParams("tab=discussions&channel=community", "dm", {
      ...publicNavigationState,
      activeChannelType: "dm",
      activeTopicId: null,
      messageId: "dm-message-1",
      feedbackId: "feedback-1",
      contactRequestId: "request-1",
      selectedRecipient: {
        id: "peer-1",
        display_name: "Alex",
        handle: "alex_75",
        avatar_url: null,
      },
    });

    expect(params.get("tab")).toBe("dm");
    expect(params.get("channel")).toBe("dm");
    expect(params.get("recipientId")).toBe("peer-1");
    expect(params.get("recipientLabel")).toBe("Alex");
    expect(params.get("recipientHandle")).toBe("alex_75");
    expect(params.get("messageId")).toBe("dm-message-1");
    expect(params.get("feedbackId")).toBe("feedback-1");
    expect(params.get("contactRequestId")).toBe("request-1");
    expect(params.has("topicId")).toBe(false);
  });

  it("keeps a territory deep-link round-trippable with its arrondissement", () => {
    const params = synchronizeConnectNavigationParams("", "discussions", {
      ...publicNavigationState,
      activeChannelType: "territory",
      activeTopicId: "mon_territoire",
      selectedZone: "11e arrondissement",
      territoryFocus: null,
    });

    expect(params.get("channel")).toBe("territory");
    expect(params.get("topicId")).toBe("mon_territoire");
    expect(params.get("zoneName")).toBe("11e arrondissement");
    expect(params.get("arrondissementId")).toBe("11");
  });
});

describe("territory deep-link defaults", () => {
  it("does not invent an arrondissement when the URL has none", () => {
    expect(resolveInitialArrondissement(Number.NaN)).toBeNull();
    expect(resolveInitialArrondissement(11)).toBe(11);
    expect(resolveInitialArrondissement(21)).toBeNull();
  });
});
