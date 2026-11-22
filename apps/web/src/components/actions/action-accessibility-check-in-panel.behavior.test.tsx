import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, rendererText } from "@/__tests__/support/action-behavior-test-helpers";
import { ActionAccessibilityCheckInPanel } from "./action-accessibility-check-in-panel";

const mutateMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const useSWRMock = vi.hoisted(() => vi.fn());
vi.mock("swr", () => ({ default: useSWRMock }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("ActionAccessibilityCheckInPanel behavior", () => {
  it("uses a private organizer cache audience and lets an identified participant be reset", async () => {
    useSWRMock.mockReturnValue({ data: { audience: "organizer", requests: [{
      id: "request-1", participantLabel: "Samira", requested_needs: ["rest_breaks"],
      day_tracking_consent: true, arrival_status: "completed", contact_status: null, departure_status: null,
    }] }, error: undefined, isLoading: false, mutate: mutateMock });
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => { renderer = create(<ActionAccessibilityCheckInPanel actionId="action-1" />); });

    expect(useSWRMock.mock.calls[0][0]).toBe("/api/actions/action-1/accessibility-support?audience=organizer");
    expect(rendererText(renderer)).toContain("Samira");
    const arrival = renderer.root.findAllByType("select").find((select) => select.props.value === "completed");
    expect(arrival).toBeDefined();
    expect(arrival?.parent?.props.className).toContain("font-semibold");
    await act(async () => { await arrival?.props.onChange({ target: { value: "" } }); });
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/action-1/accessibility-support", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ requestId: "request-1", field: "arrival_status", status: null }),
    }));
    expect(mutateMock).toHaveBeenCalled();
  });
});
