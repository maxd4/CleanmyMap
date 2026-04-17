import { describe, expect, it } from "vitest";
import { adminErrorResponse } from "./response";

describe("admin response helpers", () => {
  it("returns normalized error payload", async () => {
    const response = adminErrorResponse({
      status: 409,
      code: "confirmation_required",
      message: "Explicit confirmation phrase required",
      hint: "Type the expected confirmation phrase.",
      operationId: "op-123",
    });
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(409);
    expect(body.code).toBe("confirmation_required");
    expect(body.message).toBe("Explicit confirmation phrase required");
    expect(body.hint).toBe("Type the expected confirmation phrase.");
    expect(body.operationId).toBe("op-123");
  });
});
