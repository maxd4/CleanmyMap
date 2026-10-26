import { describe, expect, it, vi } from "vitest";
import { ActionMediaError } from "./action-media";
import { actionMediaErrorResponse } from "./action-media-route-error";

vi.mock("@/lib/http/auth-responses", () => ({
  forbiddenJsonResponse: vi.fn(() => new Response("Forbidden", { status: 403 })),
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: vi.fn((_error: unknown, operation: string) => new Response(operation, { status: 500 })),
  validationErrorResponse: vi.fn(() => new Response("Invalid", { status: 400 })),
}));

describe("actionMediaErrorResponse", () => {
  it("keeps forbidden media access fail-closed", async () => {
    const response = actionMediaErrorResponse(new ActionMediaError("denied", "forbidden"), "finalize");

    expect(response.status).toBe(403);
  });

  it("preserves the operation-specific missing-resource contract", async () => {
    const response = actionMediaErrorResponse(new ActionMediaError("missing", "not_found"), "finalize");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Photo introuvable." });
  });

  it("does not expose a success response for an unknown failure", async () => {
    const response = actionMediaErrorResponse(new Error("storage unavailable"), "intent");

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe("action-media-intent");
  });
});
