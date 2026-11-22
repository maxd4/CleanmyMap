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
    const measure = { key: "pause-plan", definitionHash: "a".repeat(64), label: "Modalités de pause prévues" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: "ok", revision: "revision-1", measures: [measure], observations: [] }))
      .mockResolvedValueOnce(jsonResponse({ status: "ok", revision: "revision-2", measures: [measure], observations: [{ ...measure, evidenceKind: "organizer_observation", observedAt: new Date().toISOString().slice(0, 10) }] }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionAccessibilityImplementationPanel actionId="action-1" />); });
    await act(async () => { await settle(); });

    expect(rendererText(renderer)).toContain("DECLARED · annoncé dans la préparation");
    const checkbox = renderer.root.findAllByType("input").find((input) => input.props.type === "checkbox");
    if (!checkbox) throw new Error("attestation checkbox is missing");
    expect(checkbox.props.checked).toBe(false);
    await act(async () => { await checkbox.props.onChange({ target: { checked: true } }); });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/actions/action-1/accessibility-observations", expect.objectContaining({
      method: "PATCH",
      body: expect.stringContaining('"measurementKey":"pause-plan"'),
    }));
    const requestBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(requestBody).toMatchObject({
      expectedRevision: "revision-1",
      measurementKey: "pause-plan",
      definitionHash: "a".repeat(64),
      evidenceKind: "organizer_observation",
    });
    expect(requestBody).toHaveProperty("observedAt");
    expect(requestBody).not.toHaveProperty("preparationData");
    expect(rendererText(renderer)).toContain("OBSERVED · observation organisateur");
    expect(rendererText(renderer)).not.toContain("preuve de présence");
  });

  it("does not silently retry when the server reports a revision conflict", async () => {
    const measure = { key: "pause-plan", definitionHash: "b".repeat(64), label: "Modalités de pause prévues" };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ status: "ok", revision: "revision-1", measures: [measure], observations: [] }))
      .mockResolvedValueOnce(jsonResponse({ error: "revision_conflict" }, 409));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionAccessibilityImplementationPanel actionId="action-1" />); });
    await act(async () => { await settle(); });
    const checkbox = renderer.root.findAllByType("input").find((input) => input.props.type === "checkbox");
    if (!checkbox) throw new Error("attestation checkbox is missing");
    await act(async () => { await checkbox.props.onChange({ target: { checked: true } }); });
    expect(rendererText(renderer)).toContain("L’action ou la mesure a changé. Rechargez les attestations avant de réessayer.");
    expect(rendererText(renderer)).not.toContain("Attestation enregistrée.");
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
