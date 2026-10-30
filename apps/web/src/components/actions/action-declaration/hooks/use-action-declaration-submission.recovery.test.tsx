import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import { buildCreateActionPayload } from "../payload";
import { useActionDeclarationSubmission } from "./use-action-declaration-submission";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const createActionMock = vi.hoisted(() => vi.fn());
const updateActionMock = vi.hoisted(() => vi.fn());
const fetchActionByIdMock = vi.hoisted(() => vi.fn());
const trackFunnelMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/actions/http", () => ({
  createAction: createActionMock,
  updateAction: updateActionMock,
  fetchActionById: fetchActionByIdMock,
}));

vi.mock("@/lib/analytics/funnel-client", () => ({
  trackFunnel: trackFunnelMock,
}));

describe("action declaration draft recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not create an action after a local draft read failure", async () => {
    let submit!: () => Promise<void>;
    let latest!: ReturnType<typeof useActionDeclarationSubmission>;
    function Harness() {
      const value = useActionDeclarationSubmission({
        form: createInitialFormState("Test"),
        declarationMode: "complete",
        isAuthenticated: true,
        draftStorageReadError: true,
        initialActionId: null,
        loadedActionPhase: null,
        manualDrawingEnabled: true,
        manualDrawing: null,
        manualDrawingSource: null,
        drawingIsValid: false,
        effectiveRoutePreviewDrawing: null,
        routePreviewSource: null,
        hasValidDrawing: false,
        hasServerRouteInput: false,
        isCleanPlaceMode: false,
        payload: {} as never,
        photoAssets: [],
        visionEstimate: null,
        userMetadata: { userId: "user-1" },
        clearDraft: vi.fn(),
        creationRequestId: "action-create-new",
        setLoadedActionPhase: vi.fn(),
        setHasAttemptedSubmit: vi.fn(),
        photoPreparationPending: false,
      });
      latest = value;
      submit = value.handleConfirmSubmit;
      return null;
    }

    act(() => { create(<Harness />); });
    await act(async () => {
      await submit();
      await Promise.resolve();
    });

    expect(createActionMock).not.toHaveBeenCalled();
    expect(latest.submissionState).toBe("error");
    expect(latest.errorMessage).toContain("lecture du brouillon");
  });

  it("does not submit a partially prepared photo state", async () => {
    let submit!: () => Promise<void>;
    let latest!: ReturnType<typeof useActionDeclarationSubmission>;
    function Harness() {
      const value = useActionDeclarationSubmission({
        form: createInitialFormState("Test"),
        declarationMode: "complete",
        isAuthenticated: true,
        draftStorageReadError: false,
        initialActionId: null,
        loadedActionPhase: null,
        manualDrawingEnabled: true,
        manualDrawing: null,
        manualDrawingSource: null,
        drawingIsValid: false,
        effectiveRoutePreviewDrawing: null,
        routePreviewSource: null,
        hasValidDrawing: false,
        hasServerRouteInput: false,
        isCleanPlaceMode: false,
        payload: {} as never,
        photoAssets: [],
        photoPreparationPending: true,
        visionEstimate: null,
        userMetadata: { userId: "user-1" },
        clearDraft: vi.fn(),
        creationRequestId: "action-create-pending-photo",
        setLoadedActionPhase: vi.fn(),
        setHasAttemptedSubmit: vi.fn(),
      });
      latest = value;
      submit = value.handleConfirmSubmit;
      return null;
    }

    act(() => { create(<Harness />); });
    await act(async () => { await submit(); });

    expect(createActionMock).not.toHaveBeenCalled();
    expect(latest.submissionState).toBe("error");
    expect(latest.errorMessage).toContain("préparation des photos");
  });

  it("keeps authentication as an access restriction instead of a field error", async () => {
    let latest!: ReturnType<typeof useActionDeclarationSubmission>;
    function Harness() {
      latest = useActionDeclarationSubmission({
        form: createInitialFormState("Test"),
        declarationMode: "complete",
        isAuthenticated: false,
        draftStorageReadError: false,
        initialActionId: null,
        loadedActionPhase: null,
        manualDrawingEnabled: true,
        manualDrawing: null,
        manualDrawingSource: null,
        drawingIsValid: false,
        effectiveRoutePreviewDrawing: null,
        routePreviewSource: null,
        hasValidDrawing: false,
        hasServerRouteInput: false,
        isCleanPlaceMode: false,
        payload: {} as never,
        photoAssets: [],
        photoPreparationPending: false,
        visionEstimate: null,
        userMetadata: { userId: "user-1" },
        clearDraft: vi.fn(),
        creationRequestId: "action-create-unauthenticated",
        setLoadedActionPhase: vi.fn(),
        setHasAttemptedSubmit: vi.fn(),
      });
      return null;
    }

    act(() => { create(<Harness />); });
    await act(async () => { await latest.handleConfirmSubmit(); });

    expect(createActionMock).not.toHaveBeenCalled();
    expect(latest.validationIssues).toEqual([]);
    expect(latest.errorMessage).toContain("Connectez-vous");
  });

  it("aggregates local issues before confirmation instead of opening it", () => {
    let latest!: ReturnType<typeof useActionDeclarationSubmission>;
    function Harness() {
      latest = useActionDeclarationSubmission({
        form: createInitialFormState("Test"),
        declarationMode: "complete",
        isAuthenticated: true,
        draftStorageReadError: false,
        initialActionId: null,
        loadedActionPhase: null,
        manualDrawingEnabled: true,
        manualDrawing: null,
        manualDrawingSource: null,
        drawingIsValid: false,
        effectiveRoutePreviewDrawing: null,
        routePreviewSource: null,
        hasValidDrawing: false,
        hasServerRouteInput: false,
        isCleanPlaceMode: false,
        payload: {
          recordType: "action",
          submissionMode: "complete",
          wasteKg: null,
          cigaretteButts: null,
          volunteersCount: 0,
          volunteerParticipation: null,
        } as never,
        photoAssets: [],
        photoPreparationPending: false,
        visionEstimate: null,
        userMetadata: { userId: "user-1" },
        clearDraft: vi.fn(),
        creationRequestId: "action-create-invalid",
        setLoadedActionPhase: vi.fn(),
        setHasAttemptedSubmit: vi.fn(),
      });
      return null;
    }

    act(() => { create(<Harness />); });
    let accepted = true;
    act(() => { accepted = latest.validateBeforeConfirmation(); });

    expect(accepted).toBe(false);
    expect(latest.showConfirmation).toBe(false);
    expect(latest.validationIssues.map((issue) => issue.field)).toEqual(expect.arrayContaining([
      "organizerType",
      "actionDate",
      "volunteersCount",
      "wasteKg",
      "manualDrawing",
    ]));
  });

  it("submits only once on a double confirmation and remains retryable after a server error", async () => {
    const form = createInitialFormState("Test");
    form.organizerType = "spontaneous";
    form.organizerAccounts = "user-1";
    form.associationName = "Action spontanée";
    form.actionDate = "2026-10-01";
    form.locationLabel = "Quai de test";
    form.departureLocationLabel = "Quai de test";
    form.volunteersCount = "1";
    form.childrenCount = "0";
    form.retiredCount = "0";
    form.wasteKg = "1";
    form.durationMinutes = "60";
    const payload = buildCreateActionPayload({
      form,
      declarationMode: "complete",
      effectiveManualDrawingEnabled: false,
      drawingIsValid: false,
      manualDrawing: null,
      isEntrepriseMode: false,
      linkedEventId: undefined,
    });
    createActionMock
      .mockRejectedValueOnce(new Error("Serveur indisponible"))
      .mockResolvedValue({ id: "action-1" });
    fetchActionByIdMock.mockResolvedValue(null);

    let latest!: ReturnType<typeof useActionDeclarationSubmission>;
    function Harness() {
      latest = useActionDeclarationSubmission({
        form,
        declarationMode: "complete",
        isAuthenticated: true,
        draftStorageReadError: false,
        initialActionId: null,
        loadedActionPhase: null,
        manualDrawingEnabled: false,
        manualDrawing: null,
        manualDrawingSource: null,
        drawingIsValid: false,
        effectiveRoutePreviewDrawing: null,
        routePreviewSource: null,
        hasValidDrawing: true,
        hasServerRouteInput: false,
        isCleanPlaceMode: false,
        payload,
        photoAssets: [],
        photoPreparationPending: false,
        visionEstimate: null,
        userMetadata: { userId: "user-1" },
        clearDraft: vi.fn(),
        creationRequestId: "action-create-retry",
        setLoadedActionPhase: vi.fn(),
        setHasAttemptedSubmit: vi.fn(),
      });
      return null;
    }

    act(() => { create(<Harness />); });
    await act(async () => {
      await Promise.all([latest.handleConfirmSubmit(), latest.handleConfirmSubmit()]);
    });
    expect(createActionMock).toHaveBeenCalledTimes(1);
    expect(latest.submissionState).toBe("error");
    expect(latest.errorMessage).toBe("Serveur indisponible");

    await act(async () => { await latest.handleConfirmSubmit(); });
    expect(createActionMock).toHaveBeenCalledTimes(2);
    expect(latest.submissionState).toBe("success");
  });
});
