import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useJoinFormSectionActions } from "./rejoindre-un-formulaire-section.controller.actions";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { jsonResponse as json } from "@/__tests__/support/action-behavior-test-helpers";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const item = {
  id: "action-1",
  title: "Action future",
  actionDate: "2099-01-01",
  eventStartTime: null,
  locationLabel: "Paris",
  participantsCount: 2,
  pendingRequestsCount: 1,
  joined: false,
  awaitingApproval: false,
  joinedAt: null,
  participationStatus: "cancelled",
  participationSource: "group_form",
  participationUpdatedAt: null,
  groupJoinEnabled: true,
} as unknown as JoinableActionItem;

function renderHook(onQueueMutation = vi.fn()) {
  let state!: ReturnType<typeof useJoinFormSectionActions>;
  let renderer!: ReactTestRenderer;
  function Probe() {
    state = useJoinFormSectionActions({ fr: true, listUrl: "/api/actions/group-join", onQueueMutation });
    return null;
  }
  act(() => { renderer = create(<Probe />); });
  return { get state() { return state; }, renderer, onQueueMutation };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => vi.unstubAllGlobals());

describe("useJoinFormSectionActions behavior", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads public history, confirms a pending request and keeps it separate from presence", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ status: "ok", authenticated: true, count: 1, items: [item], history: [] }))
      .mockResolvedValueOnce(json({ status: "ok", actionId: "action-1", alreadyJoined: false, joinedAt: "2098-12-01T10:00:00Z", participationStatus: "pending", participationSource: "group_form", participationUpdatedAt: null, participantsCount: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    const hook = renderHook();
    await act(async () => { await flush(); });
    expect(hook.state.authenticated).toBe(true);
    expect(hook.state.items).toHaveLength(1);

    act(() => { hook.state.requestJoin("action-1"); });
    await act(async () => { await hook.state.confirmPendingJoin(); });
    expect(hook.state.items[0]).toMatchObject({ awaitingApproval: true, joined: false, participationStatus: "pending" });
    expect(hook.state.notice).toContain("file publique");
    expect(hook.onQueueMutation).toHaveBeenCalledWith("action-1");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/actions/group-join", expect.objectContaining({ method: "POST" }));
    hook.renderer.unmount();
  });

  it("handles confirmed join, repeated join and leave as separate transitions", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ status: "ok", authenticated: true, count: 1, items: [{ ...item, joined: true, participationStatus: "confirmed" }], history: [] }))
      .mockResolvedValueOnce(json({ status: "ok", actionId: "action-1", alreadyJoined: true, joinedAt: "2098-12-01T10:00:00Z", participationStatus: "confirmed", participationSource: "group_form", participationUpdatedAt: null, participantsCount: 3 }))
      .mockResolvedValueOnce(json({ status: "ok", actionId: "action-1", alreadyCancelled: false, joinedAt: "2098-12-01T10:00:00Z", participationStatus: "cancelled", participationSource: "group_form", participationUpdatedAt: null, participantsCount: 2 }));
    vi.stubGlobal("fetch", fetchMock);
    const hook = renderHook();
    await act(async () => { await flush(); });
    act(() => { hook.state.requestJoin("action-1"); });
    await act(async () => { await hook.state.confirmPendingJoin(); });
    expect(hook.state.notice).toContain("déjà enregistrée");
    act(() => { hook.state.requestLeave("action-1"); });
    await act(async () => { await hook.state.confirmPendingLeave(); });
    expect(hook.state.items[0]).toMatchObject({ joined: false, awaitingApproval: false, participationStatus: "cancelled" });
    hook.renderer.unmount();
  });

  it("does not mutate on an unauthenticated join and exposes reload errors", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ status: "ok", authenticated: true, count: 1, items: [item], history: [] }))
      .mockResolvedValueOnce(json({ error: "Connectez-vous" }, 401))
      .mockResolvedValueOnce(json({ error: "indisponible" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    const hook = renderHook();
    await act(async () => { await flush(); });
    act(() => { hook.state.requestJoin("action-1"); });
    await act(async () => { await hook.state.confirmPendingJoin(); });
    expect(hook.state.notice).toContain("Connectez-vous");
    await act(async () => { hook.state.reloadActions(); await flush(); });
    expect(hook.state.error).toContain("temporairement indisponible");
    hook.renderer.unmount();
  });
});
