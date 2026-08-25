import { describe, expect, it } from "vitest";
import { buildInitialDmRecipient } from "./use-connect-data";

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
