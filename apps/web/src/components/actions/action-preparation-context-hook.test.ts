import { describe, expect, it, vi } from "vitest";

const { fetchActionById } = vi.hoisted(() => ({
  fetchActionById: vi.fn(),
}));

vi.mock("@/lib/actions/http", () => ({ fetchActionById }));

import { loadPreparationAction } from "./action-preparation-context-hook";

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
});
