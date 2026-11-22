import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, rendererText } from "@/__tests__/support/action-behavior-test-helpers";
import { ActionAccessibilityImplementationPanel } from "./action-accessibility-implementation-panel";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
}

afterEach(() => vi.unstubAllGlobals());

describe("ActionAccessibilityImplementationPanel behavior", () => {
  it("keeps a declaration separate until an organizer records dated evidence", async () => {
    const preparationData = { accessibilityPausePlan: "Pause près du banc" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ action: { preparationData } }))
      .mockResolvedValueOnce(jsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionAccessibilityImplementationPanel actionId="action-1" />); });
    await act(async () => { await settle(); });

    expect(rendererText(renderer)).toContain("DECLARED · annoncé dans la préparation");
    const checkbox = renderer.root.findAllByType("input").find((input) => input.props.type === "checkbox");
    if (!checkbox) throw new Error("attestation checkbox is missing");
    expect(checkbox.props.checked).toBe(false);
    await act(async () => { await checkbox.props.onChange({ target: { checked: true } }); });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/actions/action-1", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"evidenceKind":"organizer_observation"'),
    }));
    expect(fetchMock.mock.calls[1][1].body).toContain('"observedAt"');
    expect(rendererText(renderer)).toContain("OBSERVED · observation organisateur");
    expect(rendererText(renderer)).not.toContain("preuve de présence");
  });

  it("does not show private implementation controls when editor data is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ error: "forbidden" }, 403));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionAccessibilityImplementationPanel actionId="action-private" />); });
    await act(async () => { await settle(); });
    expect(renderer.root.findAllByType("input")).toHaveLength(0);
    expect(renderer.root.findByProps({ role: "alert" })).toBeDefined();
  });
});
