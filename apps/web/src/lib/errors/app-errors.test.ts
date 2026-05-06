import { describe, expect, it } from "vitest";
import {
  AppError,
  defaultActionsForKind,
  defaultMessageForKind,
  defaultTitleForKind,
  getRecommendedErrorSurface,
  isAppError,
  readAppErrorResponse,
  toAppError,
} from "./app-errors";

describe("app-errors", () => {
  it("maps each error kind to the expected surface", () => {
    expect(getRecommendedErrorSurface("validation")).toBe("inline");
    expect(getRecommendedErrorSurface("network")).toBe("toast");
    expect(getRecommendedErrorSurface("server")).toBe("card");
    expect(getRecommendedErrorSurface("permission")).toBe("card");
  });

  it("returns human defaults for each error kind", () => {
    expect(defaultTitleForKind("permission")).toContain("Accès");
    expect(defaultMessageForKind("network")).toContain("Connexion");
    expect(defaultActionsForKind("validation")[0]?.type).toBe("fix-field");
  });

  it("normalizes unknown errors into AppError", () => {
    const error = toAppError("Impossible de charger", {
      kind: "server",
      message: "Impossible de charger",
    });

    expect(error).toBeInstanceOf(AppError);
    expect(isAppError(error)).toBe(true);
    expect(error.kind).toBe("server");
    expect(error.message).toBe("Impossible de charger");
  });

  it("reads an API error payload and preserves status and kind", async () => {
    const response = new Response(
      JSON.stringify({
        error: "Vous n'avez pas accès à cette page.",
        kind: "permission",
        referenceCode: "FRB-1234",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );

    const error = await readAppErrorResponse(
      response,
      "Message de repli",
      "server",
    );

    expect(error.kind).toBe("permission");
    expect(error.status).toBe(403);
    expect(error.referenceCode).toBe("FRB-1234");
    expect(error.message).toBe("Vous n'avez pas accès à cette page.");
  });
});
