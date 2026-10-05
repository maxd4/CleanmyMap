import { describe, expect, it } from "vitest";
import {
  buildPublicActionReference,
  buildShareDestinationList,
  getPublicActionShareKind,
  isPublicActionReferenceAvailable,
  isShareableFutureAction,
  resolveActionTerritoryDestination,
  resolveShareTerritoryDestination,
} from "./action-sharing";
import { publicAction as baseAction } from "@/lib/actions/public-action.test-fixture";

describe("action sharing contract", () => {
  it("requires a published, visible future pre-action", () => {
    const now = new Date("2098-12-15T09:00:00.000Z");
    expect(isShareableFutureAction(baseAction, now)).toBe(true);
    expect(isShareableFutureAction({ ...baseAction, published_at: null }, now)).toBe(false);
    expect(isShareableFutureAction({ ...baseAction, action_phase: "post_action_draft" }, now)).toBe(false);
  });

  it("shares a published approved completed action as a result", () => {
    const completed = {
      ...baseAction,
      action_phase: "post_action_complete" as const,
      status: "approved" as const,
      action_date: "2020-01-01",
    };
    expect(getPublicActionShareKind(completed, new Date("2026-09-15T09:00:00.000Z"))).toBe("result");
    expect(isPublicActionReferenceAvailable(completed)).toBe(true);
    expect(isPublicActionReferenceAvailable({ ...completed, status: "pending" })).toBe(false);
    expect(isPublicActionReferenceAvailable({ ...completed, action_phase: "post_action_draft" })).toBe(false);
  });

  it("keeps the dynamic card projection free of the action model copy", () => {
    const reference = buildPublicActionReference(baseAction);
    expect(reference).toMatchObject({
      id: baseAction.id,
      shareKind: "invitation",
      title: "Nettoyage des berges",
      participantsExpected: 12,
      durationMinutes: 75,
      objective: "Nettoyage",
      route: { kind: "polyline" },
      groupJoinEnabled: true,
    });
    expect(reference).not.toHaveProperty("preparationData");
    expect(reference).not.toHaveProperty("waste_kg");
  });

  it("resolves an action territory only from a canonical Paris label", () => {
    expect(resolveActionTerritoryDestination({ location_label: "Place de la République, 75003 Paris" })).toEqual({
      zoneName: "3e arrondissement",
      arrondissementId: 3,
    });
    expect(resolveActionTerritoryDestination({ location_label: "Berges de Seine" })).toBeNull();
  });

  it("prefers a reliable action territory and otherwise falls back to the profile", () => {
    expect(
      resolveShareTerritoryDestination(
        { paris_arrondissement: 11, metadata: null },
        { location_label: "Place de la République, 75003 Paris" },
      ),
    ).toEqual({ zoneName: "3e arrondissement", arrondissementId: 3 });
    expect(
      resolveShareTerritoryDestination(
        { paris_arrondissement: 11, metadata: null },
        { location_label: "Berges de Seine" },
      ),
    ).toEqual({ zoneName: "11e arrondissement", arrondissementId: 11 });
  });

  it("lists only the community, profile territory, and existing private destinations", () => {
    const destinations = buildShareDestinationList({
      profile: {
        id: "user-1", display_name: "Alex", handle: "alex", paris_arrondissement: 11,
        role_label: "member", metadata: null,
      },
      dmRows: [{ peer_id: "user-2", peer_display_name: "Sam", peer_handle: "sam" }],
    });
    expect(destinations.map((item) => item.id)).toEqual(["community", "territory", "dm:user-2"]);
    expect(destinations).not.toContainEqual(expect.objectContaining({ channelType: "action" }));
  });

  it("makes an unavailable published reference neutral", () => {
    expect(isPublicActionReferenceAvailable({ ...baseAction, moderation_visibility: "hidden" })).toBe(false);
    expect(isPublicActionReferenceAvailable({ ...baseAction, published_at: null })).toBe(false);
    expect(isPublicActionReferenceAvailable({ ...baseAction, status: "cancelled" })).toBe(false);
  });
});
