import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/app-errors";
import type { CommunityEventItem } from "@/lib/community/http";

const mocks = vi.hoisted(() => ({
  updateCommunityEventOps: vi.fn(),
  upsertCommunityRsvp: vi.fn(),
  redirectToSignIn: vi.fn(),
  redirectToCommunitySignIn: vi.fn(),
  notifyNetworkToast: vi.fn(),
  auth: { isLoaded: true, isSignedIn: true },
}));

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => mocks.auth,
  useClerk: () => ({ redirectToSignIn: mocks.redirectToSignIn }),
}));
vi.mock("@/lib/community/http", () => ({
  updateCommunityEventOps: mocks.updateCommunityEventOps,
  upsertCommunityRsvp: mocks.upsertCommunityRsvp,
}));
vi.mock("@/lib/errors/network-toast", () => ({
  notifyNetworkToast: mocks.notifyNetworkToast,
}));
vi.mock("./mutation-auth", () => ({
  redirectToCommunitySignIn: mocks.redirectToCommunitySignIn,
}));

import { useCommunityActions } from "./use-community-actions";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const event: CommunityEventItem = {
  id: "event-1",
  createdAt: "2026-08-01T10:00:00.000Z",
  organizerClerkId: "user-1",
  canEditOwnOps: true,
  title: "Collecte historique",
  eventDate: "2026-08-01",
  locationLabel: "Paris",
  location: { label: "Paris", latitude: null, longitude: null, source: null },
  description: null,
  capacityTarget: null,
  attendanceCount: 2,
  postMortem: "Ancien retour",
  cleanupObjective: null,
  cleanupZone: null,
  cleanupLogisticsNeeds: null,
  cleanupSupportLevel: null,
  cleanupWasteTypesExpected: [],
  rsvpCounts: { yes: 0, maybe: 0, no: 0, total: 0 },
  myRsvpStatus: null,
};

type HookResult = ReturnType<typeof useCommunityActions>;

function renderHook(reloadEvents: () => Promise<unknown>) {
  let result!: HookResult;
  let renderer!: ReactTestRenderer;
  function Harness() {
    result = useCommunityActions(reloadEvents);
    return null;
  }
  act(() => {
    renderer = create(React.createElement(Harness));
  });
  return {
    get result() { return result; },
    unmount() { act(() => renderer.unmount()); },
  };
}

describe("useCommunityActions historical ops", () => {
  beforeEach(() => {
    mocks.updateCommunityEventOps.mockReset();
    mocks.upsertCommunityRsvp.mockReset();
    mocks.redirectToSignIn.mockReset();
    mocks.redirectToCommunitySignIn.mockReset();
    mocks.notifyNetworkToast.mockReset();
    mocks.auth.isLoaded = true;
    mocks.auth.isSignedIn = true;
  });

  it("sends the edited draft, reloads the historical event and confirms success", async () => {
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    mocks.updateCommunityEventOps.mockResolvedValue({ ...event, attendanceCount: 7, postMortem: "Retour actualisé" });
    const hook = renderHook(reloadEvents);

    act(() => {
      hook.result.updateOpsDraft(event.id, { attendanceCount: "7", postMortem: "Retour actualisé" });
    });
    await act(async () => {
      await hook.result.onSaveEventOps(event);
    });

    expect(mocks.updateCommunityEventOps).toHaveBeenCalledWith({
      eventId: "event-1",
      attendanceCount: 7,
      postMortem: "Retour actualisé",
    });
    expect(reloadEvents).toHaveBeenCalledTimes(1);
    expect(hook.result.communitySuccessMessage).toBe("Suivi de la mission mis à jour.");
    expect(hook.result.communityError).toBeNull();
    hook.unmount();
  });

  it("ne confirme pas une mutation refusée et redirige sur 401", async () => {
    mocks.updateCommunityEventOps.mockRejectedValue(new AppError({ kind: "permission", status: 401, message: "Unauthorized" }));
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(reloadEvents);

    await act(async () => {
      await hook.result.onSaveEventOps(event);
    });

    expect(mocks.redirectToCommunitySignIn).toHaveBeenCalledTimes(1);
    expect(reloadEvents).not.toHaveBeenCalled();
    expect(hook.result.communitySuccessMessage).toBeNull();
    hook.unmount();
  });

  it("expose l'erreur 403 et le retry réseau sans faux succès", async () => {
    mocks.updateCommunityEventOps.mockRejectedValueOnce(new AppError({ kind: "permission", status: 403, message: "Forbidden" }));
    const reloadEvents = vi.fn().mockResolvedValue(undefined);
    const hook = renderHook(reloadEvents);

    await act(async () => {
      await hook.result.onSaveEventOps(event);
    });

    expect(hook.result.communityError).toMatchObject({ status: 403, kind: "permission" });
    expect(hook.result.communitySuccessMessage).toBeNull();

    mocks.updateCommunityEventOps.mockRejectedValueOnce(new AppError({ kind: "network", message: "Offline" }));
    await act(async () => {
      await hook.result.onSaveEventOps(event);
    });

    expect(mocks.notifyNetworkToast).toHaveBeenCalledTimes(1);
    expect(hook.result.communityError).toMatchObject({ kind: "network" });
    expect(hook.result.communitySuccessMessage).toBeNull();
    hook.unmount();
  });
});
