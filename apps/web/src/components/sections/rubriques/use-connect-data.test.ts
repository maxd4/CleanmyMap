import { describe, expect, it } from "vitest";
import { buildInitialDmRecipient, buildInitialTopicId } from "./use-connect-data";

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
