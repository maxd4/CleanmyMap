import { describe, expect, it } from "vitest";
import {
  buildInitialAnnouncementTemplate,
  buildInitialDmRecipient,
  buildInitialTopicId,
  resolveInitialConnectTab,
} from "./use-connect-data";
import { getAnnouncementTopicId } from "@/lib/chat/announcements";

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
});
