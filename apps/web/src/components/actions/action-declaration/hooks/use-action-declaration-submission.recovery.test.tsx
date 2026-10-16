import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
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
});
