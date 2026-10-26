import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loadPendingActionResultPromptIds,
  loadPendingPostActionClaimIds,
  respondToActionResultPrompt,
  respondToPostActionClaimReview,
} from "./action-result-client";

describe("action-result notification client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  it("normalise les prompts valides et ignore les entrées malformées", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      prompts: [{ action_id: " action-1 " }, { action_id: "" }, null, { action_id: 42 }],
    }), { status: 200 }));

    await expect(loadPendingActionResultPromptIds()).resolves.toEqual(["action-1"]);
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/post-action-prompts", expect.objectContaining({
      cache: "no-store",
      credentials: "same-origin",
    }));
  });

  it("normalise les reviews de participation et conserve l'isolation same-origin", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      claims: [{ participation_id: " participation-1 " }, { participation_id: null }],
    }), { status: 200 }));

    await expect(loadPendingPostActionClaimIds()).resolves.toEqual(["participation-1"]);
  });

  it("rejette une réponse HTTP non OK sans exposer de faux état", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "forbidden" }), { status: 403 }));

    await expect(loadPendingActionResultPromptIds()).rejects.toMatchObject({ status: 403 });
  });

  it("envoie une décision de résultat et valide le statut métier", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "claimed", actionId: "action-1" }), { status: 200 }));

    await expect(respondToActionResultPrompt("action-1", "claim")).resolves.toEqual({
      status: "claimed",
      actionId: "action-1",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/post-action-prompts", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ actionId: "action-1", decision: "claim" }),
    }));
  });

  it("classe une review déjà traitée comme indisponible", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      status: "ok",
      participantId: "participation-1",
      actionId: "action-1",
      participationStatus: "confirmed",
      alreadyReviewed: true,
    }), { status: 200 }));

    await expect(respondToPostActionClaimReview("action-1", "participation-1", "accept")).resolves.toEqual({
      status: "unavailable",
      registrationId: "participation-1",
      actionId: "action-1",
    });
  });

  it("rejette un statut de décision inconnu", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "maybe" }), { status: 200 }));

    await expect(respondToActionResultPrompt("action-1", "not_participated")).rejects.toThrow("état valide");
  });
});
