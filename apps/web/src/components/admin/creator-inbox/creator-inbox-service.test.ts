import { afterEach, describe, expect, it, vi } from "vitest";
import { applyCreatorInboxAction } from "./creator-inbox-service";

describe("creator inbox action service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the trimmed reason for a state update", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await applyCreatorInboxAction({
      source: "feedback",
      itemId: "feedback-1",
      action: "mark_treated",
      reason: "  Traitement documenté  ",
    });

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toEqual({
      source: "feedback",
      itemId: "feedback-1",
      action: "mark_treated",
      reason: "Traitement documenté",
    });
  });
});
