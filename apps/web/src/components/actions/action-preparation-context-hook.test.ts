import { describe, expect, it, vi } from "vitest";
import { act, create } from "react-test-renderer";
import { createElement, useEffect } from "react";

const { fetchActionById } = vi.hoisted(() => ({
  fetchActionById: vi.fn(),
}));

vi.mock("@/lib/actions/http", () => ({ fetchActionById }));
const loadDraftSnapshot = vi.hoisted(() => vi.fn());
const saveDraft = vi.hoisted(() => vi.fn());
const clearDraft = vi.hoisted(() => vi.fn());
vi.mock("./action-declaration/draft-storage", () => ({ loadDraftSnapshot, saveDraft, clearDraft }));
vi.mock("@/lib/route/route-action-handoff", () => ({ peekPlannerActionHandoff: vi.fn(() => null) }));

import { loadPreparationAction, useActionPreparationContext } from "./action-preparation-context-hook";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function ContextHarness({ actionId, onReady }: { actionId: string | null; onReady: (value: ReturnType<typeof useActionPreparationContext>) => void }) {
  const value = useActionPreparationContext({ defaultActorName: "Test", actionId });
  useEffect(() => onReady(value), [onReady, value]);
  return null;
}

function action(id: string, locationLabel: string) {
  return {
    id,
    actionDate: "2026-10-21",
    locationLabel,
    latitude: 48.85,
    longitude: 2.35,
    preparationData: { actionDate: "2026-10-21" },
  };
}

describe("action preparation request sharing", () => {
  it("reuses one logical request when context and form hydrate together", async () => {
    const action = { id: "action-1" };
    fetchActionById.mockResolvedValue(action);

    const [contextAction, formAction] = await Promise.all([
      loadPreparationAction(action.id),
      loadPreparationAction(action.id),
    ]);

    expect(contextAction).toBe(action);
    expect(formAction).toBe(action);
    expect(fetchActionById).toHaveBeenCalledTimes(1);
  });

  it("ignores a late action response and hydrates the current action draft only", async () => {
    let resolveFirst!: (value: ReturnType<typeof action>) => void;
    const first = new Promise<ReturnType<typeof action>>((resolve) => { resolveFirst = resolve; });
    const second = Promise.resolve(action("action-current-b", "Lieu B"));
    fetchActionById.mockReset();
    fetchActionById.mockReturnValueOnce(first).mockReturnValueOnce(second);
    loadDraftSnapshot.mockImplementation((_fallback: unknown, _recordType: unknown, actionId: string | null) => actionId === "action-current-b"
      ? { form: { locationLabel: "Brouillon B", actionDate: "2026-10-22" }, savedAt: "2026-10-21T09:00:00.000Z" }
      : null);
    let latest!: ReturnType<typeof useActionPreparationContext>;
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(createElement(ContextHarness, { actionId: "action-late-a", onReady: (value) => { latest = value; } }));
    });
    await act(async () => { await Promise.resolve(); });
    act(() => {
      renderer.update(createElement(ContextHarness, { actionId: "action-current-b", onReady: (value) => { latest = value; } }));
    });
    resolveFirst(action("action-late-a", "Lieu A"));
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    expect(latest.preparationContextReady).toBe(true);
    expect(latest.preparationContext.actionId).toBe("action-current-b");
    expect(latest.preparationContext.locationLabel).toBe("Brouillon B");
    expect(latest.preparationContext.actionDate).toBe("2026-10-22");
    expect(latest.preparationPersistenceStatus).toBe("draft");
    renderer.unmount();
  });
});
