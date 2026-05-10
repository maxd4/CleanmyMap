import { describe, expect, it } from "vitest";
import {
  AppError,
  buildSupportHref,
  buildSupportIssuePrefill,
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
    expect(defaultActionsForKind("server")[1]?.href).toContain("/sections/feedback");
  });

  it("builds a support prefill from runtime error context", () => {
    const prefill = buildSupportIssuePrefill({
      message: "Le module a planté",
      code: "TypeError",
      referenceCode: "digest-123",
      pagePath: "/sections/feedback",
      timestamp: "2026-05-10T10:00:00.000Z",
      userId: "user_123",
      sessionId: "sess_456",
      source: "runtime_error_page",
    });

    expect(prefill.subject).toContain("/sections/feedback");
    expect(prefill.context).toContain("Message: Le module a planté");
    expect(prefill.context).toContain("Code: TypeError");
    expect(prefill.context).toContain("Identifiant utilisateur: user_123");
    expect(prefill.steps).toContain("Reproduire");
    expect(prefill.expected).toContain("fonctionner normalement");
  });

  it("builds an internal support href instead of mailto", () => {
    const href = buildSupportHref({
      message: "Erreur de rendu",
      pagePath: "/reports",
    });

    expect(href).toContain("/sections/feedback");
    expect(href).toContain("subject=");
    expect(href).toContain("context=");
    expect(href).toContain("#bug");
    expect(href).not.toContain("mailto:");
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
