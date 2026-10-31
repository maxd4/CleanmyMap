import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionRoleAttestationsPanel } from "./action-role-attestations-panel";
import { jsonResponse as response, rendererText as text } from "@/__tests__/support/action-behavior-test-helpers";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis, window: globalThis });

const role = { code: "driver", label: "Conducteur", description: "Transport" };
const participant = { userId: "user-1", displayName: "Bénévole", handle: "benevole", plannedRoles: [{ role_code: "driver", assignment_status: "confirmed" }], attestations: [] };
const state = { canReview: true, roleOptions: [role], participants: [participant], pagination: { hasMore: true, nextOffset: 1 } };

async function settleInitial() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
  await Promise.resolve();
  await Promise.resolve();
}

function buttonByText(renderer: ReactTestRenderer, label: string) {
  return renderer.root.findAllByType("button").find((button) => button.props.children === label);
}

afterEach(() => vi.unstubAllGlobals());

describe("ActionRoleAttestationsPanel behavior", () => {
  it("requires a rejection reason and submits a decision before reloading", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(state))
      .mockResolvedValueOnce(response({ ok: true }))
      .mockResolvedValueOnce(response({ ...state, pagination: { hasMore: false, nextOffset: null } }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionRoleAttestationsPanel actionId="action-1" />); });
    await act(async () => { await settleInitial(); });
    const reject = buttonByText(renderer, "Rejeter");
    expect(reject).toBeDefined();
    await act(async () => { await reject!.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() }); });
    expect(text(renderer)).toContain("Un motif est requis");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const textarea = renderer.root.findByType("textarea");
    await act(async () => { textarea.props.onChange({ target: { value: "Mission non démontrée" } }); });
    await act(async () => { await buttonByText(renderer, "Rejeter")!.props.onClick({ preventDefault: vi.fn(), stopPropagation: vi.fn() }); });
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/action-1/role-attestations", expect.objectContaining({ method: "POST", body: expect.stringContaining("Mission non démontrée") }));
    expect(text(renderer)).toContain("Décision enregistrée");
  });

  it("deduplicates paginated participants and hides review mutations without permission", async () => {
    const first = { ...state, canReview: false, pagination: { hasMore: false, nextOffset: null } };
    const fetchMock = vi.fn().mockResolvedValueOnce(response(first));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    act(() => { renderer = create(<ActionRoleAttestationsPanel actionId="action-2" />); });
    await act(async () => { await settleInitial(); });
    expect(renderer.root.findAllByType("button")).toHaveLength(0);
    expect(text(renderer)).toContain("Participation confirmée");
    expect(fetchMock).toHaveBeenCalledWith("/api/actions/action-2/role-attestations?limit=100&offset=0", { cache: "no-store" });
  });
});
