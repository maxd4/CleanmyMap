import { act, create } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ActionParticipationReviewItem,
  ActionParticipationSearchItem,
} from "@/lib/actions/participation/group-participation";
import { useJoinFormSectionQueue } from "./rejoindre-un-formulaire-section.controller.queue";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

function reviewItem(id = "request-1"): ActionParticipationReviewItem {
  return {
    id,
    actionId: "action-1",
    userId: "user-1",
    displayName: "Alice Test",
    handle: "alice",
    joinedAt: "2026-10-19T10:00:00.000Z",
    updatedAt: null,
    participationStatus: "pending",
    participationSource: "group_form",
    wasRegisteredBeforeAction: false,
    individualImpact: null,
  };
}

type ProbeProps = {
  queueActionId: string | null;
  reloadAction?: { actionId: string; version: number } | null;
  onActionCountsChanged?: (actionId: string, participantsCount: number | null, pendingRequestsCount: number) => void;
  onNotice?: (message: string) => void;
};

function QueueProbe({
  queueActionId,
  reloadAction = null,
  onActionCountsChanged = vi.fn(),
  onNotice = vi.fn(),
}: ProbeProps) {
  const queue = useJoinFormSectionQueue({
    fr: true,
    queueActionId,
    reloadAction,
    onActionCountsChanged,
    onNotice,
  });

  return (
    <section>
      <output id="state">{JSON.stringify({
        loading: queue.queueLoading,
        error: queue.queueError,
        canReview: queue.queueCanReview,
        requests: queue.queueRequests.map((item) => item.id),
        confirmed: queue.queueConfirmedParticipants.map((item) => item.id),
        search: queue.queueSearchResults,
        searchError: queue.queueSearchError,
        reviewing: queue.reviewingQueueId,
        adding: queue.addingQueueParticipantId,
      })}</output>
      <input
        value={queue.queueSearchQuery}
        onChange={(event) => queue.setQueueSearchQuery(event.target.value)}
      />
      <button
        type="button"
        disabled={queue.reviewingQueueId === "request-1"}
        onClick={() => void queue.reviewQueueRequest("request-1", "accept")}
      >
        accept
      </button>
      <button
        type="button"
        disabled={queue.addingQueueParticipantId === "user-2"}
        onClick={() => void queue.addQueueParticipant("user-2")}
      >
        add
      </button>
    </section>
  );
}

function readState(renderer: ReturnType<typeof create>) {
  return JSON.parse(String(renderer.root.findByType("output").children[0]));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.stubGlobal("window", globalThis);
});

describe("useJoinFormSectionQueue behavior", () => {
  it("loads the queue and never mutates when review permission is absent", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => response({
      status: "ok",
      canReview: false,
      pendingRequests: [reviewItem()],
      confirmedParticipants: [],
    }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<QueueProbe queueActionId="action-1" />); });
    await act(async () => { await Promise.resolve(); });

    expect(readState(renderer)).toMatchObject({ canReview: false, requests: ["request-1"] });
    await act(async () => { renderer.root.findAllByType("button")[0]?.props.onClick(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    renderer.unmount();
  });

  it("reviews a request, reloads the queue and reports updated counts", async () => {
    const countsChanged = vi.fn();
    const notice = vi.fn();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ status: "ok", canReview: true, pendingRequests: [reviewItem()], confirmedParticipants: [] }))
      .mockResolvedValueOnce(response({ status: "ok", participantId: "request-1", participationStatus: "confirmed", participationSource: "group_form", participantsCount: 4 }))
      .mockResolvedValueOnce(response({ status: "ok", canReview: true, pendingRequests: [], confirmedParticipants: [reviewItem("confirmed-1")] }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<QueueProbe queueActionId="action-1" onActionCountsChanged={countsChanged} onNotice={notice} />); });
    await act(async () => { await Promise.resolve(); });

    await act(async () => { renderer.root.findAllByType("button")[0]?.props.onClick(); });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/actions/action-1/group-join");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ participantId: "request-1", decision: "accept" });
    expect(countsChanged).toHaveBeenCalledWith("action-1", 4, 0);
    expect(notice).toHaveBeenCalledWith("Demande acceptée.");
    expect(readState(renderer)).toMatchObject({ requests: [], confirmed: ["confirmed-1"] });
    renderer.unmount();
  });

  it("disables the review control while a request is pending and handles a refusal", async () => {
    let resolvePost!: (value: Response) => void;
    const post = new Promise<Response>((resolve) => { resolvePost = resolve; });
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ status: "ok", canReview: true, pendingRequests: [reviewItem()], confirmedParticipants: [] }))
      .mockReturnValueOnce(post);
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<QueueProbe queueActionId="action-1" />); });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { renderer.root.findAllByType("button")[0]?.props.onClick(); await Promise.resolve(); });

    expect(readState(renderer).reviewing).toBe("request-1");
    expect(renderer.root.findAllByType("button")[0]?.props.disabled).toBe(true);
    resolvePost(response({ error: "refusée" }, 409));
    await act(async () => { await post; await Promise.resolve(); });
    expect(readState(renderer).error).toBe("refusée");
    expect(readState(renderer).reviewing).toBeNull();
    renderer.unmount();
  });

  it("searches and adds a participant only for an authorized reviewer", async () => {
    vi.useFakeTimers();
    const searchItem: ActionParticipationSearchItem = { userId: "user-2", displayName: "Bob Test", handle: "bob" };
    const countsChanged = vi.fn();
    const notice = vi.fn();
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ status: "ok", canReview: true, pendingRequests: [], confirmedParticipants: [] }))
      .mockResolvedValueOnce(response({ status: "ok", items: [searchItem] }))
      .mockResolvedValueOnce(response({ status: "ok", participantId: "participant-2", participantUserId: "user-2", participationStatus: "confirmed", participationSource: "manual_add", participantsCount: 2 }))
      .mockResolvedValueOnce(response({ status: "ok", canReview: true, pendingRequests: [], confirmedParticipants: [reviewItem("participant-2")] }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<QueueProbe queueActionId="action-1" onActionCountsChanged={countsChanged} onNotice={notice} />); });
    await act(async () => { await Promise.resolve(); });
    act(() => { renderer.root.findByType("input").props.onChange({ target: { value: "bob" } }); });
    await act(async () => { vi.advanceTimersByTime(250); await Promise.resolve(); });

    expect(JSON.stringify(readState(renderer).search)).toContain("user-2");
    await act(async () => { renderer.root.findAllByType("button")[1]?.props.onClick(); });
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({ participantUserId: "user-2" });
    expect(countsChanged).toHaveBeenCalledWith("action-1", 2, 0);
    expect(notice).toHaveBeenCalledWith("Le compte a été ajouté à l'action.");
    renderer.unmount();
  });

  it("clears queue state on a network failure and does not fetch after unmount", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<QueueProbe queueActionId="action-1" />); });
    await act(async () => { await Promise.resolve(); });
    expect(readState(renderer)).toMatchObject({ error: "Impossible de charger la file publique.", requests: [], confirmed: [] });
    renderer.unmount();
    act(() => { vi.advanceTimersByTime(500); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
