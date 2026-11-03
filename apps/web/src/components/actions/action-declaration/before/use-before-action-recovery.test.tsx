import { useEffect, type Dispatch, type SetStateAction } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FormState } from "../model";
import { useBeforeActionForm } from "./use-before-action-form";
import { buildBeforeActionFallbackForm } from "./before-action-form-conversions";
import { useBeforeActionSubmission } from "./use-before-action-workflow";
import { ACTION_DECLARATION_DRAFT_KEY } from "../draft-storage";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const createActionMock = vi.hoisted(() => vi.fn());
const updateActionMock = vi.hoisted(() => vi.fn());
const fetchActionByIdMock = vi.hoisted(() => vi.fn());
const publishActionMock = vi.hoisted(() => vi.fn());
const trackFunnelMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const loadPreparationActionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/http", () => ({
  createAction: createActionMock,
  updateAction: updateActionMock,
  fetchActionById: fetchActionByIdMock,
  publishAction: publishActionMock,
}));

vi.mock("@/lib/analytics/funnel-client", () => ({
  trackFunnel: trackFunnelMock,
}));
vi.mock("../../action-preparation-context-hook", () => ({
  loadPreparationAction: loadPreparationActionMock,
}));

function installLocalStorage({
  getItem,
}: {
  getItem: (key: string) => string | null;
}) {
  const store = new Map<string, string>();
  const localStorage = {
    getItem,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
  vi.stubGlobal("window", { localStorage, location: { pathname: "/actions/new" } });
  return { store };
}

function buildValidForm(): FormState {
  return {
    ...buildBeforeActionFallbackForm(["Test"], "Test", "action"),
    actionTitle: "Action de reprise",
    actionDate: "2026-10-17",
    associationName: "Action spontanée",
    organizerType: "spontaneous",
    departureLocationLabel: "Parc central",
    locationLabel: "Parc central",
    meetingTime: "09:00",
    departureTime: "09:00",
    eventStartTime: "09:00",
    eventEndTime: "10:00",
    durationMinutes: "60",
    volunteersCount: "1",
  };
}

function HookHarness({
  onReady,
  initialActionId,
}: {
  onReady: (value: ReturnType<typeof useBeforeActionForm>) => void;
  initialActionId?: string | null;
}) {
  const value = useBeforeActionForm({
    actorNameOptions: ["Test"],
    defaultActorName: "Test",
    isAuthenticated: true,
    userMetadata: { userId: "user-1" },
    initialActionId,
    onPassToComplete: vi.fn(),
  });
  useEffect(() => onReady(value), [onReady, value]);
  return null;
}

function mountForm(onReady: (value: ReturnType<typeof useBeforeActionForm>) => void) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<HookHarness onReady={onReady} />);
  });
  return renderer;
}

describe("before-action draft recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchActionByIdMock.mockResolvedValue({ id: "action-existing", publishedAt: null });
    createActionMock.mockResolvedValue({ id: "action-created" });
    updateActionMock.mockResolvedValue({ actionId: "action-existing", actionPhase: "pre_action" });
    loadPreparationActionMock.mockResolvedValue({
      id: "action-resumed",
      actionPhase: "pre_action",
      status: "approved",
      actorName: "Test",
      associationName: "Association locale",
      organizerType: "association",
      organizerAccounts: [],
      participantAccounts: [],
      groupJoinEnabled: false,
      accessMode: "public",
      actionDate: "2999-10-20",
      locationLabel: "Parc central",
      departureLocationLabel: "Parc central",
      arrivalLocationLabel: null,
      latitude: 48.85,
      longitude: 2.35,
      eventStartTime: "09:00",
      eventEndTime: "10:00",
      durationMinutes: 60,
      preparationData: { actionTitle: "Action reprise", volunteersExpected: 4 },
      manualInvitationStatuses: [],
      publishedAt: "2999-10-01T10:00:00.000Z",
    });
  });

  it("blocks a new POST while the local draft read is failing", async () => {
    installLocalStorage({ getItem: () => { throw new Error("storage unavailable"); } });
    let latest!: ReturnType<typeof useBeforeActionForm>;
    mountForm((value) => { latest = value; });

    await act(async () => {
      await latest.handleSubmit();
    });

    expect(createActionMock).not.toHaveBeenCalled();
    expect(updateActionMock).not.toHaveBeenCalled();
    expect(latest.persistenceStatus).toBe("read-error");
    expect(latest.errorMessage).toContain("lecture du brouillon");
  });

  it("retries the read, restores the creation key and keeps a newer local edit", async () => {
    let readAvailable = false;
    const { store } = installLocalStorage({
      getItem: (key) => {
        if (!readAvailable) throw new Error("storage unavailable");
        return store.get(key) ?? null;
      },
    });
    const draft = {
      ...buildValidForm(),
      actionTitle: "Titre du brouillon",
      organizerAccounts: "user-primary, user-helper",
      creationRequestId: "action-create-recovered-42",
    };
    store.set(ACTION_DECLARATION_DRAFT_KEY, JSON.stringify(draft));

    let latest!: ReturnType<typeof useBeforeActionForm>;
    const renderer = mountForm((value) => { latest = value; });

    await act(async () => {
      latest.updateField("actionTitle", "Saisie plus récente");
    });
    readAvailable = true;

    await act(async () => {
      latest.retryDraftPersistence();
    });

    expect(latest.persistenceStatus).toBe("local");
    expect(latest.form.actionTitle).toBe("Saisie plus récente");
    expect(latest.form.departureLocationLabel).toBe("Parc central");
    expect(latest.form.organizerAccounts).toBe("user-primary, user-helper");

    renderer.unmount();

    let remounted!: ReturnType<typeof useBeforeActionForm>;
    mountForm((value) => { remounted = value; });
    expect(remounted.form.actionTitle).toBe("Saisie plus récente");
    expect(remounted.form.organizerAccounts).toBe("user-primary, user-helper");

    await act(async () => {
      await remounted.handleSubmit();
    });

    expect(createActionMock).toHaveBeenCalledWith(expect.anything(), {
      idempotencyKey: "action-create-recovered-42",
    });
    expect(store.has(ACTION_DECLARATION_DRAFT_KEY)).toBe(false);
  });

  it("allows an existing action to update when its local draft read fails", async () => {
    let submissionState: "idle" | "pending" | "success" | "error" = "idle";
    let errorMessage: string | null = null;
    const form = buildValidForm();
    const setSubmissionState = (next: typeof submissionState | ((value: typeof submissionState) => typeof submissionState)) => {
      submissionState = typeof next === "function" ? next(submissionState) : next;
    };
    const setErrorMessage: Dispatch<SetStateAction<string | null>> = (next) => {
      errorMessage = typeof next === "function" ? next(errorMessage) : next;
    };
    const handler = useBeforeActionSubmission;

    function SubmissionHarness() {
      const submit = handler({
        form,
        submissionState,
        actionId: "action-existing",
        creationRequestId: "unused",
        userMetadata: { userId: "user-1" },
        isAuthenticated: true,
        persistenceStatus: "read-error",
        setSubmissionState,
        setPersistenceStatus: vi.fn(),
        setErrorMessage,
        setValidationIssues: vi.fn(),
        setValidationIssueFields: vi.fn(),
        setCreatedId: vi.fn(),
        setPublishedAction: vi.fn(),
        setPublishedAt: vi.fn(),
      });
      useEffect(() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ submit().catch(() => undefined); }, [submit]);
      return null;
    }

    act(() => { create(<SubmissionHarness />); });
    await act(async () => { await Promise.resolve(); });

    expect(updateActionMock).toHaveBeenCalledWith("action-existing", expect.anything());
    expect(createActionMock).not.toHaveBeenCalled();
    expect(submissionState).toBe("success");
    expect(errorMessage).toBeNull();
  });

  it("hydrates an approved remote pre-action and preserves its canonical account state", async () => {
    installLocalStorage({ getItem: () => null });
    let resumed!: ReturnType<typeof useBeforeActionForm>;
    const renderer = mountForm((value) => { resumed = value; });
    await act(async () => {
      renderer.update(<HookHarness onReady={(value) => { resumed = value; }} initialActionId="action-resumed" />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(loadPreparationActionMock).toHaveBeenCalledWith("action-resumed");
    expect(resumed.createdId).toBe("action-resumed");
    expect(resumed.form.actionTitle).toBe("Action reprise");
    expect(resumed.form.volunteersCount).toBe("4");
    expect(resumed.submissionState).toBe("idle");
    expect(resumed.persistenceStatus).toBe("account");
    expect(resumed.isHydratingAction).toBe(false);
    renderer.unmount();
  });

  it.each([
    "rejected",
    "cancelled",
  ] as const)("hydrates the %s terminal state without reopening the editor", async (status) => {
    installLocalStorage({ getItem: () => null });
    loadPreparationActionMock.mockResolvedValueOnce({
      id: `action-${status}`,
      actionPhase: "pre_action",
      status,
      preparationData: {},
      manualInvitationStatuses: [],
    });
    let latest!: ReturnType<typeof useBeforeActionForm>;
    const renderer = mountForm((value) => { latest = value; });
    await act(async () => {
      renderer.update(<HookHarness onReady={(value) => { latest = value; }} initialActionId={`action-${status}`} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.terminalActionStatus).toBe(status);
    expect(latest.submissionState).toBe("success");
    expect(latest.createdId).toBe(`action-${status}`);
    expect(latest.errorMessage).toBeNull();
    expect(latest.isHydratingAction).toBe(false);
    renderer.unmount();
  });

  it("turns a resume fetch failure into an observable retryable error state", async () => {
    installLocalStorage({ getItem: () => null });
    loadPreparationActionMock.mockRejectedValueOnce(new Error("resume unavailable"));
    let latest!: ReturnType<typeof useBeforeActionForm>;
    const renderer = mountForm((value) => { latest = value; });
    await act(async () => {
      renderer.update(<HookHarness onReady={(value) => { latest = value; }} initialActionId="action-failed" />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.errorMessage).toBe("resume unavailable");
    expect(latest.submissionState).toBe("error");
    expect(latest.persistenceStatus).toBe("error");
    expect(latest.isHydratingAction).toBe(false);
    renderer.unmount();
  });
});
