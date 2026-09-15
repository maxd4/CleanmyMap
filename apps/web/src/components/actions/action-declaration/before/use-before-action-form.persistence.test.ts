import { describe, expect, it, vi } from "vitest";
import { persistBeforeAction } from "./use-before-action-form";
import type { CreateActionPayload } from "@/lib/actions/types";

const payload = {} as CreateActionPayload;

describe("before-action persistence path", () => {
  it("updates the existing pre-action instead of entering the creation path", async () => {
    const create = vi.fn();
    const update = vi.fn().mockResolvedValue({
      actionId: "action-42",
      actionPhase: "pre_action",
    });

    await expect(
      persistBeforeAction("action-42", payload, { create, update }),
    ).resolves.toEqual({ actionId: "action-42", created: false });

    expect(update).toHaveBeenCalledWith("action-42", payload);
    expect(create).not.toHaveBeenCalled();
  });

  it("keeps the creation path when no action id is present", async () => {
    const create = vi.fn().mockResolvedValue({ id: "action-new" });
    const update = vi.fn();

    await expect(
      persistBeforeAction(null, payload, { create, update }),
    ).resolves.toEqual({ actionId: "action-new", created: true });

    expect(create).toHaveBeenCalledWith(payload);
    expect(update).not.toHaveBeenCalled();
  });
});
