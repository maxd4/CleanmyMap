import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/observability/sentry", () => ({ isSentryEnabled: () => false }));

import { handleApiError } from "./api-errors";
import { ActionSupabaseError } from "@/lib/actions/query";

describe("handleApiError with validated Supabase errors", () => {
  it("keeps provider details out of the HTTP response", async () => {
    const response = handleApiError(
      new ActionSupabaseError("private provider detail", {
        code: "P0001",
        details: "internal SQL detail",
        hint: "internal SQL hint",
      }),
      "test/actions",
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Une erreur est survenue de notre côté. Réessayez dans quelques instants.");
    expect(JSON.stringify(body)).not.toContain("private provider detail");
    expect(JSON.stringify(body)).not.toContain("internal SQL detail");
    expect(JSON.stringify(body)).not.toContain("internal SQL hint");
  });

  it("logs code and message for plain Supabase-shaped error objects without leaking them to HTTP clients", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = handleApiError(
        { code: "42703", message: "internal column mismatch" },
        "spogomi.event.create",
      );
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(JSON.stringify(body)).not.toContain("42703");
      expect(JSON.stringify(body)).not.toContain("internal column mismatch");
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("spogomi.event.create"),
        expect.objectContaining({ code: "42703", message: "internal column mismatch", category: "server" }),
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("maps PostgreSQL serialization_failure (SQLSTATE 40001) to HTTP 409 conflict without leaking SQL details", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const response = handleApiError(
        { code: "40001", message: "SPOGOMI event changed since the route preview" },
        "spogomi.route.manual",
      );
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body.error).toBe("La donnée a changé entre-temps. Rafraîchissez la page puis réessayez.");
      expect(JSON.stringify(body)).not.toContain("40001");
      expect(JSON.stringify(body)).not.toContain("SPOGOMI event changed");
    } finally {
      spy.mockRestore();
    }
  });
});
